"""Optional, resident GPEN restoration before source-frame compositing.

No optional detector, compiler, or restoration dependency is imported when off.
Source alignment is prepared offline; the live path never detects landmarks.
"""
from __future__ import annotations

import hashlib
from contextlib import nullcontext
import os
from pathlib import Path
import threading
import time

import cv2
import numpy as np

from ..log import log

ROOT = Path(__file__).resolve().parents[2]
GPEN_SHA256 = "f1002c41add95b0decad69604d80455576f7187dd99ca16bd611bcfd44c10b51"


def source_signature(cache: Path) -> str:
    """Invalidate alignment if coordinates or any source-frame file changes."""
    digest = hashlib.sha256((cache / "coords.pkl").read_bytes())
    paths = sorted(path for path in (cache / "full_imgs").iterdir()
                   if path.suffix.lower() in (".png", ".jpg", ".jpeg"))
    if not paths:
        raise ValueError(f"No source frames in {cache}")
    for path in paths:
        stat = path.stat()
        digest.update(f"{path.name}:{stat.st_size}:{stat.st_mtime_ns}\n".encode())
    return digest.hexdigest()


def load_alignment_cache(
    cache: Path, count: int, include_inverse: bool = False
) -> np.ndarray | tuple[np.ndarray, np.ndarray]:
    path = cache / "gpen_alignment.npz"
    if not path.is_file():
        raise FileNotFoundError(
            f"Missing GPEN alignment: {path}. Run musetalk_project/MuseTalk/muse_stream/inference/gpen/prepare_alignment.py.")
    with np.load(path, allow_pickle=False) as data:
        if int(data["version"]) != 2 or int(data["face_size"]) != 256:
            raise ValueError(f"Unsupported GPEN alignment format: {path}")
        if str(data["signature"].item()) != source_signature(cache):
            raise ValueError(f"GPEN alignment is stale: {path}; prepare it again")
        matrices = np.array(data["matrices"], dtype=np.float64, copy=True)
        inverse = np.array(data["inverse_matrices"], dtype=np.float64, copy=True)
    if matrices.shape != (count, 2, 3):
        raise ValueError(f"GPEN alignment count/shape mismatch: {matrices.shape}, expected {(count, 2, 3)}")
    if inverse.shape != (count, 2, 3):
        raise ValueError(
            f"GPEN inverse alignment count/shape mismatch: {inverse.shape}, "
            f"expected {(count, 2, 3)}"
        )
    if not np.isfinite(matrices).all():
        raise ValueError(f"GPEN alignment must be finite: {path}")
    if not np.isfinite(inverse).all():
        raise ValueError(f"GPEN inverse alignment must be finite: {path}")
    if np.any(np.abs(np.linalg.det(matrices[:, :, :2])) < 1e-8):
        raise ValueError(f"Singular GPEN alignment: {path}")
    matrices.setflags(write=False)
    inverse.setflags(write=False)
    return (matrices, inverse) if include_inverse else matrices


def attach_avatar_restoration(avatar, runtime, cache: Path):
    if getattr(runtime, "face_restorer", None) is not None:
        (
            avatar.restoration_matrices,
            avatar.restoration_inverse_matrices,
        ) = load_alignment_cache(
            cache, len(avatar.coord_list_cycle), include_inverse=True)
        log(f"GPEN alignment loaded: {len(avatar.restoration_matrices)} frames")
    return avatar


def gpen_enabled():
    mode = os.environ.get("MUSETALK_FACE_RESTORATION", "off").strip().lower()
    if mode not in ("off", "gpen"):
        raise ValueError("MUSETALK_FACE_RESTORATION must be off or gpen")
    return mode == "gpen"


def build_face_restorer(default_device):
    if not gpen_enabled():
        return None
    execution = os.environ.get("MUSETALK_GPEN_EXECUTION", "process").strip().lower()
    if execution not in ("process", "thread"):
        raise ValueError("MUSETALK_GPEN_EXECUTION must be process or thread")
    path = Path(os.environ.get(
        "MUSETALK_GPEN_WEIGHTS", str(ROOT / "models/gpen/GPEN-BFR-512.pth")))
    if not path.is_absolute():
        path = ROOT / path
    if not path.is_file():
        raise FileNotFoundError(f"Missing GPEN weights: {path}")
    if hashlib.sha256(path.read_bytes()).hexdigest() != GPEN_SHA256:
        raise ValueError(f"GPEN-BFR-512 weight checksum mismatch: {path}")
    device = os.environ.get("MUSETALK_GPEN_DEVICE", str(default_device))
    if execution == "process":
        from .gpen_process import GPENProcessRestorer
        return GPENProcessRestorer(path, device)
    return GPENRestorer(path, device)


