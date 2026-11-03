"""Thread workers connecting inference, encoding and network queues."""

from __future__ import annotations

import asyncio
import concurrent.futures
import os
import queue as std_queue
import threading
import time
import traceback

import cv2
import numpy as np

from ..audio.segments import SegmentManager
from ..domain import LiveSegment
from ..log import log
from ..protocol import (
    FRAME_GENERATED,
    FRAME_IDLE,
    FRAME_SILENT,
    IDLE_SEGMENT_ID,
    frame_pts_us,
    pack_h264_frame,
    pack_frame,
)
from ..state import AppState
from .h264 import EncodedH264Frame, FFmpegH264Encoder as H264Encoder
from .pipeline import InferencePipeline
from .stability import FaceStabilizer, overlap_length

# Raw-queue marker for "repeat the previous composite frame". It never goes
# on the wire: the encode worker sends it as FRAME_SILENT.
FRAME_HOLD = -1


def blend_generated_frames(
    previous,
    current,
    alpha: float,
):
    """Blend two same-timestamp generated faces for a segment seam."""
    if previous.shape != current.shape:
        return current
    blended = (
        previous.astype(np.float32) * (1.0 - alpha)
        + current.astype(np.float32) * alpha
    )
    return np.clip(blended, 0, 255).astype(np.uint8)


def put_blocking(
    queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    item: tuple,
    stop: threading.Event,
) -> bool:
    future = asyncio.run_coroutine_threadsafe(queue.put(item), loop)
    while True:
        try:
            future.result(timeout=0.5)
            return True
        except concurrent.futures.TimeoutError:
            if stop.is_set():
                future.cancel()
                return False


def get_blocking(
    queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    stop: threading.Event,
):
    future = asyncio.run_coroutine_threadsafe(queue.get(), loop)
    while True:
        try:
            return future.result(timeout=0.5)
        except concurrent.futures.TimeoutError:
            if stop.is_set():
                future.cancel()
                return None


