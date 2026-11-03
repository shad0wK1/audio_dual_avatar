# audio_dual_avatar

Based on MuseTalk and MiniCPM.

Full-duplex digital human: [MiniCPM-o 4.5](https://huggingface.co/openbmb/MiniCPM-o-4_5) listens and speaks in real time, and [MuseTalk](https://github.com/TMElyralab/MuseTalk) renders a lip-synced avatar from its streaming voice output.

This repository contains code only. Model weights (~23 GB) are downloaded by `install.sh`.

## Requirements

- Linux x86_64, NVIDIA GPU with a CUDA 12.8 driver and ~45 GB free VRAM on GPU 0
- Python 3.10 (or `uv`, which can provide it), `curl`, `openssl`
- ~35 GB free disk; access to a Python package index and Hugging Face (or a mirror)

## Install and run

```bash
./install.sh          # venv + pinned packages, ffmpeg, TLS cert, weights + sha256 check
                      # options: --hf-mirror --skip-env --skip-weights --no-verify
./start_avatar.sh     # then open https://<host>:8006/avatar
./start_avatar.sh stop
```

### Default 720p knowledge-sharing avatar

`./start_avatar.sh` now starts the 720p knowledge-sharing avatar by default.
The original `musetalk_test_avatar` configuration and cache remain available as
a fallback.

```bash
# Build the separate avatar cache once with the mmpose-capable venv.
cd musetalk_project/MuseTalk
CUDA_VISIBLE_DEVICES=2 PYTHONPATH=. PATH="../../minicpm_demo/.bin:$PATH" \
  ../venv/bin/python scripts/realtime_inference.py \
  --version v15 --gpu_id 0 \
  --unet_config ./models/musetalkV15/musetalk.json \
  --unet_model_path ./models/musetalkV15/unet.pth \
  --whisper_dir ./models/whisper \
  --inference_config configs/inference/prepare_knowledge_host.yaml \
  --parsing_mode jaw --left_cheek_width 90 --right_cheek_width 90

# Start the full stack with the new default avatar.
cd ../..
./start_avatar.sh start

# Start with the original avatar cache as a fallback.
MUSETALK_CONFIG=configs/streaming_duplex.yaml ./start_avatar.sh start
```

The cache is generated under
`musetalk_project/MuseTalk/results/v15/avatars/knowledge_host_720p/`.

### Select a preprocessed avatar through the API

The gateway can switch between complete local avatar caches before a live
session starts. With no `avatar_id`, the cache configured by
`configs/streaming_duplex_knowledge.yaml` remains the default.

```bash
# List complete and invalid local caches.
curl -k https://127.0.0.1:8006/avatar-live/api/avatars

# Select the bundled fallback avatar.
curl -k -X POST https://127.0.0.1:8006/avatar-live/api/avatar/select \
  -H 'Content-Type: application/json' \
  -d '{"avatar_id":"musetalk_test_avatar"}'

# Restore the config default.
curl -k -X POST https://127.0.0.1:8006/avatar-live/api/avatar/select \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Call the selection endpoint before connecting `/avatar-live/ws/live`. Switching
is rejected while a viewer, audio upstream or active inference task exists.
Error responses include `detail.code` and `detail.message`; current codes are
`avatar_not_found`, `avatar_invalid`, `avatar_busy`, `avatar_switching`,
`avatar_unavailable` and `avatar_activation_failed`.

`/avatar` also uses its own default voice reference from
`assets/ref_audio/ref_avatar_default.wav`, configured as
`audio.avatar_ref_audio_path`. The `/omni` page and its presets continue to use
the original global `audio.ref_audio_path`.

### H.264 avatar stream

The live viewer now defaults to H.264 Annex-B encoded by ffmpeg/libx264. The
browser decodes it with WebCodecs and the existing audio-master clock still
drives Canvas rendering:

```text
ws://<host>:8000/ws/live?video_codec=h264
```

The gateway forwards the same query:

```text
wss://<host>:8006/avatar-live/ws/live?video_codec=h264
```

Clients without `VideoDecoder` support can request the previous image path with
`video_codec=webp`. The built-in MuseTalk debug viewer and headless viewer
explicitly use WebP. H.264 defaults are `2M` target / `3M` maximum bitrate and
an IDR every 120 frames; `flush` restarts the encoder to force an immediate
IDR. These can be adjusted with the `AVATAR_H264_*`
variables in `.avatar-env`. See
[PLATFORM_INTEGRATION_GUIDE.md](PLATFORM_INTEGRATION_GUIDE.md) for the `MTH1`
packet contract and WebCodecs recovery rules. `install.sh` verifies that the
configured ffmpeg build provides `libx264`.

## Layout

- `minicpm_demo/` — MiniCPM-o 4.5 full-duplex demo (gateway, worker, backend, web UI) with the avatar bridge and the `/avatar` page
- `musetalk_project/MuseTalk/` — streaming MuseTalk server (`muse_stream/`) with the `/ws/minicpm` input
- `install.sh`, `start_avatar.sh` — one-click setup and launcher
- `requirements-avatar.lock.txt`, `weights.sha256` — pinned packages and weight checksums

Design notes, scheduling, bridge and frontend details (Chinese): [DIGITAL_HUMAN_INTEGRATION.md](DIGITAL_HUMAN_INTEGRATION.md).

Platform integration and API handoff guide (Chinese): [PLATFORM_INTEGRATION_GUIDE.md](PLATFORM_INTEGRATION_GUIDE.md).


### Stable crop cache for the knowledge-sharing avatar

The current deployment uses `knowledge_host_720p_stable_v1` with the same
768 x 1344 source images, smoothed crop boxes and matching regenerated VAE
references/masks. The original `knowledge_host_720p` cache is retained.
After preparing the original cache, rebuild the stable cache once with:

```bash
CUDA_VISIBLE_DEVICES=2 .venv/bin/python musetalk_project/MuseTalk/scripts/prepare_stable_cache.py
```

The streaming preset uses centered audio features and
`inference.face_stability_strength: 0.22` (0 disables the causal lower-face
stabilizer). H.264 transport, microphone capture and interruption remain enabled.


### 连续语音播放与推理延迟

数字人播放器在句首保留 300 ms 音频缓冲，连续分段按实际音频采样长度无缝排程；续段仅等待 2 帧视频。待播语音未结束时显示“语音缓冲中”，结束会话会清除旧回复尾段。MuseTalk 当前使用 batch_size=28，使用 veryfast H.264 编码，并在人物素材准备结束后关闭 cuDNN benchmark、重新预热。原生 768×1344 H.264、人物稳定缓存和插话逻辑继续使用。

并行任务同时占用同一张 GPU 时仍可能发生推理延迟；这类延迟无法由传输缓冲完全消除。回归检查：`PYTHONPATH=musetalk_project/MuseTalk .venv/bin/python -m pytest -q musetalk_project/MuseTalk/tests minicpm_demo/tests/test_avatar_entry.py`；浏览器排程回归：`node minicpm_demo/tests/test_avatar_scheduling.mjs`。


### 视频缓冲自动恢复

打断时按播放批次过滤队列，保留新批次已经生成的关键帧。音频已经到达、对应视频连续 1.5 秒没有进展时，前端请求服务端重放待播区间需要的关键帧和后续帧，恢复解码后继续排程待播语音；恢复过程保留对话和麦克风。重放按批次隔离、限频并限制缓存大小。可运行 `node minicpm_demo/tests/test_avatar_video_recovery.mjs` 检查恢复条件和语音保留逻辑。