class GPENFaceProcessor:
    """CPU image operations shared by the local and process-backed restorers."""

    def __init__(self):
        support = np.zeros((512, 512), np.float32)
        support[20:492, 20:492] = 1
        self.support = cv2.GaussianBlur(support, (41, 41), 8)
        self.last_finalize_ms = 0.

    def restore(
        self, face: np.ndarray, matrix: np.ndarray, inverse: np.ndarray | None = None,
    ) -> np.ndarray:
        aligned, inverse = self.prepare(face, matrix, inverse)
        restored = self.infer_aligned(aligned)
        return self.finalize(restored, face, inverse)

    def prepare(
        self,
        face: np.ndarray,
        matrix: np.ndarray,
        inverse: np.ndarray | None = None,
    ):
        """Align a MuseTalk crop to the GPEN input template."""
        if face.shape != (256, 256, 3) or face.dtype != np.uint8:
            raise ValueError(f"GPEN expects uint8 BGR 256x256, got {face.shape}/{face.dtype}")
        if inverse is None:
            inverse = cv2.invertAffineTransform(matrix)
        return (
            cv2.warpAffine(
                face, matrix, (512, 512), flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT_101),
            inverse,
        )

    def finalize(self, restored: np.ndarray, face: np.ndarray, inverse: np.ndarray) -> np.ndarray:
        """Run the output-side inverse warp and original-face support blend."""
        started = time.perf_counter()
        restored = cv2.warpAffine(
            restored, inverse, (256, 256), flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REFLECT_101)
        alpha = cv2.warpAffine(
            self.support, inverse, (256, 256),
            flags=cv2.INTER_LINEAR)[..., None]
        result = np.clip(restored.astype(np.float32) * alpha +
                         face * (1-alpha), 0, 255).astype(np.uint8)
        self.last_finalize_ms = (time.perf_counter() - started) * 1000
        return result


class GPENRestorer(GPENFaceProcessor):
    def __init__(self, path: Path, device: str):
        import torch
        from .gpen import ops
        from .gpen.architecture import FullGenerator

        super().__init__()
        self.device = torch.device(device)
        self.operators = os.environ.get(
            "MUSETALK_GPEN_OPS", "cuda" if self.device.type == "cuda" else "native")
        if self.operators == "cuda" and self.device.type != "cuda":
            raise ValueError("GPEN CUDA operators require a CUDA device")
        os.environ.setdefault("MAX_JOBS", "4")
        os.environ.setdefault("TORCH_EXTENSIONS_DIR",
                              str(ROOT / "models/gpen/extensions"))
        if self.device.type == "cuda":
            capability = torch.cuda.get_device_capability(self.device)
            os.environ.setdefault("TORCH_CUDA_ARCH_LIST",
                                  f"{capability[0]}.{capability[1]}")
        ops.configure(self.operators)
        self._lock = threading.Lock()
        self.frames = 0
        self.total_ms = 0.
        self.last_ms = 0.
        # Operator selection is explicit in ops.configure, independent of
        # the upstream architecture's legacy device flag.
        self.model = FullGenerator(
            512, 512, 8, channel_multiplier=2, narrow=1, device="cpu")
        self.model.load_state_dict(torch.load(
            path, map_location="cpu", weights_only=True), strict=True)
        self.model = self.model.eval().requires_grad_(False).to(self.device)
        self.stream = (torch.cuda.Stream(device=self.device)
                       if self.device.type == "cuda" else None)
        if self.stream is not None:
            self.stream.wait_stream(torch.cuda.current_stream(self.device))
        context = torch.cuda.stream(self.stream) if self.stream is not None else nullcontext()
        device_context = torch.cuda.device(self.device) if self.stream is not None else nullcontext()
        with torch.inference_mode(), device_context, context:
            self.model(torch.zeros((1, 3, 512, 512), device=self.device))
        if self.stream is not None:
            self.stream.synchronize()
        log(f"GPEN-BFR-512 ready: device={self.device}, fp32, {self.operators} ops, dedicated stream")

    def infer_aligned(self, aligned: np.ndarray) -> np.ndarray:
        """Run only the model and the GPU/CPU boundary on an aligned face."""
        import torch
        if aligned.shape != (512, 512, 3) or aligned.dtype != np.uint8:
            raise ValueError(f"GPEN expects uint8 BGR 512x512, got {aligned.shape}/{aligned.dtype}")
        context = torch.cuda.stream(self.stream) if self.stream is not None else nullcontext()
        device_context = torch.cuda.device(self.device) if self.stream is not None else nullcontext()
        started = time.perf_counter()
        with self._lock, torch.inference_mode(), device_context, context:
            tensor = torch.from_numpy(aligned).to(self.device).float() / 255.
            tensor = (tensor.permute(2, 0, 1).unsqueeze(0).flip(1) - .5) / .5
            output, _ = self.model(tensor)
            if not torch.isfinite(output).all():
                raise RuntimeError("GPEN returned nonfinite values")
            image = ((output * .5 + .5).squeeze(0).permute(1, 2, 0)
                     .flip(2).float().cpu().numpy())
            result = (np.clip(image, 0, 1) * 255).astype(np.uint8)
            self.last_ms = (time.perf_counter() - started) * 1000
            self.total_ms += self.last_ms
            self.frames += 1
            if self.frames % 120 == 0:
                log(f"GPEN restored {self.frames} frames: mean={self.total_ms/self.frames:.1f}ms last={self.last_ms:.1f}ms")
            return result

    def status(self):
        return {
            "mode": "gpen", "execution": "thread",
            "device": str(self.device), "frames": self.frames,
            "operators": self.operators,
            "mean_ms": round(self.total_ms / max(1, self.frames), 2),
            "last_ms": round(self.last_ms, 2),
            "last_finalize_ms": round(self.last_finalize_ms, 2),
        }