def live_infer_worker(
    state: AppState,
    raw_queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    stop: threading.Event,
) -> None:
    args = state.args
    assert args is not None
    avatar = state.model.avatar
    assert avatar is not None
    segments = SegmentManager(state)
    pipeline = InferencePipeline(state)
    stabilizer = FaceStabilizer(getattr(args, "face_stability_strength", 0.0))
    next_frame = 0
    pending_extra: dict[int, tuple[str, np.ndarray]] = {}
    # Last segment that finished generating while an answer is still open.
    # Underruns inside an answer repeat its last frame instead of cutting to
    # the source video; between answers and during interrupts use idle frames.
    last_media: LiveSegment | None = None
    hold_run = 0

    def emit_idle_frame() -> bool:
        nonlocal next_frame
        frame_flush_seq = state.pipeline.flush_seq
        stabilizer.reset()
        frame = avatar.frame_list_cycle[
            next_frame % len(avatar.frame_list_cycle)
        ]
        if not put_blocking(
            raw_queue,
            loop,
            (
                "raw",
                FRAME_IDLE,
                IDLE_SEGMENT_ID,
                frame_pts_us(next_frame, state.model.fps),
                next_frame,
                frame,
                frame_flush_seq,
            ),
            stop,
        ):
            return False
        state.pipeline.idle_frames += 1
        next_frame += 1
        return True

    def emit_gap_frame() -> bool:
        nonlocal next_frame, last_media, hold_run
        frame_flush_seq = state.pipeline.flush_seq
        if (
            last_media is not None
            and not last_media.is_final
            and not state.interrupt.active
            and last_media.id not in state.pipeline.canceled_ids
            and hold_run < args.hold_max_frames
        ):
            if not put_blocking(
                raw_queue,
                loop,
                (
                    "raw",
                    FRAME_HOLD,
                    last_media.id,
                    frame_pts_us(next_frame, state.model.fps),
                    next_frame,
                    None,
                    frame_flush_seq,
                ),
                stop,
            ):
                return False
            if hold_run == 0:
                log(
                    f"underrun inside answer: holding last frame of "
                    f"segment {last_media.id} from frame {next_frame}"
                )
            state.pipeline.hold_frames += 1
            hold_run += 1
            next_frame += 1
            return True
        if last_media is not None:
            log(
                f"answer gap ends hold after {hold_run} frames: "
                f"segment={last_media.id} final={last_media.is_final} "
                f"interrupt={state.interrupt.active}"
            )
        # Once the source video is visible, never go back to a stale face.
        last_media = None
        hold_run = 0
        return emit_idle_frame()

    try:
        while not stop.is_set() and not state.service.exit_requested:
            with state.pipeline.lock:
                reset_frame = state.interrupt.reset_frame
                if reset_frame >= 0:
                    state.interrupt.reset_frame = -1
            if reset_frame >= 0:
                last_media = None
                hold_run = 0
                pending_extra.clear()
                stabilizer.reset()
            if reset_frame >= 0 and reset_frame != next_frame:
                next_frame = reset_frame

            segment = segments.next_segment()
            if segment is None:
                if (
                    next_frame
                    <= state.pipeline.ack_frame + args.idle_prebuffer_frames
                ):
                    if not emit_gap_frame():
                        return
                else:
                    time.sleep(0.02)
                continue

            if segment.id in state.pipeline.canceled_ids:
                continue
            if state.interrupt.active and segment.priority != 0:
                pending_extra.clear()
                segments.enqueue(segment)
                time.sleep(0.1)
                continue

            desired_start = next_frame
            # Optionally buffer only before an answer starts; padding every
            # continuation window would insert hold frames mid-answer.
            continuing_answer = (
                args.prebuffer_answer_start_only
                and last_media is not None
                and not last_media.is_final
            )
            if state.pipeline.ack_frame >= 0 and not continuing_answer:
                desired_start = max(
                    desired_start,
                    state.pipeline.ack_frame
                    + max(args.prebuffer, args.idle_prebuffer_frames),
                )
            while next_frame < desired_start:
                if not emit_gap_frame():
                    return
            hold_run = 0

            segment.global_start_frame = next_frame
            overlap = overlap_length(pending_extra, segment.global_start_frame, segment.total_frames)
            for frame_index in list(pending_extra):
                if (
                    frame_index < segment.global_start_frame
                    or frame_index >= segment.global_start_frame + overlap
                ):
                    pending_extra.pop(frame_index, None)
            with state.pipeline.lock:
                state.pipeline.latest_media_segment_id = segment.id
                state.pipeline.latest_media_end_frame = (
                    next_frame + segment.total_frames - 1
                )
            completed = False
            canceled = False
            segment_flush_seq = state.pipeline.flush_seq
            with state.pipeline.lock:
                state.pipeline.generating += 1
            try:
                if not put_blocking(
                    raw_queue, loop, ("segment", segment), stop
                ):
                    return
                log(
                    f"generating segment {segment.id}: "
                    f"{segment.total_frames} frames "
                    f"start_frame={segment.global_start_frame} "
                    f"start_pts="
                    f"{frame_pts_us(segment.global_start_frame, state.model.fps)}us"
                )
                for frame_kind, frame_index, frame in pipeline.iter_segment(
                    segment
                ):
                    if segment.id in state.pipeline.canceled_ids or (
                        state.interrupt.active and segment.priority != 0
                    ):
                        canceled = True
                        state.pipeline.canceled_ids.add(segment.id)
                        pending_extra.clear()
                        log(f"cancelled generation of segment {segment.id}")
                        break
                    core_end = (
                        segment.global_start_frame
                        + segment.total_frames
                    )
                    if frame_index >= core_end:
                        pending_extra[frame_index] = (
                            frame_kind,
                            frame,
                        )
                        continue
                    emit_frame = frame
                    if (
                        frame_index
                        < segment.global_start_frame + overlap
                        and frame_index in pending_extra
                    ):
                        previous_kind, previous_frame = (
                            pending_extra.pop(frame_index)
                        )
                        if (
                            previous_kind == "generated"
                            and frame_kind == "generated"
                        ):
                            alpha = (
                                frame_index
                                - segment.global_start_frame
                                + 1
                            ) / max(1, overlap)
                            emit_frame = blend_generated_frames(
                                previous_frame,
                                frame,
                                alpha,
                            )
                    if frame_kind == "generated":
                        emit_frame = stabilizer.process(frame_index, emit_frame)
                    else:
                        stabilizer.reset()
                    if not put_blocking(
                        raw_queue,
                        loop,
                        (
                            "raw",
                            (
                                FRAME_GENERATED
                                if frame_kind == "generated"
                                else FRAME_SILENT
                            ),
                            segment.id,
                            frame_pts_us(frame_index, state.model.fps),
                            frame_index,
                            emit_frame,
                            segment_flush_seq,
                        ),
                        stop,
                    ):
                        return
                    if frame_kind == "generated":
                        state.pipeline.generated_frames += 1
                    else:
                        state.pipeline.silent_frames += 1
                    next_frame = max(next_frame, frame_index + 1)
                if not canceled:
                    if not put_blocking(
                        raw_queue, loop, ("segment_end", segment.id), stop
                    ):
                        return
                    completed = True
                    last_media = segment
                    hold_run = 0
                else:
                    last_media = None
                    hold_run = 0
            finally:
                with state.pipeline.lock:
                    state.pipeline.generating -= 1
                if not completed and not canceled:
                    segments.enqueue(segment)
    except Exception:
        put_blocking(
            raw_queue,
            loop,
            ("error", traceback.format_exc()),
            stop,
        )



