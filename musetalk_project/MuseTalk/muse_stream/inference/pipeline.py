"""Per-segment inference and frame blending."""

from __future__ import annotations

import time

import cv2
import numpy as np

from ..domain import LiveSegment
from ..log import log
from ..models import stream_audio_features
from ..protocol import frame_pts_us
from ..state import AppState


def iter_speech_batches(
    whisper_chunks,
    latents,
    frame_indices: list[int],
    batch_size: int,
    device,
    frame_offset: int = 0,
    whisper_offset: int = 0,
):
    """Yield fixed-size batches, padding the final partial batch.

    A trailing batch with a different shape can trigger a very slow cuDNN
    plan on some GPUs. Padding it to the regular batch size avoids that.
    """
    import torch

    for start in range(0, len(frame_indices), batch_size):
        end = min(start + batch_size, len(frame_indices))
        batch_indices = frame_indices[start:end]
        valid = end - start
        whisper_batch = torch.stack(
            [whisper_chunks[whisper_offset + i] for i in batch_indices]
        )
        latent_batch = torch.cat(
            [
                latents[(frame_offset + i) % len(latents)]
                for i in batch_indices
            ],
            dim=0,
        )
        if valid < batch_size:
            repeats = batch_size - valid
            whisper_batch = torch.cat(
                [whisper_batch, whisper_batch[-1:].repeat(repeats, 1, 1)],
                dim=0,
            )
            latent_batch = torch.cat(
                [latent_batch, latent_batch[-1:].repeat(repeats, 1, 1, 1)],
                dim=0,
            )
        yield (
            batch_indices,
            whisper_batch.to(device),
            latent_batch.to(device),
        )


def contiguous_runs(mask: np.ndarray) -> list[tuple[int, int]]:
    indices = np.flatnonzero(mask)
    if indices.size == 0:
        return []
    breaks = np.flatnonzero(np.diff(indices) > 1)
    starts = np.concatenate(([0], breaks + 1))
    ends = np.concatenate((breaks + 1, [indices.size]))
    return [
        (int(indices[start]), int(indices[end - 1]) + 1)
        for start, end in zip(starts, ends)
    ]


