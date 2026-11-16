"""Core data objects shared by the streaming application."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np


@dataclass
class LiveSegment:
    id: int
    source_path: Path
    wav_path: Path
    duration: float
    total_frames: int
    global_start_frame: int
    sample_count: int = 0
    sample_rate: int = 16000
    speech_mask: np.ndarray | None = None
    speech_frames: int = 0
    priority: int = 2
    is_resume: bool = False
    origin_id: int | None = None
    created_at: float = 0.0
    analysis_frames: int = 0
    frame_offset: int = 0
    analysis_sample_count: int = 0
    playback_wav_path: Path | None = None
    extra_frames: int = 0
    pause_boundary: bool = False
    # Last segment of an answer (or a whole file). Set after registration
    # once the upstream ends, so readers must re-check it each time.
    is_final: bool = False
    response_id: str | None = None
    response_start_sample: int = 0


@dataclass
class Runtime:
    device: Any
    vae: Any
    unet: Any
    pe: Any
    whisper: Any
    audio_processor: Any
    face_parser: Any
    timesteps: Any
    weight_dtype: Any
    feature_worker: ThreadPoolExecutor = field(default_factory=lambda: ThreadPoolExecutor(
        max_workers=1, thread_name_prefix="avatar-features",
    ))