def live_h264_encode_worker(state, raw_queue, network_queue, loop, stop):
    """Encode in timeline order so inter-frame references stay valid."""
    from .h264 import H264Encoder

    args = state.args
    pipeline = InferencePipeline(state)
    encoder = None
    previous_image = None
    count = 0
    started = time.monotonic()
    log("live encoder started: H.264 native-resolution zerolatency CRF="
        + os.environ.get("AVATAR_H264_CRF", "20"))
    try:
        while not stop.is_set():
            item = get_blocking(raw_queue, loop, stop)
            if item is None:
                return
            kind = item[0]
            if kind in ("segment", "segment_end", "error"):
                if not put_blocking(network_queue, loop, item, stop):
                    return
                if kind == "error":
                    return
                continue
            if kind != "raw":
                continue
            _, frame_kind, segment_id, pts_us, frame_index, frame, *generation = item
            with state.pipeline.lock:
                if segment_id in state.pipeline.canceled_ids:
                    continue
                flush = state.pipeline.flush_seq
            if generation and generation[0] != flush:
                continue
            if frame_kind == FRAME_HOLD:
                frame_kind = FRAME_SILENT
                image = previous_image
                if image is None:
                    cycle = state.model.avatar.frame_list_cycle
                    image = cycle[frame_index % len(cycle)]
            elif frame_kind == FRAME_GENERATED:
                image = pipeline.blend_frame(frame_index, frame)
            else:
                image = frame
            width = int(os.environ.get("AVATAR_STREAM_MAX_WIDTH", "0"))
            width -= width % 2
            if width > 0 and image.shape[1] > width:
                height = round(image.shape[0] * width / image.shape[1])
                height -= height % 2
                image = cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)
            if encoder is None:
                encoder = H264Encoder(image.shape[1], image.shape[0], state.model.fps)
            payload = encoder.encode(image, index=frame_index, segment=segment_id, flush=flush)
            with state.pipeline.lock:
                if segment_id in state.pipeline.canceled_ids or flush != state.pipeline.flush_seq:
                    continue
            previous_image = image
            packet = pack_h264_frame(frame_kind, segment_id, pts_us, frame_index,
                                     payload[5:], keyframe=bool(payload[4]))
            if not put_blocking(network_queue, loop,
                ("frame", frame_kind, segment_id, pts_us, frame_index, packet, flush), stop):
                return
            count += 1
            if count % 500 == 0:
                log(f"H.264 encoded {count} frames at={time.monotonic()-started:.3f}s "
                    f"network_queue={network_queue.qsize()}")
    except Exception:
        log(traceback.format_exc())
        put_blocking(network_queue, loop, ("error", traceback.format_exc()), stop)