class InferencePipeline:
    """Generate the visible frames for one complete audio segment."""

    def __init__(self, state: AppState) -> None:
        self.state = state
        self.last_gpu_ratio = 0.0

    def iter_segment(self, segment: LiveSegment):
        """Yield timestamped frames, bypassing UNet for silent audio windows."""
        import torch

        state = self.state
        runtime = state.model.runtime
        avatar = state.model.avatar
        assert runtime is not None and avatar is not None
        args = state.args
        assert args is not None

        feature_started = time.monotonic()
        whisper_chunks, mel_ms, whisper_ms = stream_audio_features(runtime, args, segment.wav_path)
        feature_seconds = time.monotonic() - feature_started
        total_frames = segment.total_frames
        extra_frames = segment.extra_frames
        inference_frames = total_frames + extra_frames
        frame_offset = segment.frame_offset
        if segment.speech_mask is None:
            speech_mask = np.ones(inference_frames, dtype=bool)
        else:
            speech_mask = np.asarray(segment.speech_mask, dtype=bool)
            if speech_mask.size < inference_frames:
                speech_mask = np.pad(
                    speech_mask,
                    (0, inference_frames - speech_mask.size),
                    constant_values=False,
                )
            speech_mask = speech_mask[:inference_frames].copy()
        feature_frames = min(
            inference_frames,
            max(0, len(whisper_chunks) - frame_offset),
        )
        if feature_frames < inference_frames:
            speech_mask[feature_frames:] = False

        silent_frames = int(inference_frames - speech_mask.sum())
        generated_frames = int(speech_mask.sum())
        log(
            f"streaming {segment.wav_path.name}: frames={total_frames} "
            f"extra_frames={extra_frames} "
            f"generated={generated_frames} silent={silent_frames} "
            f"analysis_frames={segment.analysis_frames} "
            f"frame_offset={frame_offset} "
            f"feature_window={args.feature_window_mode} "
            f"start_pts={frame_pts_us(segment.global_start_frame, args.fps)}us"
        )

        # The audio transport releases each WAV when its lip segment starts.
        # If inference is consuming the playout reserve, keep the 24 Hz timeline
        # and interpolate a few face crops instead of starving the audio queue.
        with state.pipeline.lock:
            lead = segment.global_start_frame - state.pipeline.ack_frame
        under_load = self.last_gpu_ratio > 0.65 and lead <= args.fps * 1.5
        inference_seconds = feature_seconds
        inferred_count = 0
        cursor = 0
        batch_started = time.monotonic()
        with torch.no_grad():
            for run_start, run_end in contiguous_runs(speech_mask):
                while cursor < run_start:
                    frame_index = segment.global_start_frame + cursor
                    yield (
                        "silent",
                        frame_index,
                        avatar.frame_list_cycle[
                            frame_index % len(avatar.frame_list_cycle)
                        ],
                    )
                    cursor += 1

                frame_indices = list(range(run_start, run_end))
                if under_load and len(frame_indices) > args.batch_size:
                    # Always infer both endpoints, including the overlap.
                    batches = max(1, round(len(frame_indices) * 0.60 / args.batch_size))
                    count = max(2, batches * args.batch_size)
                    if count < len(frame_indices):
                        frame_indices = np.linspace(run_start, run_end - 1, count).round().astype(int).tolist()
                previous_offset = None
                previous_face = None
                inferred_count += len(frame_indices)
                for (
                    batch_indices,
                    whisper_batch,
                    latent_batch,
                ) in iter_speech_batches(
                    whisper_chunks,
                    avatar.input_latent_list_cycle,
                    frame_indices,
                    args.batch_size,
                    runtime.device,
                    frame_offset=segment.global_start_frame,
                    whisper_offset=frame_offset,
                ):
                    batch_started = time.monotonic()
                    audio_feature_batch = runtime.pe(whisper_batch)
                    latent_batch = latent_batch.to(
                        device=runtime.device,
                        dtype=runtime.unet.model.dtype,
                    )
                    pred_latents = runtime.unet.model(
                        latent_batch,
                        runtime.timesteps,
                        encoder_hidden_states=audio_feature_batch,
                    ).sample
                    pred_latents = pred_latents.to(
                        device=runtime.device,
                        dtype=runtime.vae.vae.dtype,
                    )
                    recon = runtime.vae.decode_latents(pred_latents)
                    batch_seconds = time.monotonic() - batch_started
                    inference_seconds += batch_seconds
                    if batch_indices[0] == 0:
                        log(f"inference timing: segment={segment.id} "
                            f"feature_ms={feature_seconds * 1000:.1f} "
                            f"first_batch_ms={batch_seconds * 1000:.1f} "
                            f"mel_ms={mel_ms:.1f} whisper_ms={whisper_ms:.1f} "
                            f"batch_size={args.batch_size}")
                    if batch_seconds > 2:
                        log(
                            f"slow inference batch: valid={len(batch_indices)} "
                            f"first={batch_indices[0]} dt={batch_seconds:.3f}s"
                        )
                    batch_started = time.monotonic()

                    for offset, res_frame in enumerate(
                        recon[: len(batch_indices)]
                    ):
                        frame_index = (
                            segment.global_start_frame + batch_indices[offset]
                        )
                        local_index = batch_indices[offset]
                        if previous_offset is not None:
                            for middle in range(previous_offset + 1, local_index):
                                alpha = (middle - previous_offset) / (local_index - previous_offset)
                                face = cv2.addWeighted(previous_face, 1-alpha, res_frame, alpha, 0)
                                yield "generated", segment.global_start_frame + middle, face
                        yield "generated", frame_index, res_frame
                        previous_offset, previous_face = local_index, res_frame
                cursor = run_end

            while cursor < inference_frames:
                frame_index = segment.global_start_frame + cursor
                yield (
                    "silent",
                    frame_index,
                    avatar.frame_list_cycle[
                        frame_index % len(avatar.frame_list_cycle)
                    ],
                )
                cursor += 1

        if inferred_count and segment.duration >= 0.5:
            # Estimate the cost at full detail so recovery does not oscillate.
            ratio = inference_seconds * generated_frames / inferred_count / segment.duration
            self.last_gpu_ratio = ratio if not self.last_gpu_ratio else 0.4*self.last_gpu_ratio + 0.6*ratio
            if inferred_count < generated_frames:
                log(f"adaptive lips: segment={segment.id} inferred={inferred_count}/{generated_frames} lead={lead}")

    def blend_frame(
        self,
        frame_index: int,
        res_frame: np.ndarray,
    ) -> np.ndarray:
        """Blend one generated 256x256 face back into the cached source frame."""
        from musetalk.utils.blending import get_image_blending

        avatar = self.state.model.avatar
        assert avatar is not None
        bbox = avatar.coord_list_cycle[
            frame_index % len(avatar.coord_list_cycle)
        ]
        ori_frame = avatar.frame_list_cycle[
            frame_index % len(avatar.frame_list_cycle)
        ]

        if tuple(bbox) == (0, 0, 0, 0):
            return ori_frame

        x1, y1, x2, y2 = bbox
        try:
            resized = cv2.resize(
                res_frame.astype(np.uint8),
                (x2 - x1, y2 - y1),
            )
        except Exception:
            return ori_frame

        mask = avatar.mask_list_cycle[
            frame_index % len(avatar.mask_list_cycle)
        ]
        mask_crop = avatar.mask_coords_list_cycle[
            frame_index % len(avatar.mask_coords_list_cycle)
        ]
        return get_image_blending(
            ori_frame,
            resized,
            [x1, y1, x2, y2],
            mask,
            mask_crop,
        )
