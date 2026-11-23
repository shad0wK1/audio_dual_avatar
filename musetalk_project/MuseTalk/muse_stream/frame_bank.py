"""Reusable decoded BGR frames for MuseTalk's preprocessed avatars.

Run python -m muse_stream.frame_bank AVATAR_DIR ... from the MuseTalk root.
The OS shares clean mapped pages across renderer lifetimes and may reclaim them.
"""
from pathlib import Path
import hashlib
import json
import math
import mmap
import os
import struct
import tempfile

import cv2
import numpy as np

from .inference.restoration import gpen_enabled


def signature(paths):
    result = ["gpen-v2"] if gpen_enabled() else []
    for path in paths:
        st = path.stat()
        result.append((path.name, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns))
    return hashlib.sha256(json.dumps(result).encode()).hexdigest()


def bank_path(folder):
    prefix = ".bgr-gpen-v2-" if gpen_enabled() else ".bgr-v1-"
    return folder.parent / (prefix + folder.name)


def build(folder):
    paths = sorted(folder.glob("*.[jpJP][pnPN]*[gG]"), key=lambda p: int(p.stem))
    if not paths:
        raise ValueError(f"No images in {folder}")
    before = signature(paths)
    entries, seen = [], {}
    with tempfile.NamedTemporaryFile(dir=folder.parent, delete=False) as out:
        tmp = Path(out.name)
    try:
        with tmp.open("wb") as out:
            for path in paths:
                encoded = path.read_bytes()
                digest = hashlib.sha256(encoded).digest()
                if digest not in seen:
                    frame = cv2.imdecode(np.frombuffer(encoded, np.uint8), cv2.IMREAD_COLOR)
                    if frame is None:
                        raise ValueError(f"Invalid image: {path}")
                    seen[digest] = (out.tell(), frame.shape)
                    out.write(memoryview(frame).cast("B"))
                entries.append(seen[digest])
            meta = json.dumps([before, entries]).encode()
            out.write(meta)
            out.write(struct.pack("<Q", len(meta)))
        if before != signature(paths):
            raise ValueError(f"Images changed during build: {folder}")
        os.replace(tmp, bank_path(folder))
        print(folder, len(entries), "frames,", bank_path(folder).stat().st_size, "bytes", flush=True)
    finally:
        tmp.unlink(missing_ok=True)


def ram_path(bank):
    runtime_dir = os.getenv("XDG_RUNTIME_DIR")
    if not runtime_dir:
        return None
    namespace = hashlib.sha256(os.fsencode(bank.resolve().parent.parent)).hexdigest()[:16]
    return Path(runtime_dir) / "musetalk-frames" / namespace / bank.parent.name / bank.name


def same_bank(disk, ram):
    return ram is not None and ram.is_file() and (
        ram.stat().st_size, ram.stat().st_mtime_ns
    ) == (disk.st_size, disk.st_mtime_ns)


def warm_ram(bank):
    import shutil

    target = ram_path(bank)
    if target is None:
        return
    disk = bank.stat()
    if same_bank(disk, target):
        return
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    available = next(int(line.split()[1]) * 1024 for line in
                     Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:"))
    # Preserve space for the renderer's UNet initialization on this shared host.
    if available - disk.st_size < 8 * 1024**3 or shutil.disk_usage(target.parent).free < disk.st_size:
        print(f"[stream] using disk-backed cache for {bank}: RAM headroom", flush=True)
        return
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as out:
        tmp = Path(out.name)
    try:
        shutil.copyfile(bank, tmp)
        latest = bank.stat()
        if (latest.st_ino, latest.st_mtime_ns, latest.st_size) != (disk.st_ino, disk.st_mtime_ns, disk.st_size):
            raise ValueError(f"Cache changed during copy: {bank}")
        os.utime(tmp, ns=(disk.st_mtime_ns, disk.st_mtime_ns))
        os.replace(tmp, target)
        print(f"[stream] RAM cache ready: {target} ({disk.st_size} bytes)", flush=True)
    finally:
        tmp.unlink(missing_ok=True)


def read_frames(paths, fallback):
    if not paths:
        return fallback(paths)
    bank = bank_path(Path(paths[0]).parent)
    try:
        ram = ram_path(bank)
        if same_bank(bank.stat(), ram):
            bank = ram
        with bank.open("rb") as stream:
            stream.seek(-8, os.SEEK_END)
            length, = struct.unpack("<Q", stream.read(8))
            if length > 16 * 1024 * 1024:
                raise ValueError("Oversized frame index")
            stream.seek(-8-length, os.SEEK_END)
            end = stream.tell()
            key, entries = json.loads(stream.read(length))
            if len(entries) != len(paths) or key != signature(map(Path, paths)):
                raise ValueError("Source images changed")
            mapped = mmap.mmap(stream.fileno(), 0, access=mmap.ACCESS_READ)
            frames = []
            for offset, shape in entries:
                if len(shape) != 3 or min(shape) <= 0 or shape[2] != 3 or offset < 0 or offset + math.prod(shape) > end:
                    raise ValueError("Invalid frame bounds")
                frames.append(np.ndarray(shape, np.uint8, buffer=mapped, offset=offset))
            print(f"[stream] mapped {len(frames)} images from {bank}", flush=True)
            return frames
    except FileNotFoundError:
        pass
    except (ValueError, TypeError, OSError, OverflowError, struct.error) as exc:
        print(f"[stream] skipping decoded cache {bank}: {exc}", flush=True)
    return fallback(paths)


if __name__ == "__main__":
    import sys
    warm_only = sys.argv[1:2] == ["--warm"]
    for directory in map(Path, sys.argv[2:] if warm_only else sys.argv[1:]):
        for name in ("full_imgs", "mask"):
            if warm_only:
                bank = bank_path(directory / name)
                if bank.is_file():
                    warm_ram(bank)
            else:
                build(directory / name)
