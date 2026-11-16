"""Build a v15 avatar cache using the server's landmark and CUDA environments."""
import argparse
import json
import os
import pickle
import sys
from pathlib import Path

import cv2
import torch

MUSE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MUSE))


def landmarks(cache):
    # The CPU MMPose install imports face_detection as a top-level module.
    sys.path.insert(0, str(MUSE / "musetalk" / "utils"))
    from musetalk.utils.preprocessing import get_landmark_and_bbox

    paths = sorted((cache / "full_imgs").glob("*.png"))
    if not paths:
        raise ValueError("No video frames were decoded")
    coords = []
    for start in range(0, len(paths), 24):
        batch = paths[start:start + 24]
        boxes, _ = get_landmark_and_bbox([str(path) for path in batch], 0)
        if len(boxes) != len(batch):
            raise ValueError(f"Missing face coordinates in batch starting at {start}")
        for path, box in zip(batch, boxes):
            x1, y1, x2, y2 = map(int, box)
            if not (0 <= x1 < x2 and 0 <= y1 < y2):
                raise ValueError(f"Could not detect a face in {path.name}")
            coords.append((x1, y1, x2, y2))
    with (cache / "coords.pkl").open("wb") as stream:
        pickle.dump(coords, stream)


def encode(cache, avatar_id):
    from musetalk.models.vae import VAE
    from musetalk.utils.blending import get_image_prepare_material
    from musetalk.utils.face_parsing import FaceParsing

    if not torch.cuda.is_available():
        raise RuntimeError("A CUDA-enabled runtime is required to encode the avatar")
    with (cache / "coords.pkl").open("rb") as stream:
        boxes = pickle.load(stream)
    vae = VAE(model_path="./models/sd-vae", use_float16=False)
    parser = FaceParsing(left_cheek_width=90, right_cheek_width=90)
    coords, masks, latents = [], [], []
    with torch.inference_mode():
        for i, (x1, y1, x2, y2) in enumerate(boxes):
            name = f"{i:08d}.png"
            frame = cv2.imread(str(cache / "full_imgs" / name))
            h, w = frame.shape[:2]
            x2, y2 = min(w, x2), min(h, y2 + 10)
            box = [x1, y1, x2, y2]
            crop = cv2.resize(frame[y1:y2, x1:x2], (256, 256), interpolation=cv2.INTER_LANCZOS4)
            latent = vae.get_latents_for_unet(crop).half().cpu()
            if not torch.isfinite(latent).all():
                raise ValueError(f"Invalid face latent in frame {i}")
            mask, mask_box = get_image_prepare_material(frame, box, fp=parser, mode="jaw")
            if not mask.any() or not cv2.imwrite(str(cache / "mask" / name), mask):
                raise ValueError(f"Cannot generate face mask for frame {i}")
            coords.append(box)
            masks.append(mask_box)
            latents.append(latent)
            mirror = f"{2 * len(boxes) - i - 1:08d}.png"
            for folder in (cache / "full_imgs", cache / "mask"):
                os.link(folder / name, folder / mirror)
    for filename, sequence in (("coords.pkl", coords), ("mask_coords.pkl", masks)):
        with (cache / filename).open("wb") as stream:
            pickle.dump(sequence + sequence[::-1], stream)
    torch.save(latents + latents[::-1], cache / "latents.pt")
    info = {"avatar_id": avatar_id, "video_path": f"data/video/{avatar_id}.mp4",
            "bbox_shift": 0, "version": "v15"}
    (cache / "avator_info.json").write_text(json.dumps(info), encoding="utf-8")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("stage", choices=("landmarks", "encode"))
    cli.add_argument("cache", type=Path)
    cli.add_argument("avatar_id")
    args = cli.parse_args()
    cache = args.cache.resolve()
    os.chdir(MUSE)
    torch.set_num_threads(8)
    cv2.setNumThreads(1)
    if args.stage == "landmarks":
        landmarks(cache)
    else:
        encode(cache, args.avatar_id)

