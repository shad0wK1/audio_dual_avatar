"""Prepare source-frame GPEN alignment; run in the isolated detector environment."""
import argparse
import hashlib
from pathlib import Path
import pickle
import sys

import cv2
import numpy as np
import torch
from facexlib.detection import init_detection_model

MUSE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(MUSE))
from muse_stream.inference.restoration import source_signature


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--avatars", nargs="+", required=True)
    parser.add_argument("--device", default="cuda:0")
    parser.add_argument("--model-root", type=Path, default=MUSE / "models/gpen/alignment")
    parser.add_argument("--cache-root", type=Path, default=MUSE / "results/v15/avatars")
    options = parser.parse_args()
    torch.set_num_threads(4)
    detector = init_detection_model(
        "retinaface_resnet50", device=torch.device(options.device),
        model_rootpath=str(options.model_root),
    )
    template = np.array([
        [30.29459953, 51.69630051], [65.53179932, 51.50139999],
        [48.02519989, 71.73660278], [33.54930115, 92.3655014],
        [62.72990036, 92.20410156],
    ])
    template = ((template + [8, 0] + [28, 28]) * (512 / 168)).astype(np.float32)
    for avatar_id in options.avatars:
        if Path(avatar_id).name != avatar_id:
            raise ValueError("Expected avatar ID, not a path")
        cache = options.cache_root / avatar_id
        with (cache / "coords.pkl").open("rb") as stream:
            coordinates = pickle.load(stream)
        signature = source_signature(cache)
        matrices = []
        seen = {}
        for index, bbox in enumerate(coordinates):
            if tuple(bbox) == (0, 0, 0, 0):
                matrices.append(np.eye(2, 3))
                continue
            path = cache / "full_imgs" / f"{index:08d}.png"
            encoded = path.read_bytes()
            key = (hashlib.sha256(encoded).digest(), tuple(bbox))
            if key in seen:
                matrices.append(seen[key])
                continue
            image = cv2.imdecode(np.frombuffer(encoded, np.uint8), cv2.IMREAD_COLOR)
            x1, y1, x2, y2 = map(int, bbox)
            if image is None or not (0 <= x1 < x2 <= image.shape[1] and
                                     0 <= y1 < y2 <= image.shape[0]):
                raise ValueError(f"{avatar_id} frame {index}: invalid cached image or crop")
            crop = cv2.resize(image[y1:y2, x1:x2], (256, 256))
            with torch.inference_mode():
                faces = detector.detect_faces(crop, 0.97)
            faces = [face for face in faces if np.linalg.norm(face[5:7] - face[7:9]) >= 5]
            if not faces:
                raise RuntimeError(f"{avatar_id} frame {index}: no face detected")
            center = np.array([128.0, 128.0])
            face = min(faces, key=lambda item: np.linalg.norm((item[:2] + item[2:4]) / 2 - center))
            landmarks = face[5:15].astype(np.float32).reshape(5, 2)
            matrix, _ = cv2.estimateAffinePartial2D(
                landmarks, template, method=cv2.LMEDS)
            if matrix is None or not np.isfinite(matrix).all():
                raise RuntimeError(f"{avatar_id} frame {index}: invalid alignment")
            seen[key] = matrix
            matrices.append(matrix)
            if (index + 1) % 100 == 0:
                print(avatar_id, index + 1, "/", len(coordinates), flush=True)
        if signature != source_signature(cache):
            raise RuntimeError(f"{avatar_id} changed during alignment preparation")
        temporary = cache / "gpen_alignment.tmp.npz"
        inverse_matrices = np.asarray(
            [cv2.invertAffineTransform(matrix) for matrix in matrices],
            np.float64,
        )
        np.savez_compressed(
            temporary, matrices=np.asarray(matrices, np.float64),
            inverse_matrices=inverse_matrices,
            signature=signature, face_size=256, version=2,
            template="GPEN-BFR-512", unique_detections=len(seen))
        temporary.replace(cache / "gpen_alignment.npz")
        print("READY", avatar_id, len(matrices), "frames",
              len(seen), "unique detections", flush=True)


if __name__ == "__main__":
    main()
