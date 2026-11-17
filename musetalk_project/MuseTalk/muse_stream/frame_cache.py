"""Share decoded preset images between on-demand renderers on the same host."""
import json
import logging
import os
from pathlib import Path
import shutil

import cv2
import numpy as np

logger = logging.getLogger("uvicorn.error")
RESERVE = 4 * 1024**3


def signature(paths):
    result = []
    for path in paths:
        stat = path.stat()
        result.append([path.name, stat.st_size, stat.st_mtime_ns])
    return result


def prepare(directory, avatar_root, presets, stop):
    # Each index is published after all pixels, so a concurrent cold start
    # can always fall back to the original PNGs.
    for avatar in presets:
        for kind in ("full_imgs", "mask"):
            target = directory / avatar / kind
            try:
                paths = sorted((avatar_root / avatar / kind).iterdir(),
                               key=lambda path: int(path.stem))
                if not paths:
                    continue
                before = signature(paths)
                target.mkdir(parents=True)
                shapes = []
                with (target / "pixels").open("wb") as out:
                    for i, path in enumerate(paths):
                        if stop.is_set():
                            return
                        if i % 32 == 0:
                            available = next(int(line.split()[1]) * 1024 for line in
                                             Path("/proc/meminfo").read_text().splitlines()
                                             if line.startswith("MemAvailable:"))
                            if min(available, shutil.disk_usage(directory).free) < RESERVE:
                                raise OSError("insufficient memory for optional frame cache")
                        image = cv2.imread(str(path), cv2.IMREAD_COLOR)
                        if image is None:
                            raise ValueError(f"cannot decode {path.name}")
                        shapes.append(image.shape)
                        out.write(memoryview(image))
                if signature(paths) != before:
                    raise ValueError("source changed during preload")
                pending = target / "index.tmp"
                pending.write_text(json.dumps([before, shapes]))
                pending.replace(target / "index.json")
                logger.info("preloaded %s/%s: %d frames", avatar, kind, len(shapes))
            except (ValueError, OSError) as exc:
                logger.warning("skipped frame preload %s/%s: %s", avatar, kind, exc)
                if target.is_dir():
                    shutil.rmtree(target)


def read_images(files, fallback):
    directory = os.getenv("AVATAR_DECODED_CACHE")
    if directory and files:
        paths = [Path(p) for p in files]
        source = paths[0].parent
        target = Path(directory) / source.parent.name / source.name
        try:
            stored, shapes = json.loads((target / "index.json").read_text())
            if signature(paths) == stored:
                pixels = np.memmap(target / "pixels", mode="c", dtype=np.uint8)
                images = []
                start = 0
                for h, w, c in shapes:
                    end = start + h * w * c
                    images.append(pixels[start:end].reshape(h, w, c))
                    start = end
                return images
        except (OSError, ValueError):
            pass
    return fallback(files)
