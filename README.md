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

数字人播放器在句首保留 300 ms 音频缓冲，连续分段按实际音频采样长度无缝排程；续段仅等待 2 帧视频。待播语音未结束时显示“语音缓冲中”，结束会话会清除旧回复尾段。MuseTalk 当前使用 batch_size=28，并使用 veryfast H.264 编码，并在人物素材准备结束后关闭 cuDNN benchmark、重新预热。原生 768×1344 H.264、人物稳定缓存和插话逻辑继续使用。

并行任务同时占用同一张 GPU 时仍可能发生推理延迟；这类延迟无法由传输缓冲完全消除。回归检查：`PYTHONPATH=musetalk_project/MuseTalk .venv/bin/python -m pytest -q musetalk_project/MuseTalk/tests minicpm_demo/tests/test_avatar_entry.py`；浏览器排程回归：`node minicpm_demo/tests/test_avatar_scheduling.mjs`。

### 通过脚本添加新形象

根目录的 `add_avatar.sh` 会从原始视频生成 MuseTalk 缓存，并把音色、提示词和
形象预设一起写入配置：

```bash
./add_avatar.sh \
  /path/to/new_avatar.mp4 \
  new_avatar \
  /path/to/voice.wav \
  /path/to/prompt.txt
```

也可以复用项目内已有的音色和提示词：

```bash
./add_avatar.sh \
  /path/to/new_avatar.mp4 \
  new_avatar \
  default \
  knowledge_host
```

脚本会自动选择空闲显存最多的 GPU，将视频规范化为 24 FPS、偶数宽高、
H.264/yuv420p，然后生成
`musetalk_project/MuseTalk/results/v15/avatars/<avatar_id>/`，并更新
`minicpm_demo/assets/avatar_presets.yaml` 和 `MANIFEST.sha256`。
新预设会立即出现在 `/avatar` 页面，不需要重启 Gateway 或 MuseTalk。

运行脚本前不需要手动执行 `source .venv/bin/activate`。脚本会自动激活共享
`.venv`；生成视频缓存时会在子进程中切换到 `musetalk_project/venv`，因为只有
该环境安装了预处理所需的 `mmpose/mmcv`。

常用选项：

```bash
# 指定物理 GPU。
./add_avatar.sh --gpu 1 video.mp4 new_avatar voice.wav prompt.txt

# 自定义卡片名称和说明。
./add_avatar.sh --name "讲解员小艾" --description "产品介绍形象" \
  video.mp4 new_avatar voice.wav prompt.txt

# 只检查参数和目标路径，不生成文件。
./add_avatar.sh --dry-run video.mp4 new_avatar voice.wav prompt.txt
```

已有 `AVATAR_ID`、规范化视频或目标资产不会被覆盖。生成失败时，脚本会回滚本次
创建的视频、缓存、音色和提示词。要通过脚本设置启动默认形象，仍需另外修改
`avatar_presets.yaml` 的 `default_preset` 和 MuseTalk 配置中的 `avatar.id`。


[用户形象 API](AVATAR_SESSION_API.md)

## MiniCPM 平台部署

数字人网关使用 8006，平台 BFF 使用 18080。服务器使用的启动脚本和配置在 deploy/platform-start/。在已安装依赖的机器上，从仓库根目录执行：

    MUSETALK_CONFIG="$PWD/deploy/platform-start/local.yaml" bash deploy/platform-start/start_avatar.sh start

已部署的 BFF 源码在 avatar-platform-integration-20261107/example/minimal-platform/，由上级目录的 manage.py 管理。平台网页和账号服务基于 https://github.com/shad0wK1/aigc-platform 的 ebd9c33268d107f5001e5b68bb1f503506e8109e。先取该提交，再将本分支 aigc-platform/ 下的文件按相对路径覆盖到平台工作目录，然后按平台项目的方式安装依赖和构建。systemd 和 Caddy 配置在其 deploy/ 下。Python 环境、账号数据库、会话密钥和 TLS 私钥由部署机器提供。

构建平台网页时设置 NEXT_PUBLIC_AVATAR_EMBED_URL=/digital-human/。
