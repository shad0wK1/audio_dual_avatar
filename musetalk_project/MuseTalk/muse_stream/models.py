"""Model, Whisper and avatar loading."""

from __future__ import annotations

import json
from argparse import Namespace
from pathlib import Path
from typing import Any

from .config import ROOT
from .domain import Runtime
from .log import log


_REQUIRED_CACHE_FILES = (
    "latents.pt",
    "coords.pkl",
    "mask_coords.pkl",
    "avator_info.json",
)


def cache_dir_for(avatar_id: str, version: str) -> Path:
    if version == "v15":
        return ROOT / "results" / "v15" / "avatars" / avatar_id
    return ROOT / "results" / "avatars" / avatar_id


def model_paths(args: Namespace) -> tuple[str, str]:
    if args.version == "v15":
        default_model = "./models/musetalkV15/unet.pth"
        default_config = "./models/musetalkV15/musetalk.json"
    else:
        default_model = "./models/musetalk/pytorch_model.bin"
        default_config = "./models/musetalk/musetalk.json"
    return args.unet_model_path or default_model, args.unet_config or default_config


def build_runtime(args: Namespace) -> Runtime:
    import torch
    import cv2
    from transformers import WhisperModel

    from musetalk.utils.audio_processor import AudioProcessor
    from musetalk.utils.face_parsing import FaceParsing
    from musetalk.utils.utils import load_all_model

    torch.set_num_threads(4)
    cv2.setNumThreads(2)
    torch.backends.cudnn.benchmark = False
    torch.cuda.set_device(args.gpu_id)
    device = torch.device(
        f"cuda:{args.gpu_id}" if torch.cuda.is_available() else "cpu"
    )

    unet_model_path, unet_config = model_paths(args)
    log(f"loading models on {device}: {unet_model_path}")
    vae, unet, pe = load_all_model(
        unet_model_path=unet_model_path,
        vae_type=args.vae_type,
        unet_config=unet_config,
        device=device,
    )

    pe = pe.half().to(device)
    vae.vae = vae.vae.half().to(device)
    unet.model = unet.model.half().to(device)
    weight_dtype = unet.model.dtype

    log("loading whisper")
    whisper = WhisperModel.from_pretrained(args.whisper_dir)
    whisper = whisper.to(device=device, dtype=weight_dtype).eval()
    whisper.requires_grad_(False)

    log("loading audio processor and face parser")
    audio_processor = AudioProcessor(feature_extractor_path=args.whisper_dir)
    face_parser = FaceParsing(
        left_cheek_width=args.left_cheek_width,
        right_cheek_width=args.right_cheek_width,
    )
    timesteps = torch.tensor([0], device=device)

    runtime = Runtime(
        device=device,
        vae=vae,
        unet=unet,
        pe=pe,
        whisper=whisper,
        audio_processor=audio_processor,
        face_parser=face_parser,
        timesteps=timesteps,
        weight_dtype=weight_dtype,
    )
    warmup(runtime, args.batch_size)
    return runtime


