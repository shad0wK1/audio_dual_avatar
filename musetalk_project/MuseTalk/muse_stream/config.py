"""Configuration parsing and state initialization."""

from __future__ import annotations

import argparse
import math
import os
import time
from argparse import Namespace
from dataclasses import dataclass
from pathlib import Path

from omegaconf import OmegaConf

from .log import log
from .state import AppState


ROOT = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT / "web"
os.chdir(ROOT)


@dataclass
class LoadedConfig:
    args: Namespace
    avatar_id: str
    fps: int
    batch_size: int
    prebuffer: int
    queue_size: int
    audio_dir: Path
    live_audio_dir: Path
    input_mode: str
    stream_sample_rate: int
    stream_channels: int
    stream_format: str
    stream_window_frames: int
    stream_context_left_ms: float
    stream_context_right_ms: float
    stream_overlap_frames: int
    stream_pause_overlap_frames: int
    stream_pause_boundary_frames: int
    stream_max_pending_windows: int
    stream_max_buffer_seconds: float


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="MuseTalk streaming web server",
    )
    parser.add_argument(
        "--config",
        default="configs/streaming_web.yaml",
        help="Single YAML file containing server, model and avatar settings.",
    )
    return parser


def load_config(config_name: str) -> LoadedConfig:
    config_path = ROOT / config_name
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    config = OmegaConf.load(str(config_path))
    server_cfg = config.get("server", {})
    models_cfg = config.get("models", {})
    avatar_cfg = config.get("avatar", {})
    inference_cfg = config.get("inference", {})
    live_cfg = config.get("live", {})
    stream_cfg = config.get("audio_stream", {})

    avatar_id = str(avatar_cfg.get("id", "")).strip()
    video_path = str(avatar_cfg.get("video_path", "")).strip()
    if not avatar_id:
        raise ValueError("avatar.id is required")
    if not video_path:
        raise ValueError("avatar.video_path is required")

    version = str(models_cfg.get("version", "v15"))
    if version not in ("v1", "v15"):
        raise ValueError("models.version must be 'v1' or 'v15'")

    fps = int(server_cfg.get("fps", 24))
    batch_size = int(server_cfg.get("batch_size", 20))
    prebuffer = int(server_cfg.get("prebuffer", 8))
    queue_size = int(server_cfg.get("queue_size", 96))
    idle_timeout_seconds = float(live_cfg.get("idle_timeout_seconds", 30))
    interrupt_wait_seconds = float(live_cfg.get("interrupt_wait_seconds", 10))
    interrupt_resume_mode = str(
        live_cfg.get("interrupt_resume_mode", "restart")
    ).lower()
    poll_interval_seconds = float(live_cfg.get("poll_interval_seconds", 0.5))
    file_stable_seconds = float(live_cfg.get("file_stable_seconds", 0.5))
    max_prefetch_seconds = float(live_cfg.get("max_prefetch_seconds", 6))
    idle_prebuffer_frames = int(live_cfg.get("idle_prebuffer_frames", 8))
    hold_max_frames = int(live_cfg.get("hold_max_frames", 12))
    prebuffer_answer_start_only = bool(
        live_cfg.get("prebuffer_answer_start_only", False)
    )
    enable_vad = bool(inference_cfg.get("enable_vad", False))
    silence_threshold_dbfs = float(
        inference_cfg.get("silence_threshold_dbfs", -45.0)
    )
    silence_merge_gap_frames = int(
        inference_cfg.get("silence_merge_gap_frames", 3)
    )
    audio_padding_length_left = int(
        inference_cfg.get("audio_padding_length_left", 2)
    )
    audio_padding_length_right = int(
        inference_cfg.get("audio_padding_length_right", 2)
    )
    feature_window_mode = str(
        inference_cfg.get("feature_window_mode", "legacy")
    ).lower()
    feature_window_left = int(
        inference_cfg.get("feature_window_left", 4)
    )
    feature_window_right = int(
        inference_cfg.get("feature_window_right", 6)
    )
    face_stability_strength = float(inference_cfg.get("face_stability_strength", 0.0))
    if not 0.0 <= face_stability_strength <= 0.35:
        raise ValueError("inference.face_stability_strength must be between 0 and 0.35")
    process_existing = bool(live_cfg.get("process_existing", True))
    input_mode = str(live_cfg.get("input_mode", "file")).lower()
    audio_dir_value = str(live_cfg.get("audio_dir", "audio"))
    extensions = [
        str(ext).lower()
        for ext in live_cfg.get(
            "extensions", [".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"]
        )
    ]
    stream_sample_rate = int(stream_cfg.get("sample_rate", 16000))
    stream_channels = int(stream_cfg.get("channels", 1))
    stream_format = str(stream_cfg.get("format", "s16le")).lower()
    stream_window_frames = int(stream_cfg.get("window_frames", batch_size))
    # Optional shorter first window per upstream answer, so its core plus
    # right context fits the first upstream chunk.
    stream_first_window_frames = int(
        stream_cfg.get("first_window_frames", stream_window_frames)
    )
    stream_context_left_ms = float(
        stream_cfg.get("context_left_ms", 200)
    )
    stream_context_right_ms = float(
        stream_cfg.get("context_right_ms", 300)
    )
    stream_overlap_frames = int(stream_cfg.get("overlap_frames", 0))
    stream_pause_overlap_frames = int(
        stream_cfg.get("pause_overlap_frames", 0)
    )
    stream_pause_boundary_frames = int(
        stream_cfg.get("pause_boundary_frames", 0)
    )
    stream_max_pending_windows = int(
        stream_cfg.get("max_pending_windows", 12)
    )
    stream_max_buffer_seconds = float(
        stream_cfg.get("max_buffer_seconds", 5.0)
    )
    if fps < 1:
        raise ValueError("server.fps must be >= 1")
    if batch_size < 1:
        raise ValueError("server.batch_size must be >= 1")
    if idle_timeout_seconds <= 0:
        raise ValueError("live.idle_timeout_seconds must be > 0")
    if interrupt_wait_seconds <= 0:
        raise ValueError("live.interrupt_wait_seconds must be > 0")
    if interrupt_resume_mode not in ("restart", "continue"):
        raise ValueError("live.interrupt_resume_mode must be restart or continue")
    if poll_interval_seconds <= 0:
        raise ValueError("live.poll_interval_seconds must be > 0")
    if max_prefetch_seconds <= 0:
        raise ValueError("live.max_prefetch_seconds must be > 0")
    if idle_prebuffer_frames < 1:
        raise ValueError("live.idle_prebuffer_frames must be >= 1")
    if hold_max_frames < 0:
        raise ValueError("live.hold_max_frames must be >= 0")
    if silence_threshold_dbfs >= 0:
        raise ValueError("inference.silence_threshold_dbfs must be < 0")
    if silence_merge_gap_frames < 0:
        raise ValueError("inference.silence_merge_gap_frames must be >= 0")
    if feature_window_mode not in ("legacy", "centered"):
        raise ValueError(
            "inference.feature_window_mode must be legacy or centered"
        )
    if feature_window_left < 0 or feature_window_right < 0:
        raise ValueError(
            "inference.feature_window_left/right must be >= 0"
        )
    feature_length = 2 * (
        audio_padding_length_left + audio_padding_length_right + 1
    )
    if (
        feature_window_mode == "centered"
        and feature_window_left + feature_window_right != feature_length
    ):
        raise ValueError(
            "inference.feature_window_left + feature_window_right must "
            f"equal {feature_length}"
        )
    if input_mode not in ("file", "stream", "hybrid"):
        raise ValueError("live.input_mode must be file, stream or hybrid")
    if stream_sample_rate != 16000:
        raise ValueError("audio_stream.sample_rate must be 16000")
    if stream_channels != 1:
        raise ValueError("audio_stream.channels must be 1")
    if stream_format != "s16le":
        raise ValueError("audio_stream.format must be s16le")
    if stream_window_frames < 1:
        raise ValueError("audio_stream.window_frames must be >= 1")
    if stream_first_window_frames < 1:
        raise ValueError("audio_stream.first_window_frames must be >= 1")
    if (
        not math.isfinite(stream_context_left_ms)
        or stream_context_left_ms < 0
    ):
        raise ValueError("audio_stream.context_left_ms must be >= 0")
    if (
        not math.isfinite(stream_context_right_ms)
        or stream_context_right_ms < 0
    ):
        raise ValueError("audio_stream.context_right_ms must be >= 0")
    if stream_overlap_frames < 0:
        raise ValueError("audio_stream.overlap_frames must be >= 0")
    if stream_pause_overlap_frames < 0:
        raise ValueError(
            "audio_stream.pause_overlap_frames must be >= 0"
        )
    if stream_pause_boundary_frames < 0:
        raise ValueError(
            "audio_stream.pause_boundary_frames must be >= 0"
        )
    context_right_frames = int(
        round(stream_context_right_ms * fps / 1000.0)
    )
    if stream_overlap_frames > context_right_frames:
        raise ValueError(
            "audio_stream.overlap_frames must not exceed the right "
            "context frames"
        )
    if stream_pause_overlap_frames > context_right_frames:
        raise ValueError(
            "audio_stream.pause_overlap_frames must not exceed the right "
            "context frames"
        )
    if stream_max_pending_windows < 1:
        raise ValueError("audio_stream.max_pending_windows must be >= 1")
    if stream_max_buffer_seconds <= 0:
        raise ValueError("audio_stream.max_buffer_seconds must be > 0")
    window_ms = (
        max(stream_window_frames, stream_first_window_frames) * 1000.0 / fps
    )
    if (
        window_ms + stream_context_right_ms
        > stream_max_buffer_seconds * 1000.0
    ):
        raise ValueError(
            "audio_stream.max_buffer_seconds must cover one window plus "
            "audio_stream.context_right_ms"
        )

    audio_dir = (ROOT / audio_dir_value).resolve()
    audio_dir.mkdir(parents=True, exist_ok=True)
    run_id = time.strftime("%Y%m%d_%H%M%S")
    live_audio_dir = ROOT / "results" / "live_audio" / run_id
    live_audio_dir.mkdir(parents=True, exist_ok=True)

    args = Namespace(
        config=str(config_path),
        host=str(server_cfg.get("host", "0.0.0.0")),
        port=int(server_cfg.get("port", 8000)),
        gpu_id=int(server_cfg.get("gpu_id", 0)),
        fps=fps,
        batch_size=batch_size,
        prebuffer=prebuffer,
        queue_size=queue_size,
        jpeg_quality=int(server_cfg.get("jpeg_quality", 88)),
        version=version,
        vae_type=str(models_cfg.get("vae_type", "sd-vae")),
        whisper_dir=str(models_cfg.get("whisper_dir", "./models/whisper")),
        unet_model_path=models_cfg.get("unet_model_path"),
        unet_config=models_cfg.get("unet_config"),
        video_path=video_path,
        bbox_shift=int(avatar_cfg.get("bbox_shift", 0)),
        preparation=avatar_cfg.get("preparation", "auto"),
        extra_margin=int(avatar_cfg.get("extra_margin", 10)),
        parsing_mode=str(avatar_cfg.get("parsing_mode", "jaw")),
        left_cheek_width=int(avatar_cfg.get("left_cheek_width", 90)),
        right_cheek_width=int(avatar_cfg.get("right_cheek_width", 90)),
        audio_padding_length_left=audio_padding_length_left,
        audio_padding_length_right=audio_padding_length_right,
        feature_window_mode=feature_window_mode,
        feature_window_left=feature_window_left,
        feature_window_right=feature_window_right,
        face_stability_strength=face_stability_strength,
        audio_dir=str(audio_dir),
        idle_timeout_seconds=idle_timeout_seconds,
        interrupt_wait_seconds=interrupt_wait_seconds,
        interrupt_resume_mode=interrupt_resume_mode,
        poll_interval_seconds=poll_interval_seconds,
        file_stable_seconds=file_stable_seconds,
        max_prefetch_seconds=max_prefetch_seconds,
        idle_prebuffer_frames=idle_prebuffer_frames,
        hold_max_frames=hold_max_frames,
        prebuffer_answer_start_only=prebuffer_answer_start_only,
        enable_vad=enable_vad,
        silence_threshold_dbfs=silence_threshold_dbfs,
        silence_merge_gap_frames=silence_merge_gap_frames,
        process_existing=process_existing,
        input_mode=input_mode,
        extensions=extensions,
        stream_sample_rate=stream_sample_rate,
        stream_channels=stream_channels,
        stream_format=stream_format,
        stream_window_frames=stream_window_frames,
        stream_first_window_frames=stream_first_window_frames,
        stream_context_left_ms=stream_context_left_ms,
        stream_context_right_ms=stream_context_right_ms,
        stream_overlap_frames=stream_overlap_frames,
        stream_pause_overlap_frames=stream_pause_overlap_frames,
        stream_pause_boundary_frames=stream_pause_boundary_frames,
        stream_max_pending_windows=stream_max_pending_windows,
        stream_max_buffer_seconds=stream_max_buffer_seconds,
        skip_save_images=True,
    )
    return LoadedConfig(
        args=args,
        avatar_id=avatar_id,
        fps=fps,
        batch_size=batch_size,
        prebuffer=max(1, prebuffer),
        queue_size=max(max(1, prebuffer), queue_size),
        audio_dir=audio_dir,
        live_audio_dir=live_audio_dir,
        input_mode=input_mode,
        stream_sample_rate=stream_sample_rate,
        stream_channels=stream_channels,
        stream_format=stream_format,
        stream_window_frames=stream_window_frames,
        stream_context_left_ms=stream_context_left_ms,
        stream_context_right_ms=stream_context_right_ms,
        stream_overlap_frames=stream_overlap_frames,
        stream_pause_overlap_frames=stream_pause_overlap_frames,
        stream_pause_boundary_frames=stream_pause_boundary_frames,
        stream_max_pending_windows=stream_max_pending_windows,
        stream_max_buffer_seconds=stream_max_buffer_seconds,
    )


