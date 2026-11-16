"""Asynchronous user-avatar customization jobs."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import shutil
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import UploadFile
import httpx


logger = logging.getLogger("gateway.avatar_customization")

_JOB_ID_RE = re.compile(r"^acj_[a-f0-9]{20}$")
_OWNER_ID_RE = re.compile(r"^[A-Za-z0-9_.:@-]{1,128}$")
_VIDEO_SUFFIXES = {".mp4", ".mov", ".webm", ".m4v"}
_AUDIO_SUFFIXES = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
_STEP_RE = re.compile(r"==>\s*\[(\d)/6\]")
_STEP_PROGRESS = {1: 25, 2: 35, 3: 45, 4: 80, 5: 92, 6: 100}


class AvatarCustomizationError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        code: str = "avatar_customization_error",
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code


@dataclass
class AvatarCustomizationJob:
    id: str
    owner_id: Optional[str]
    status: str
    stage: str
    progress: int
    display_name: str
    description: str
    avatar_id: str
    preset_id: str
    video_name: str
    audio_name: str
    video_path: str
    audio_path: str
    prompt_path: str
    created_at: float
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    error: Optional[str] = None
    log_tail: list[str] | None = None


class AvatarCustomizationService:
    """Persist uploads and run one cache-building job at a time."""

    def __init__(
        self,
        *,
        project_root: str | Path,
        data_root: str | Path,
        max_video_seconds: float = 20.0,
        max_audio_seconds: float = 20.0,
        max_video_bytes: int = 200 * 1024 * 1024,
        max_audio_bytes: int = 20 * 1024 * 1024,
        max_prompt_bytes: int = 64 * 1024,
        min_free_vram_mb: int = 12000,
        gpu_id: str = "",
        avatar_http_url: str = "",
        allow_busy: bool = False,
    ) -> None:
        self.project_root = Path(project_root).resolve()
        self.data_root = Path(data_root).resolve()
        self.jobs_dir = self.data_root / "jobs"
        self.uploads_dir = self.data_root / "uploads"
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.max_video_seconds = max(0.1, float(max_video_seconds))
        self.max_audio_seconds = max(0.1, float(max_audio_seconds))
        self.max_video_bytes = max(1, int(max_video_bytes))
        self.max_audio_bytes = max(1, int(max_audio_bytes))
        self.max_prompt_bytes = max(1, int(max_prompt_bytes))
        self.min_free_vram_mb = max(0, int(min_free_vram_mb))
        self.gpu_id = str(gpu_id or "").strip()
        self.avatar_http_url = str(avatar_http_url or "").rstrip("/")
        self.allow_busy = bool(allow_busy)
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._processes: Dict[str, asyncio.subprocess.Process] = {}
        self._cancelled: set[str] = set()
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._worker_task is not None:
            return
        for job in self._all_jobs():
            if job.status == "queued":
                await self._queue.put(job.id)
            elif job.status in {"processing", "validating"}:
                job.status = "failed"
                job.stage = "interrupted"
                job.error = "Gateway restarted while the job was running"
                job.finished_at = time.time()
                self._write_job(job)
                self._cleanup_uploads(job)
        self._worker_task = asyncio.create_task(
            self._worker_loop(),
            name="avatar-customization-worker",
        )

    async def stop(self) -> None:
        for process in list(self._processes.values()):
            if process.returncode is None:
                process.terminate()
        if self._worker_task is not None:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            self._worker_task = None

    async def create_job(
        self,
        *,
        owner_id: Optional[str],
        video: UploadFile,
        audio: UploadFile,
        prompt: str,
        name: str,
        description: str,
    ) -> AvatarCustomizationJob:
        if owner_id is not None and not _OWNER_ID_RE.fullmatch(owner_id):
            raise AvatarCustomizationError(
                "Invalid avatar owner id",
                code="invalid_owner_id",
            )
        token = uuid.uuid4().hex
        job_id = f"acj_{token[:20]}"
        avatar_id = f"av_{token[:20]}"
        preset_id = f"up_{token[:20]}"
        prompt_text = str(prompt or "").strip()
        display_name = str(name or "").strip()
        if not display_name:
            raise AvatarCustomizationError(
                "name is required",
                code="invalid_name",
            )
        if len(display_name) > 80:
            raise AvatarCustomizationError(
                "name exceeds 80 characters",
                code="invalid_name",
            )
        if not prompt_text:
            raise AvatarCustomizationError(
                "prompt is required",
                code="invalid_prompt",
            )
        if len(prompt_text.encode("utf-8")) > self.max_prompt_bytes:
            raise AvatarCustomizationError(
                f"prompt exceeds {self.max_prompt_bytes} bytes",
                code="invalid_prompt",
            )

        job_upload_dir = self.uploads_dir / job_id
        job_upload_dir.mkdir(parents=True, exist_ok=False)
        video_path = job_upload_dir / f"source{_safe_suffix(video.filename, _VIDEO_SUFFIXES)}"
        audio_path = job_upload_dir / f"voice{_safe_suffix(audio.filename, _AUDIO_SUFFIXES)}"
        prompt_path = job_upload_dir / "prompt.txt"
        try:
            await _save_upload(video, video_path, self.max_video_bytes, "video")
            await _save_upload(audio, audio_path, self.max_audio_bytes, "audio")
            prompt_path.write_text(prompt_text, encoding="utf-8")
            await asyncio.to_thread(
                _validate_media,
                video_path,
                audio_path,
                self.max_video_seconds,
                self.max_audio_seconds,
            )
        except Exception:
            shutil.rmtree(job_upload_dir, ignore_errors=True)
            raise

        now = time.time()
        job = AvatarCustomizationJob(
            id=job_id,
            owner_id=owner_id,
            status="queued",
            stage="queued",
            progress=5,
            display_name=display_name,
            description=str(description or "").strip()[:300],
            avatar_id=avatar_id,
            preset_id=preset_id,
            video_name=Path(video.filename or "video").name,
            audio_name=Path(audio.filename or "audio").name,
            video_path=str(video_path),
            audio_path=str(audio_path),
            prompt_path=str(prompt_path),
            created_at=now,
            log_tail=[],
        )
        async with self._lock:
            self._write_job(job)
        await self._queue.put(job.id)
        logger.info(
            "avatar customization queued: %s owner=%s",
            job.id,
            owner_id,
        )
        return job

    async def get_job(
        self,
        job_id: str,
        owner_id: Optional[str],
    ) -> AvatarCustomizationJob:
        if not _JOB_ID_RE.fullmatch(job_id):
            raise AvatarCustomizationError(
                "Invalid job id",
                status_code=404,
                code="job_not_found",
            )
        job = self._read_job(job_id)
        if job.owner_id and job.owner_id != owner_id:
            raise AvatarCustomizationError(
                "Job not found",
                status_code=404,
                code="job_not_found",
            )
        return job

    @staticmethod
    def public_job(job: AvatarCustomizationJob) -> Dict[str, Any]:
        return {
            "job_id": job.id,
            "status": job.status,
            "stage": job.stage,
            "progress": job.progress,
            "name": job.display_name,
            "description": job.description,
            "avatar_id": job.avatar_id if job.status == "ready" else None,
            "preset_id": job.preset_id if job.status == "ready" else None,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "finished_at": job.finished_at,
            "error": job.error,
        }

    async def cancel_job(
        self,
        job_id: str,
        owner_id: Optional[str],
    ) -> AvatarCustomizationJob:
        await self.get_job(job_id, owner_id)
        async with self._lock:
            job = self._read_job(job_id)
            if job.status not in {"queued", "validating", "processing"}:
                raise AvatarCustomizationError(
                    f"Job cannot be cancelled from {job.status}",
                    status_code=409,
                    code="invalid_job_state",
                )
            self._cancelled.add(job_id)
            process = self._processes.get(job_id)
            job.status = "cancelled"
            job.stage = "cancelled"
            job.progress = min(job.progress, 99)
            job.finished_at = time.time()
            self._write_job(job)
        if process is not None and process.returncode is None:
            process.terminate()
        if process is None:
            self._cleanup_uploads(job)
        return job

    async def _worker_loop(self) -> None:
        while True:
            job_id = await self._queue.get()
            try:
                await self._run_job(job_id)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.exception("avatar customization worker failed: %s", job_id)
                try:
                    job = self._read_job(job_id)
                    if job.status in {"queued", "validating", "processing"}:
                        job.status = "failed"
                        job.stage = "failed"
                        job.finished_at = time.time()
                        job.error = str(exc)
                        self._write_job(job)
                    self._cleanup_uploads(job)
                except Exception:
                    logger.exception("failed to persist avatar job failure: %s", job_id)
            finally:
                self._queue.task_done()

    async def _run_job(self, job_id: str) -> None:
        job = self._read_job(job_id)
        if job.status == "cancelled" or job_id in self._cancelled:
            self._cleanup_uploads(job)
            return
        try:
            await self._ensure_avatar_idle()
        except AvatarCustomizationError as exc:
            job.status = "failed"
            job.stage = "failed"
            job.finished_at = time.time()
            job.error = str(exc)
            self._write_job(job)
            self._cleanup_uploads(job)
            return
        command = [
            str(self.project_root / "add_avatar.sh"),
            "--runtime",
            "--preset-id",
            job.preset_id,
            "--name",
            job.display_name,
            "--description",
            job.description,
            "--visibility",
            "private",
        ]
        if job.owner_id:
            command.extend(["--owner-id", job.owner_id])
        if self.gpu_id:
            command.extend(["--gpu", self.gpu_id])
        command.extend(
            [
                job.video_path,
                job.avatar_id,
                job.audio_path,
                job.prompt_path,
            ]
        )
        env = os.environ.copy()
        env["ADD_AVATAR_MIN_FREE_MB"] = str(self.min_free_vram_mb)
        env["AVATAR_RUNTIME_ROOT"] = str(self.data_root.resolve())
        async with self._lock:
            job = self._read_job(job_id)
            if job.status == "cancelled" or job_id in self._cancelled:
                self._cleanup_uploads(job)
                return
            job.status = "processing"
            job.stage = "validating"
            job.progress = 15
            job.started_at = time.time()
            self._write_job(job)
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=str(self.project_root),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                env=env,
            )
            self._processes[job_id] = process
        assert process.stdout is not None
        tail: list[str] = []
        try:
            async for raw_line in process.stdout:
                line = raw_line.decode("utf-8", errors="replace").rstrip()
                if not line:
                    continue
                tail.append(line[:500])
                tail = tail[-80:]
                match = _STEP_RE.search(line)
                if match and job_id not in self._cancelled:
                    step = int(match.group(1))
                    job.stage = {
                        1: "normalizing_video",
                        2: "preparing_config",
                        3: "generating_cache",
                        4: "validating_cache",
                        5: "publishing_preset",
                        6: "published",
                    }[step]
                    job.progress = _STEP_PROGRESS[step]
                    job.log_tail = list(tail)
                    self._write_job(job)
            return_code = await process.wait()
        finally:
            self._processes.pop(job_id, None)

        if job_id in self._cancelled or job.status == "cancelled":
            self._cleanup_uploads(job)
            return
        job.log_tail = list(tail)
        job.finished_at = time.time()
        if return_code == 0:
            job.status = "ready"
            job.stage = "published"
            job.progress = 100
            job.error = None
            logger.info(
                "avatar customization ready: %s preset=%s",
                job.id,
                job.preset_id,
            )
        else:
            job.status = "failed"
            job.stage = "failed"
            job.error = tail[-1] if tail else f"add_avatar.sh exited {return_code}"
            logger.warning(
                "avatar customization failed: %s exit=%s error=%s",
                job.id,
                return_code,
                job.error,
            )
        self._write_job(job)
        self._cleanup_uploads(job)

    async def _ensure_avatar_idle(self) -> None:
        if self.allow_busy or not self.avatar_http_url:
            return
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.avatar_http_url}/api/status"
                )
                response.raise_for_status()
                status = response.json()
        except Exception as exc:
            raise AvatarCustomizationError(
                f"Cannot verify avatar service state: {exc}",
                status_code=503,
                code="avatar_generation_busy",
            ) from exc
        if (
            status.get("viewer_connected")
            or status.get("stream_connected")
            or int(status.get("generating_segments") or 0) > 0
        ):
            raise AvatarCustomizationError(
                "Digital-human session is active; retry the customization later",
                status_code=409,
                code="avatar_generation_busy",
            )

    @staticmethod
    def _cleanup_uploads(job: AvatarCustomizationJob) -> None:
        upload_dir = Path(job.video_path).parent
        shutil.rmtree(upload_dir, ignore_errors=True)

    def _job_path(self, job_id: str) -> Path:
        return self.jobs_dir / f"{job_id}.json"

    def _write_job(self, job: AvatarCustomizationJob) -> None:
        target = self._job_path(job.id)
        temporary = target.with_name(
            f".{target.name}.{uuid.uuid4().hex}.tmp"
        )
        temporary.write_text(
            json.dumps(asdict(job), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        os.replace(temporary, target)

    def _read_job(self, job_id: str) -> AvatarCustomizationJob:
        path = self._job_path(job_id)
        if not path.is_file():
            raise AvatarCustomizationError(
                "Job not found",
                status_code=404,
                code="job_not_found",
            )
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return AvatarCustomizationJob(**data)
        except Exception as exc:
            raise AvatarCustomizationError(
                f"Failed to read job state: {exc}",
                status_code=500,
                code="job_state_error",
            ) from exc

    def _all_jobs(self) -> list[AvatarCustomizationJob]:
        jobs = []
        for path in self.jobs_dir.glob("acj_*.json"):
            try:
                jobs.append(self._read_job(path.stem))
            except AvatarCustomizationError:
                continue
        jobs.sort(key=lambda item: item.created_at)
        return jobs


async def _save_upload(
    upload: UploadFile,
    destination: Path,
    max_bytes: int,
    label: str,
) -> None:
    total = 0
    try:
        with destination.open("wb") as stream:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise AvatarCustomizationError(
                        f"{label} exceeds {max_bytes} bytes",
                        status_code=413,
                        code=f"{label}_too_large",
                    )
                stream.write(chunk)
        if total == 0:
            raise AvatarCustomizationError(
                f"{label} file is empty",
                code=f"invalid_{label}",
            )
    finally:
        await upload.close()


def _safe_suffix(filename: Optional[str], allowed: set[str]) -> str:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in allowed:
        raise AvatarCustomizationError(
            f"Unsupported media format: {suffix or 'unknown'}",
            code="unsupported_media",
        )
    return suffix


def _validate_media(
    video_path: Path,
    audio_path: Path,
    max_video_seconds: float,
    max_audio_seconds: float,
) -> None:
    import cv2
    import librosa
    import numpy as np

    capture = cv2.VideoCapture(str(video_path))
    try:
        if not capture.isOpened():
            raise AvatarCustomizationError(
                "Video cannot be decoded",
                code="invalid_video",
            )
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
        frames = float(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        duration = frames / fps if fps > 0 else 0
        if fps <= 0 or frames <= 0:
            raise AvatarCustomizationError(
                "Video contains no decodable frames",
                code="invalid_video",
            )
        if duration > max_video_seconds + 0.25:
            raise AvatarCustomizationError(
                f"Video exceeds {max_video_seconds:g} seconds",
                code="video_too_long",
            )
        if width < 128 or height < 128:
            raise AvatarCustomizationError(
                "Video resolution is too small",
                code="invalid_video",
            )
        if width > 1920 or height > 1920:
            raise AvatarCustomizationError(
                "Video resolution exceeds 1920 pixels",
                code="invalid_video",
            )
    finally:
        capture.release()

    try:
        samples, sample_rate = librosa.load(
            str(audio_path),
            sr=16000,
            mono=True,
            duration=max_audio_seconds + 1,
        )
    except Exception as exc:
        raise AvatarCustomizationError(
            f"Audio cannot be decoded: {exc}",
            code="invalid_audio",
        ) from exc
    duration = len(samples) / float(sample_rate or 16000)
    if duration <= 0.25:
        raise AvatarCustomizationError(
            "Audio is too short",
            code="invalid_audio",
        )
    if duration > max_audio_seconds + 0.25:
        raise AvatarCustomizationError(
            f"Audio exceeds {max_audio_seconds:g} seconds",
            code="audio_too_long",
        )
    rms = float(np.sqrt(np.mean(np.square(samples)))) if samples.size else 0.0
    if rms < 0.0005:
        raise AvatarCustomizationError(
            "Audio is silent",
            code="invalid_audio",
        )