def warmup(runtime: Runtime, batch_size: int) -> None:
    """Warm up CUDA kernels so the first streamed batch is not delayed."""
    import torch
    import tempfile
    import wave

    log(f"warming up UNet / VAE / Whisper (batch={batch_size})")
    with torch.no_grad():
        latents = torch.zeros(
            (batch_size, 8, 32, 32),
            device=runtime.device,
            dtype=runtime.weight_dtype,
        )
        audio = torch.zeros(
            (batch_size, 50, 384),
            device=runtime.device,
            dtype=runtime.weight_dtype,
        )
        audio = runtime.pe(audio)
        pred = runtime.unet.model(
            latents, runtime.timesteps, encoder_hidden_states=audio
        ).sample
        runtime.vae.decode_latents(pred)

        mel = torch.zeros(
            (1, 80, 3000), device=runtime.device, dtype=runtime.weight_dtype
        )
        runtime.whisper.encoder(mel, output_hidden_states=True)

        # Exercise the file/CPU extractor too; warming only a synthetic mel
        # leaves its first real reply paying library initialization costs.
        with tempfile.TemporaryDirectory(prefix="avatar-audio-warmup-") as folder:
            wav_path = str(Path(folder) / "silence.wav")
            with wave.open(wav_path, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(16000)
                wav.writeframes(bytes(32000))
            runtime.audio_processor.get_audio_feature(
                wav_path, weight_dtype=runtime.weight_dtype,
            )

    if torch.cuda.is_available():
        torch.cuda.synchronize(runtime.device)


def build_avatar(
    args: Namespace,
    runtime: Runtime,
    avatar_id: str,
) -> Any:
    _configure_avatar_runtime(args, runtime)

    video_path = args.video_path
    bbox_shift = 0 if args.version == "v15" else int(args.bbox_shift)

    cache_dir = cache_dir_for(avatar_id, args.version)
    cache_valid = all(
        (cache_dir / name).exists() for name in _REQUIRED_CACHE_FILES
    )
    if cache_dir.exists() and not cache_valid:
        missing = [
            name
            for name in _REQUIRED_CACHE_FILES
            if not (cache_dir / name).exists()
        ]
        raise RuntimeError(
            f"Incomplete avatar cache at {cache_dir}; missing {missing}. "
            "Remove that directory or use another avatar id."
        )

    prep_value = args.preparation
    if isinstance(prep_value, bool):
        prep_mode = "auto" if prep_value else "reuse"
    else:
        prep_mode = str(prep_value).lower()
    if prep_mode in ("auto", "true", "1", "yes"):
        preparation = not cache_valid
    elif prep_mode in ("reuse", "false", "0", "no"):
        if not cache_valid:
            raise RuntimeError(
                f"avatar.preparation=reuse but no complete cache exists at "
                f"{cache_dir}"
            )
        preparation = False
    else:
        raise ValueError("avatar.preparation must be auto/reuse (or true/false)")

    log(f"avatar cache: {cache_dir} (preparation={preparation})")
    return _instantiate_avatar(
        args,
        avatar_id=avatar_id,
        video_path=video_path,
        bbox_shift=bbox_shift,
        preparation=preparation,
    )


def load_cached_avatar(
    args: Namespace,
    runtime: Runtime,
    avatar_id: str,
) -> Any:
    """Load an existing avatar cache without accessing its source video."""
    _configure_avatar_runtime(args, runtime)
    cache_dir = cache_dir_for(avatar_id, args.version)
    missing = [
        name
        for name in _REQUIRED_CACHE_FILES
        if not (cache_dir / name).is_file()
        or (cache_dir / name).stat().st_size == 0
    ]
    if missing:
        raise FileNotFoundError(
            f"Incomplete avatar cache at {cache_dir}; missing {missing}"
        )

    with open(cache_dir / "avator_info.json", "r", encoding="utf-8") as stream:
        avatar_info = json.load(stream)
    video_path = str(avatar_info.get("video_path", ""))
    bbox_shift = 0 if args.version == "v15" else int(args.bbox_shift)
    log(f"loading cached avatar: {cache_dir}")
    return _instantiate_avatar(
        args,
        avatar_id=avatar_id,
        video_path=video_path,
        bbox_shift=bbox_shift,
        preparation=False,
    )


def _configure_avatar_runtime(args: Namespace, runtime: Runtime) -> None:
    import scripts.realtime_inference as rt

    # Avatar.prepare_material() uses these module-level dependencies in the
    # standalone realtime script. Inject the already-loaded streaming runtime
    # instead of loading a second set of models.
    rt.vae = runtime.vae
    rt.args = Namespace(
        version=args.version,
        extra_margin=args.extra_margin,
        parsing_mode=args.parsing_mode,
        fps=args.fps,
        batch_size=args.batch_size,
        audio_padding_length_left=args.audio_padding_length_left,
        audio_padding_length_right=args.audio_padding_length_right,
        skip_save_images=True,
    )
    rt.fp = runtime.face_parser


def _instantiate_avatar(
    args: Namespace,
    *,
    avatar_id: str,
    video_path: str,
    bbox_shift: int,
    preparation: bool,
) -> Any:
    import scripts.realtime_inference as rt

    return rt.Avatar(
        avatar_id=avatar_id,
        video_path=video_path,
        bbox_shift=bbox_shift,
        batch_size=args.batch_size,
        preparation=preparation,
    )