def configure_state(state: AppState, loaded: LoadedConfig) -> None:
    state.args = loaded.args
    state.model.default_avatar_id = loaded.avatar_id
    state.model.avatar_id = loaded.avatar_id
    state.model.fps = loaded.fps
    state.model.batch_size = loaded.batch_size
    state.model.prebuffer = loaded.prebuffer
    state.model.queue_size = loaded.queue_size
    state.ingest.audio_dir = loaded.audio_dir
    state.ingest.output_audio_dir = loaded.live_audio_dir
    state.stream_input.sample_rate = loaded.stream_sample_rate
    state.stream_input.channels = loaded.stream_channels
    state.service.ready_time = 0.0

    log(
        f"config={loaded.args.config} avatar={loaded.avatar_id} fps={loaded.fps} "
        f"batch={loaded.batch_size} watch={loaded.audio_dir} "
        f"idle={loaded.args.idle_timeout_seconds}s "
        f"interrupt={loaded.args.interrupt_wait_seconds}s/"
        f"{loaded.args.interrupt_resume_mode} "
        f"vad={'on' if loaded.args.enable_vad else 'off'} "
        f"feature={loaded.args.feature_window_mode} "
        f"context={loaded.stream_context_left_ms:.0f}/"
        f"{loaded.stream_context_right_ms:.0f}ms "
        f"overlap={loaded.stream_overlap_frames}/"
        f"{loaded.stream_pause_overlap_frames} "
        f"pause_window={loaded.stream_pause_boundary_frames} "
        f"hold_max={loaded.args.hold_max_frames} "
        f"input={loaded.input_mode}"
    )
