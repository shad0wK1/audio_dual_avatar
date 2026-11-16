"""State containers for the streaming server.

The application is split into focused state groups so model, pipeline,
interrupt and viewer logic do not need to share one mutable bag of fields.
"""

from __future__ import annotations

import asyncio
import queue as std_queue
import threading
from argparse import Namespace
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .domain import LiveSegment, Runtime


@dataclass
class ServiceState:
    status: str = "starting"
    error: str | None = None
    ready: bool = False
    accepting_streams: bool = True
    uvicorn_server: Any = None
    ready_time: float = 0.0
    exit_requested: bool = False
    exit_reason: str = ""


@dataclass
class ModelState:
    default_avatar_id: str = ""
    avatar_id: str = ""
    avatar: Any = None
    runtime: Runtime | None = None
    avatar_ready: bool = False
    avatar_switching: bool = False
    avatar_revision: int = 0
    avatar_lock: threading.RLock = field(default_factory=threading.RLock)
    avatar_admission_lock: threading.RLock = field(default_factory=threading.RLock)
    avatar_leases: int = 0
    fps: int = 24
    batch_size: int = 20
    prebuffer: int = 24
    queue_size: int = 96
    width: int = 480
    height: int = 864


@dataclass
class PipelineState:
    answer_queue: std_queue.Queue = field(default_factory=std_queue.Queue)
    resume_queue: std_queue.Queue = field(default_factory=std_queue.Queue)
    normal_queue: std_queue.Queue = field(default_factory=std_queue.Queue)
    segments: dict[int, LiveSegment] = field(default_factory=dict)
    lock: threading.Lock = field(default_factory=threading.Lock)
    next_id: int = 0
    global_frames: int = 0
    ack_frame: int = -1
    media_ack_frame: int = -1
    generated_frames: int = 0
    silent_frames: int = 0
    idle_frames: int = 0
    hold_frames: int = 0
    generating: int = 0
    cancel_segment_id: int | None = None
    canceled_ids: set[int] = field(default_factory=set)
    latest_media_segment_id: int = -1
    latest_media_end_frame: int = -1
    # Upstream-initiated flush (no resume): the live session drops queued
    # frames and tells the viewer to stop playback after flush_frame.
    flush_seq: int = 0
    # Highest flush sequence whose control message has been sent to the
    # viewer. H.264 must not restart its encoder before this catches up,
    # otherwise the new IDR can arrive before the client's decoder reset.
    flush_sent_seq: int = 0
    flush_frame: int = -1


@dataclass
class InterruptState:
    active: bool = False
    deadline: float = 0.0
    source: LiveSegment | None = None
    source_frame: int = 0
    reset_frame: int = -1
    resume_segments: list[LiveSegment] = field(default_factory=list)
    interrupt_count: int = 0
    resume_count: int = 0


@dataclass
class ViewerState:
    stream_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    connected: bool = False
    connect_time: float = 0.0
    playback_started: bool = False
    last_ack_time: float = 0.0


@dataclass
class IngestState:
    audio_dir: Path | None = None
    output_audio_dir: Path | None = None
    seen_keys: set[tuple[str, int, int]] = field(default_factory=set)
    pending: dict[str, tuple[int, float]] = field(default_factory=dict)
    last_audio_seen: float = 0.0


@dataclass
class StreamInputState:
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    connected: bool = False
    last_chunk_at: float = 0.0
    sample_rate: int = 16000
    channels: int = 1
    samples_received: int = 0
    windows_submitted: int = 0
    dropped_samples: int = 0


@dataclass
class AppState:
    args: Namespace | None = None
    service: ServiceState = field(default_factory=ServiceState)
    model: ModelState = field(default_factory=ModelState)
    pipeline: PipelineState = field(default_factory=PipelineState)
    interrupt: InterruptState = field(default_factory=InterruptState)
    viewer: ViewerState = field(default_factory=ViewerState)
    ingest: IngestState = field(default_factory=IngestState)
    stream_input: StreamInputState = field(default_factory=StreamInputState)
