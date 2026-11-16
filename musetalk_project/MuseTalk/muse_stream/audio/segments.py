"""Segment queue, registration and interrupt lifecycle."""

from __future__ import annotations

import math
import queue as std_queue
import time
from pathlib import Path
from typing import Any

import numpy as np

from ..domain import LiveSegment
from ..log import log
from ..state import AppState
from .analysis import (
    analyze_audio_file,
    analyze_audio_samples,
    build_speech_mask,
    pause_near_boundary,
)
from .io import convert_audio, trim_audio


class SegmentManager:
    """Owns segment ordering and the complete-file registration path."""

    def __init__(self, state: AppState) -> None:
        self.state = state

    def enqueue(self, segment: LiveSegment) -> None:
        if segment.priority == 0:
            self.state.pipeline.answer_queue.put(segment)
        elif segment.priority == 1:
            self.state.pipeline.resume_queue.put(segment)
        else:
            self.state.pipeline.normal_queue.put(segment)

    def queued_count(self) -> int:
        pipeline = self.state.pipeline
        return (
            pipeline.answer_queue.qsize()
            + pipeline.resume_queue.qsize()
            + pipeline.normal_queue.qsize()
        )

    def discard_canceled_queued_segments(self) -> int:
        """Remove canceled old-response segments from pending queues."""
        pipeline = self.state.pipeline
        with pipeline.lock:
            canceled = set(pipeline.canceled_ids)
        removed = 0
        for pending_queue in (
            pipeline.resume_queue,
            pipeline.normal_queue,
        ):
            kept: list[LiveSegment] = []
            while True:
                try:
                    segment = pending_queue.get_nowait()
                except std_queue.Empty:
                    break
                if segment.id in canceled:
                    removed += 1
                else:
                    kept.append(segment)
            for segment in kept:
                pending_queue.put(segment)
        if removed:
            log(f"discarded {removed} canceled queued segments")
        return removed

    def flush_all(self, reason: str = "") -> int:
        """Cancel every queued and generating segment without any resume.

        Used when the upstream dialogue model barges in: the avatar returns to
        idle right after the viewer's playhead and old answers never replay.
        """
        state = self.state
        pipeline = state.pipeline
        with pipeline.lock:
            pipeline.canceled_ids.update(pipeline.segments.keys())
            # A viewer-side interrupt in progress must not restore anything.
            state.interrupt.active = False
            state.interrupt.source = None
            state.interrupt.source_frame = 0
            state.interrupt.resume_segments.clear()
            state.interrupt.deadline = 0.0
            pipeline.cancel_segment_id = None
            flush_frame = max(-1, pipeline.ack_frame)
            state.interrupt.reset_frame = flush_frame + 1
            pipeline.flush_frame = flush_frame
            pipeline.flush_seq += 1
        removed = 0
        for pending_queue in (
            pipeline.answer_queue,
            pipeline.resume_queue,
            pipeline.normal_queue,
        ):
            while True:
                try:
                    pending_queue.get_nowait()
                except std_queue.Empty:
                    break
                removed += 1
        log(
            f"flush ({reason or 'upstream'}): dropped {removed} queued "
            f"segments, playback resets after frame {flush_frame}"
        )
        return removed

    def next_segment(self, timeout: float = 0.02) -> LiveSegment | None:
        pipeline = self.state.pipeline
        try:
            return pipeline.answer_queue.get_nowait()
        except std_queue.Empty:
            pass

        if self.state.interrupt.active:
            time.sleep(timeout)
            return None

        try:
            return pipeline.resume_queue.get_nowait()
        except std_queue.Empty:
            pass

        try:
            return pipeline.normal_queue.get(timeout=timeout)
        except std_queue.Empty:
            return None

    def register_file(self, source_path: Path) -> bool:
        state = self.state
        args = state.args
        assert args is not None and state.ingest.output_audio_dir is not None

        with state.pipeline.lock:
            segment_id = state.pipeline.next_id
            state.pipeline.next_id += 1
        wav_path = state.ingest.output_audio_dir / f"{segment_id:06d}.wav"
        if not convert_audio(source_path, wav_path):
            return False

        segment = self._register_wav(
            source_path=source_path,
            wav_path=wav_path,
            is_final=True,
        )
        return segment is not None

    def register_samples(
        self,
        samples: np.ndarray,
        sample_rate: int,
        source_name: str,
        core_start_sample: int = 0,
        core_sample_count: int | None = None,
        core_start_frame: int = 0,
        core_frames: int | None = None,
        extra_frames: int = 0,
        pause_extra_frames: int = 0,
        response_id: str | None = None,
        response_start_sample: int = 0,
    ) -> LiveSegment | None:
        state = self.state
        assert state.ingest.output_audio_dir is not None
        if sample_rate != 16000:
            log(f"cannot register streamed audio at {sample_rate} Hz")
            return None
        samples = np.asarray(samples, dtype=np.float32)
        if samples.size == 0:
            return None
        core_start_sample = max(
            0,
            min(int(core_start_sample), samples.size - 1),
        )
        if core_sample_count is None:
            core_sample_count = samples.size - core_start_sample
        core_sample_count = max(
            1,
            min(int(core_sample_count), samples.size - core_start_sample),
        )
        with state.pipeline.lock:
            segment_id = state.pipeline.next_id
            state.pipeline.next_id += 1
        wav_path = state.ingest.output_audio_dir / f"{segment_id:06d}.wav"
        playback_wav_path = wav_path
        try:
            import soundfile as sf

            sf.write(
                str(wav_path),
                samples,
                sample_rate,
                subtype="PCM_16",
            )
            if (
                core_start_sample > 0
                or core_sample_count < samples.size
            ):
                playback_wav_path = (
                    state.ingest.output_audio_dir
                    / f"{segment_id:06d}_play.wav"
                )
                sf.write(
                    str(playback_wav_path),
                    samples[
                        core_start_sample :
                        core_start_sample + core_sample_count
                    ],
                    sample_rate,
                    subtype="PCM_16",
                )
        except Exception as exc:
            log(f"cannot write streamed audio {wav_path}: {exc}")
            return None
        return self._register_wav(
            source_path=Path(source_name),
            wav_path=wav_path,
            samples=samples,
            sample_rate=sample_rate,
            core_start_frame=core_start_frame,
            core_frames=core_frames,
            core_sample_count=core_sample_count,
            playback_wav_path=playback_wav_path,
            extra_frames=extra_frames,
            pause_extra_frames=pause_extra_frames,
            response_id=response_id,
            response_start_sample=response_start_sample,
        )

    def _register_wav(
        self,
        source_path: Path,
        wav_path: Path,
        samples: np.ndarray | None = None,
        sample_rate: int | None = None,
        core_start_frame: int = 0,
        core_frames: int | None = None,
        core_sample_count: int | None = None,
        playback_wav_path: Path | None = None,
        extra_frames: int = 0,
        pause_extra_frames: int = 0,
        is_final: bool = False,
        response_id: str | None = None,
        response_start_sample: int = 0,
    ) -> LiveSegment | None:
        state = self.state
        args = state.args
        assert args is not None and state.ingest.output_audio_dir is not None
        segment_id = int(wav_path.stem.removeprefix("resume_"))
        try:
            if samples is None or sample_rate is None:
                (
                    duration,
                    total_frames,
                    sample_count,
                    sample_rate,
                    speech_mask,
                ) = analyze_audio_file(
                    wav_path,
                    state.model.fps,
                    args.silence_threshold_dbfs,
                    args.silence_merge_gap_frames,
                    args.enable_vad,
                )
            else:
                (
                    duration,
                    total_frames,
                    sample_count,
                    sample_rate,
                    speech_mask,
                ) = analyze_audio_samples(
                    samples,
                    sample_rate,
                    state.model.fps,
                    args.silence_threshold_dbfs,
                    args.silence_merge_gap_frames,
                    args.enable_vad,
                )
        except Exception as exc:
            log(f"cannot read converted audio {wav_path}: {exc}")
            return None
        analysis_frames = int(total_frames)
        analysis_sample_count = int(sample_count)
        frame_offset = max(
            0,
            min(int(core_start_frame), max(0, analysis_frames - 1)),
        )
        if core_frames is None:
            total_frames = max(1, analysis_frames - frame_offset)
        else:
            total_frames = max(
                1,
                min(int(core_frames), analysis_frames - frame_offset),
            )
        available_extra = max(
            0,
            analysis_frames - frame_offset - total_frames,
        )
        requested_extra = min(
            max(0, int(extra_frames)),
            available_extra,
        )
        pause_extra = min(
            max(0, int(pause_extra_frames)),
            available_extra,
        )
        pause_boundary = False
        if (
            samples is not None
            and sample_rate is not None
            and pause_extra > 0
        ):
            energy_mask = build_speech_mask(
                samples,
                sample_rate,
                state.model.fps,
                args.silence_threshold_dbfs,
            )
            boundary_idx = frame_offset + total_frames
            pause_boundary = pause_near_boundary(
                energy_mask,
                boundary_idx,
                int(
                    getattr(
                        args,
                        "stream_pause_boundary_frames",
                        0,
                    )
                ),
            )
            if pause_boundary and pause_extra > requested_extra:
                requested_extra = pause_extra
        speech_mask = np.asarray(speech_mask, dtype=bool)
        mask_frames = total_frames + requested_extra
        mask = speech_mask[
            frame_offset : frame_offset + mask_frames
        ]
        if mask.size < mask_frames:
            mask = np.pad(
                mask,
                (0, mask_frames - mask.size),
                constant_values=False,
            )
        speech_mask = mask
        if core_sample_count is None:
            duration = (
                analysis_sample_count / float(sample_rate)
                if sample_rate
                else duration
            )
            sample_count = analysis_sample_count
        else:
            sample_count = max(
                1,
                min(int(core_sample_count), analysis_sample_count),
            )
            duration = sample_count / float(sample_rate)
        speech_frames = int(speech_mask[:total_frames].sum())
        now = time.monotonic()
        interrupt_active = state.interrupt.active
        priority = 0 if interrupt_active else 2
        with state.pipeline.lock:
            global_start = state.pipeline.global_frames
            state.pipeline.global_frames += total_frames

        segment = LiveSegment(
            id=segment_id,
            source_path=source_path,
            wav_path=wav_path,
            duration=duration,
            total_frames=total_frames,
            global_start_frame=global_start,
            sample_count=sample_count,
            sample_rate=sample_rate,
            speech_mask=speech_mask,
            speech_frames=speech_frames,
            priority=priority,
            created_at=now,
            analysis_frames=analysis_frames,
            frame_offset=frame_offset,
            analysis_sample_count=analysis_sample_count,
            playback_wav_path=playback_wav_path or wav_path,
            extra_frames=requested_extra,
            pause_boundary=pause_boundary,
            is_final=is_final,
            response_id=response_id,
            response_start_sample=response_start_sample,
        )
        with state.pipeline.lock:
            state.pipeline.segments[segment_id] = segment
            if interrupt_active:
                state.interrupt.active = False
                state.interrupt.source = None
                state.interrupt.source_frame = 0
                state.interrupt.resume_segments.clear()
                state.interrupt.deadline = 0.0
                state.pipeline.cancel_segment_id = None
        if interrupt_active:
            self.discard_canceled_queued_segments()
        self.enqueue(segment)
        state.ingest.last_audio_seen = now
        state.viewer.last_ack_time = max(state.viewer.last_ack_time, now)
        log(
            f"new audio segment {segment_id}: {source_path.name} "
            f"duration={duration:.3f}s frames={total_frames} "
            f"analysis_frames={analysis_frames} "
            f"frame_offset={frame_offset} "
            f"extra_frames={requested_extra} "
            f"pause_boundary={pause_boundary} "
            f"samples={sample_count} speech={speech_frames} "
            f"silent={total_frames - speech_frames} "
            f"priority={'interrupt' if priority == 0 else 'normal'}"
        )
        if interrupt_active:
            log("new audio received during interrupt; resume cancelled")
        return segment


