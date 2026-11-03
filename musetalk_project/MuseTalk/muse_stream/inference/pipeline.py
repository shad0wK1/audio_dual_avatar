"""Per-segment inference and frame blending."""

from __future__ import annotations

import time

import cv2
import numpy as np

from ..domain import LiveSegment
from ..log import log
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
        (
            whisper_input_features,
            librosa_length,
        ) = runtime.audio_processor.get_audio_feature(
            str(segment.wav_path),
            weight_dtype=runtime.weight_dtype,
        )
        whisper_chunks = runtime.audio_processor.get_whisper_chunk(
            whisper_input_features,
            runtime.device,
            runtime.weight_dtype,
            runtime.whisper,
            librosa_length,
            fps=args.fps,
            audio_padding_length_left=args.audio_padding_length_left,
            audio_padding_length_right=args.audio_padding_length_right,
            feature_window_mode=args.feature_window_mode,
            feature_window_left=args.feature_window_left,
            feature_window_right=args.feature_window_right,
        )
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
                    if batch_indices[0] == 0:
                        log(f"inference timing: segment={segment.id} "
                            f"feature_ms={feature_seconds * 1000:.1f} "
                            f"first_batch_ms={batch_seconds * 1000:.1f} "
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
                        yield "generated", frame_index, res_frame
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