def live_encode_worker(
    state: AppState,
    raw_queue: asyncio.Queue,
    network_queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    stop: threading.Event,
    stream_format: str | None = None,
) -> None:
    selected_format = (stream_format or os.environ.get("AVATAR_STREAM_FORMAT", "h264")).lower()
    if selected_format in ("h264", "h264_annexb") and os.environ.get("AVATAR_H264_BACKEND", "pyav") != "ffmpeg":
        live_h264_encode_worker(state, raw_queue, network_queue, loop, stop)
        return
    args = state.args
    assert args is not None
    pipeline = InferencePipeline(state)
    count = 0
    started = time.monotonic()
    last_encoded: bytes | None = None
    last_composite: np.ndarray | None = None
    stream_width = int(os.environ.get("AVATAR_STREAM_MAX_WIDTH", "0"))
    if stream_width > 0:
        stream_width -= stream_width % 2
    selected_format = (
        stream_format
        or os.environ.get("AVATAR_STREAM_FORMAT", "h264")
    ).lower()
    use_h264 = selected_format in ("h264", "h264_annexb")
    use_webp = not use_h264 and selected_format != "jpeg"
    extension = ".webp" if use_webp else ".jpg"
    quality_key = cv2.IMWRITE_WEBP_QUALITY if use_webp else cv2.IMWRITE_JPEG_QUALITY
    encode_threads_raw = os.environ.get("AVATAR_ENCODE_THREADS", "4") or "4"
    try:
        encode_threads = int(encode_threads_raw)
    except ValueError:
        log(
            f"invalid AVATAR_ENCODE_THREADS={encode_threads_raw!r}; "
            "falling back to 4"
        )
        encode_threads = 4
    encode_threads = max(1, min(32, encode_threads))
    # Keep several frames in flight without allowing a full-resolution
    # backlog to grow without bound.
    ordered_queue: std_queue.Queue = std_queue.Queue(
        maxsize=max(8, encode_threads * 4),
    )
    sender_gone = threading.Event()
    executor: concurrent.futures.ThreadPoolExecutor | None = None
    h264_encoder: H264Encoder | None = None

    def encode_prepared(frame: np.ndarray) -> bytes | None:
        ok, encoded = cv2.imencode(
            extension,
            frame,
            [quality_key, args.jpeg_quality],
        )
        if not ok and use_webp:
            ok, encoded = cv2.imencode(
                ".jpg",
                frame,
                [cv2.IMWRITE_JPEG_QUALITY, args.jpeg_quality],
            )
        return encoded.tobytes() if ok else None

    def resize_for_stream(frame: np.ndarray) -> np.ndarray:
        if stream_width > 0 and frame.shape[1] > stream_width:
            height = round(frame.shape[0] * stream_width / frame.shape[1])
            height -= height % 2
            frame = cv2.resize(
                frame,
                (stream_width, height),
                interpolation=cv2.INTER_AREA,
            )
        return frame

    def put_ordered(
        future: concurrent.futures.Future | None,
        metadata: tuple,
    ) -> bool:
        while not stop.is_set() and not sender_gone.is_set():
            try:
                ordered_queue.put((future, metadata), timeout=0.1)
                return True
            except std_queue.Full:
                continue
        return False

    def ordered_sender() -> None:
        nonlocal count, last_encoded
        try:
            while True:
                try:
                    item = ordered_queue.get(timeout=0.1)
                except std_queue.Empty:
                    if stop.is_set() or sender_gone.is_set():
                        return
                    continue
                if item is None:
                    return
                future, metadata = item
                item_type = metadata[0]

                if item_type == "control":
                    control = metadata[1]
                    if not put_blocking(network_queue, loop, control, stop):
                        return
                    if control[0] == "error":
                        stop.set()
                        return
                    continue

                _, frame_kind, segment_id, pts_us, frame_index = metadata[:5]
                frame_flush_seq = metadata[-1]
                with state.pipeline.lock:
                    current_flush_seq = state.pipeline.flush_seq
                if frame_flush_seq != current_flush_seq:
                    continue
                encoded: EncodedH264Frame | bytes | None = None
                if item_type == "hold":
                    encoded_bytes = last_encoded
                    if encoded_bytes is None:
                        # This is only possible when a hold is emitted before
                        # the first encoded frame. Encode the fallback once.
                        encoded_bytes = encode_prepared(metadata[5])
                else:
                    assert future is not None
                    try:
                        encoded = future.result()
                    except Exception:
                        log(traceback.format_exc())
                        continue
                    if isinstance(encoded, EncodedH264Frame):
                        encoded_bytes = encoded.data
                    else:
                        encoded_bytes = encoded
                if encoded_bytes is None:
                    continue
                with state.pipeline.lock:
                    canceled = segment_id in state.pipeline.canceled_ids
                if canceled:
                    continue
                if isinstance(encoded, EncodedH264Frame):
                    packet = pack_h264_frame(
                        frame_kind,
                        segment_id,
                        pts_us,
                        frame_index,
                        encoded_bytes,
                        keyframe=encoded.keyframe,
                    )
                    last_encoded = None
                else:
                    packet = pack_frame(
                        frame_kind,
                        segment_id,
                        pts_us,
                        frame_index,
                        encoded_bytes,
                    )
                    last_encoded = encoded_bytes
                if not put_blocking(
                    network_queue,
                    loop,
                    (
                        "frame",
                        frame_kind,
                        segment_id,
                        pts_us,
                        frame_index,
                        packet,
                        frame_flush_seq,
                    ),
                    stop,
                ):
                    return
                count += 1
                if count % 500 == 0:
                    log(
                        f"encoded {count} live frames "
                        f"at={time.monotonic() - started:.3f}s "
                        f"network_queue={network_queue.qsize()} "
                        f"encode_threads={encode_threads}"
                    )
        except Exception:
            sender_gone.set()
            put_blocking(
                network_queue,
                loop,
                ("error", traceback.format_exc()),
                stop,
            )

    def h264_error(message: str) -> None:
        put_blocking(
            network_queue,
            loop,
            ("error", message),
            stop,
        )
        stop.set()

    output_width = int(state.model.width)
    output_height = int(state.model.height)
    if stream_width > 0 and output_width > stream_width:
        output_height = round(output_height * stream_width / output_width)
        output_width = stream_width
    output_width -= output_width % 2
    output_height -= output_height % 2
    encoder_flush_seq = state.pipeline.flush_seq

    def create_h264_encoder() -> H264Encoder:
        return H264Encoder(
            width=output_width,
            height=output_height,
            fps=args.fps,
            on_error=h264_error,
        )

    try:
        if use_h264:
            h264_encoder = create_h264_encoder()
            log(
                f"live encoder started: format=h264 "
                f"size={output_width}x{output_height} fps={args.fps}"
            )
        else:
            executor = concurrent.futures.ThreadPoolExecutor(
                max_workers=encode_threads,
                thread_name_prefix="avatar-image",
            )
            log(
                f"live encoder started: format={extension} "
                f"threads={encode_threads} quality={args.jpeg_quality}"
            )
    except Exception:
        put_blocking(
            network_queue,
            loop,
            ("error", traceback.format_exc()),
            stop,
        )
        return
    sender = threading.Thread(
        target=ordered_sender,
        name="avatar-frame-sender",
        daemon=True,
    )
    sender.start()
    try:
        while not stop.is_set():
            item = get_blocking(raw_queue, loop, stop)
            if item is None:
                return
            with state.pipeline.lock:
                current_flush_seq = state.pipeline.flush_seq
            if current_flush_seq != encoder_flush_seq:
                if use_h264:
                    assert h264_encoder is not None
                    h264_encoder.close()
                    h264_encoder = create_h264_encoder()
                encoder_flush_seq = current_flush_seq
                log(
                    "H.264 encoder restarted for flush "
                    f"seq={encoder_flush_seq}"
                )
            kind = item[0]
            if kind in ("segment", "segment_end", "error"):
                if not put_ordered(None, ("control", item)):
                    return
                if kind == "error":
                    return
                if kind == "segment":
                    log(f"encoding segment {item[1].id}")
                continue

            if kind != "raw":
                continue

            _, frame_kind, segment_id, pts_us, frame_index, frame, *generation = item
            if generation and generation[0] != current_flush_seq:
                continue
            if frame_kind == FRAME_HOLD:
                frame_kind = FRAME_SILENT
                if use_h264:
                    fallback = last_composite
                    if fallback is None:
                        cycle = state.model.avatar.frame_list_cycle
                        fallback = resize_for_stream(
                            cycle[frame_index % len(cycle)]
                        )
                    assert h264_encoder is not None
                    future = h264_encoder.submit(fallback)
                else:
                    # Repeat the whole image composite: re-blending the old
                    # face onto a newer background frame would misalign it.
                    cycle = state.model.avatar.frame_list_cycle
                    fallback = resize_for_stream(
                        cycle[frame_index % len(cycle)]
                    )
                    future = None
                metadata = (
                    "hold" if not use_h264 else "frame",
                    frame_kind,
                    segment_id,
                    pts_us,
                    frame_index,
                    fallback,
                    encoder_flush_seq,
                )
                if not put_ordered(future, metadata):
                    return
            else:
                if frame_kind == FRAME_GENERATED:
                    combined = pipeline.blend_frame(frame_index, frame)
                else:
                    combined = frame
                combined = resize_for_stream(combined)
                last_composite = combined
                if use_h264:
                    assert h264_encoder is not None
                    future = h264_encoder.submit(combined)
                else:
                    assert executor is not None
                    future = executor.submit(encode_prepared, combined)
                if not put_ordered(
                    future,
                    (
                        "frame",
                        frame_kind,
                        segment_id,
                        pts_us,
                        frame_index,
                        encoder_flush_seq,
                    ),
                ):
                    return
    except Exception:
        sender_gone.set()
        put_blocking(
            network_queue,
            loop,
            ("error", traceback.format_exc()),
            stop,
        )
    finally:
        # Stop the producer side of the bounded queue and wait for all accepted
        # encode jobs to retire before the caller tears down queues/threads.
        if h264_encoder is not None:
            h264_encoder.close()
        try:
            while not ordered_queue.full():
                ordered_queue.put(None, timeout=0.1)
                break
        except (std_queue.Full, ValueError):
            pass
        if executor is not None:
            executor.shutdown(wait=True, cancel_futures=False)
        sender.join(timeout=5)