class InterruptManager:
    """Coordinates interrupt cancellation and resume segment creation."""

    def __init__(self, state: AppState) -> None:
        self.state = state
        self.segments = SegmentManager(state)

    def begin(self, segment_id: int, global_frame: int) -> dict[str, Any] | None:
        state = self.state
        args = state.args
        assert args is not None
        source = state.pipeline.segments.get(segment_id)
        if source is None:
            return None

        now = time.monotonic()
        with state.pipeline.lock:
            if state.interrupt.active:
                return {"ok": False, "message": "已有打断正在进行"}
            frame = max(
                0,
                min(
                    global_frame - source.global_start_frame,
                    source.total_frames - 1,
                ),
            )
            state.interrupt.active = True
            state.interrupt.source = source
            state.interrupt.source_frame = frame
            state.interrupt.reset_frame = global_frame + 1
            state.interrupt.deadline = now + args.interrupt_wait_seconds
            state.interrupt.interrupt_count += 1
            state.pipeline.cancel_segment_id = source.id
            state.viewer.last_ack_time = now

            cutoff = source.global_start_frame
            state.pipeline.canceled_ids.add(source.id)
            future_segments = [
                segment
                for segment in state.pipeline.segments.values()
                if (
                    segment.id != source.id
                    and segment.created_at <= now
                    and segment.global_start_frame > cutoff
                )
            ]
            future_segments.sort(
                key=lambda item: (
                    item.global_start_frame,
                    item.created_at,
                    item.id,
                )
            )
            state.interrupt.resume_segments = future_segments
            for segment in future_segments:
                state.pipeline.canceled_ids.add(segment.id)

        log(
            f"interrupt: segment={source.id} frame={frame} "
            f"wait={args.interrupt_wait_seconds:.0f}s "
            f"mode={args.interrupt_resume_mode} "
            f"queued_restore={len(future_segments)}"
        )
        return {
            "ok": True,
            "segment_id": source.id,
            "frame": global_frame,
            "local_frame": frame,
            "wait_seconds": args.interrupt_wait_seconds,
            "mode": args.interrupt_resume_mode,
        }

    def create_resume_segment(
        self,
        source: LiveSegment,
        frame: int,
    ) -> LiveSegment | None:
        state = self.state
        args = state.args
        assert args is not None and state.ingest.output_audio_dir is not None

        frame = max(0, min(frame, source.total_frames - 1))
        mode = args.interrupt_resume_mode
        with state.pipeline.lock:
            segment_id = state.pipeline.next_id
            state.pipeline.next_id += 1

        if mode == "continue":
            offset = frame / float(state.model.fps)
            remaining = source.duration - offset
            if remaining < 0.08:
                log(
                    f"interrupt resume skipped: only {remaining:.3f}s remained "
                    f"of segment {source.id}"
                )
                return None
            wav_path = (
                state.ingest.output_audio_dir / f"resume_{segment_id:06d}.wav"
            )
            trim_source = source.playback_wav_path or source.wav_path
            if trim_audio(trim_source, wav_path, offset, remaining):
                try:
                    (
                        duration,
                        total_frames,
                        sample_count,
                        sample_rate,
                        speech_mask,
                    ) = analyze_audio_file(
                        wav_path,
                        state.model.fps,
                        args.silence_threshold_dbfs,
                        args.silence_merge_gap_frames,
                        args.enable_vad,
                    )
                except Exception:
                    duration = remaining
                    total_frames = max(
                        1, int(math.floor(duration * state.model.fps))
                    )
                    sample_rate = source.sample_rate
                    sample_count = max(
                        1, int(round(duration * sample_rate))
                    )
                    speech_mask = np.ones(total_frames, dtype=bool)
                analysis_frames = total_frames
                analysis_sample_count = sample_count
                frame_offset = 0
                playback_wav_path = wav_path
                extra_frames = 0
                pause_boundary = False
                global_start = source.global_start_frame + frame
            else:
                log("interrupt trim failed; falling back to restarting the segment")
                wav_path = source.wav_path
                duration = source.duration
                total_frames = source.total_frames
                sample_count = source.sample_count
                sample_rate = source.sample_rate
                speech_mask = source.speech_mask
                analysis_frames = source.analysis_frames
                analysis_sample_count = source.analysis_sample_count
                frame_offset = source.frame_offset
                playback_wav_path = (
                    source.playback_wav_path or source.wav_path
                )
                extra_frames = source.extra_frames
                pause_boundary = source.pause_boundary
                global_start = source.global_start_frame
        else:
            wav_path = source.wav_path
            duration = source.duration
            total_frames = source.total_frames
            sample_count = source.sample_count
            sample_rate = source.sample_rate
            speech_mask = source.speech_mask
            analysis_frames = source.analysis_frames
            analysis_sample_count = source.analysis_sample_count
            frame_offset = source.frame_offset
            playback_wav_path = (
                source.playback_wav_path or source.wav_path
            )
            extra_frames = source.extra_frames
            pause_boundary = source.pause_boundary
            global_start = source.global_start_frame

        segment = LiveSegment(
            id=segment_id,
            source_path=source.source_path,
            wav_path=wav_path,
            duration=duration,
            total_frames=total_frames,
            global_start_frame=global_start,
            sample_count=sample_count,
            sample_rate=sample_rate,
            speech_mask=speech_mask,
            speech_frames=int(speech_mask.sum()),
            priority=1,
            is_resume=True,
            origin_id=source.id,
            created_at=time.monotonic(),
            analysis_frames=analysis_frames,
            frame_offset=frame_offset,
            analysis_sample_count=analysis_sample_count,
            playback_wav_path=playback_wav_path,
            extra_frames=extra_frames,
            pause_boundary=pause_boundary,
            is_final=source.is_final,
        )
        with state.pipeline.lock:
            state.pipeline.segments[segment_id] = segment
        log(
            f"interrupt resume segment {segment_id} from {source.id} "
            f"mode={mode} frames={total_frames} duration={duration:.3f}s"
        )
        return segment

    def clone_for_restore(self, source: LiveSegment) -> LiveSegment:
        state = self.state
        with state.pipeline.lock:
            segment_id = state.pipeline.next_id
            state.pipeline.next_id += 1
        clone = LiveSegment(
            id=segment_id,
            source_path=source.source_path,
            wav_path=source.wav_path,
            duration=source.duration,
            total_frames=source.total_frames,
            global_start_frame=source.global_start_frame,
            sample_count=source.sample_count,
            sample_rate=source.sample_rate,
            speech_mask=source.speech_mask,
            speech_frames=source.speech_frames,
            priority=1,
            is_resume=True,
            origin_id=source.id,
            created_at=time.monotonic(),
            analysis_frames=source.analysis_frames,
            frame_offset=source.frame_offset,
            analysis_sample_count=source.analysis_sample_count,
            playback_wav_path=(
                source.playback_wav_path or source.wav_path
            ),
            extra_frames=source.extra_frames,
            pause_boundary=source.pause_boundary,
            is_final=source.is_final,
        )
        with state.pipeline.lock:
            state.pipeline.segments[segment_id] = clone
        return clone

    def finish_if_due(self) -> None:
        state = self.state
        now = time.monotonic()
        with state.pipeline.lock:
            if not state.interrupt.active:
                return
            if now < state.interrupt.deadline:
                return
            source = state.interrupt.source
            frame = state.interrupt.source_frame
            future_segments = list(state.interrupt.resume_segments)
            state.interrupt.active = False
            state.interrupt.source = None
            state.interrupt.source_frame = 0
            state.interrupt.reset_frame = -1
            state.interrupt.resume_segments.clear()
            state.interrupt.deadline = 0.0
            state.pipeline.cancel_segment_id = None

        if source is None:
            return
        resume = self.create_resume_segment(source, frame)
        if resume is not None:
            state.pipeline.resume_queue.put(resume)
        restored = 0
        for segment in future_segments:
            clone = self.clone_for_restore(segment)
            state.pipeline.resume_queue.put(clone)
            restored += 1
        state.viewer.last_ack_time = time.monotonic()
        state.interrupt.resume_count += 1
        log(
            f"interrupt resume batch: interrupted={source.id} "
            f"restored_queue={restored}"
        )
