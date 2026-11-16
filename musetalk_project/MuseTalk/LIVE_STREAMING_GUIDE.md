# MuseTalk 数字人直播前端：说明与变更记录

> 日常启动请优先阅读精简版
> [STREAMING_QUICKSTART.md](STREAMING_QUICKSTART.md)。本文保留完整设计、
> 历史协议和变更记录。
>
> 文档创建日期：2026-10-22
>
> 维护约定：**后续对这个直播功能的任何代码、配置、协议或使用方式改动，都必须同步更新本文档的“变更记录”章节。**

## 1. 快速开始

### 1.1 启动

```bash
cd /root/paddlejob/workspace/env_run
./start_streaming.sh
```

脚本会自动读取 `configs/streaming_web.yaml`，不需要在命令行传参数。

后台运行建议：

```bash
nohup ./start_streaming.sh > output/stream_server.log 2>&1 &
```

不要对运行中的服务按 `Ctrl+Z`。服务进程被挂起后会出现 HTTP 请求一直等待、前端停留在“加载模型”的现象。启动脚本已忽略 `SIGTTOU/SIGTTIN`，避免进程移到后台后再次因终端输出被挂起。

### 1.2 打开前端

浏览器访问地址取决于服务部署位置和网络入口。

同一台机器本机访问：

```text
http://127.0.0.1:8000/
```

虚拟机或服务器 IP 可直接访问：

```text
http://<server-ip>:8000/
```

虚拟机通过宿主机端口映射访问，例如宿主机端口映射到虚拟机 `8000`：

```text
http://<host-ip>:<published-port>/
```

虚拟机位于内网、只能从同一内网访问：

```text
http://<vm-private-ip>:8000/
```

通过 HTTPS 反向代理访问：

```text
https://<domain>/
```

原部署使用的 `http://<host-ip>:8000/` 形式保持不变，替换为本次虚拟机、
宿主机或代理实际可访问的 IP、端口或域名即可。不要在公开文档中写入真实 IP。
云主机还需确认安全组和防火墙已开放对应 TCP 端口。

上游任务的 WebSocket 地址相应为：

```text
ws://<server-ip>:8000/ws/audio
ws://<host-ip>:<published-port>/ws/audio
wss://<domain>/ws/audio
```

首次打开或更新前端后建议 `Ctrl+F5` 强制刷新。当前静态资源版本为 `app.js?v=20261023-stream2`。

点击一次“进入直播”以解锁浏览器音频。默认使用 `live.input_mode: stream`，
由上游通过 `/ws/audio` 推送 16 kHz 单声道 PCM。也可以在配置中切换为
`file` 或 `hybrid`。

### 1.3 流式音频输入

默认连接：

```text
ws://<server-address>:8000/ws/audio
```

连接后服务端发送：

```json
{
  "type": "audio_meta",
  "sample_rate": 16000,
  "channels": 1,
  "format": "s16le",
  "window_frames": 20,
  "window_samples": 13334,
  "window_ms": 833.375,
  "context_left_ms": 200,
  "context_right_ms": 300,
  "context_left_frames": 5,
  "context_right_frames": 7,
  "max_pending_windows": 12
}
```

客户端发送开始消息：

```json
{"type": "audio_start", "sample_rate": 16000, "channels": 1, "format": "s16le"}
```

随后持续发送小端序 PCM16 二进制数据，例如每 20 ms 发送 640 字节。
服务端每累计“核心窗口 + 右侧上下文”所需采样数，就写入一个带左右上下文的
推理 WAV、调用 Whisper/UNet、入队推理，并返回：

```json
{"type": "audio_ack", "samples": 26668, "windows": 2, "buffered_samples": 0, "queued_windows": 1}
```

结束时发送：

```json
{"type": "audio_end"}
```

服务端会提交剩余可组成完整视频帧的音频，并返回 `audio_done`。发送 `ping`
可得到 `pong`。单个服务实例同时只接受一路音频上行和一路直播观众。

如果当前回答被提前打断，发送：

```json
{"type": "audio_cancel"}
```

服务端会丢弃尚未成窗的缓冲 PCM，不把它注册成新语音段，并返回
`audio_cancelled`。这样可以避免打断后仍在途的同一回答音频被误判为“新回答”
而取消自动恢复。

上游任务接入建议：

1. 每段独立回答使用一个新的 `/ws/audio` 连接。
2. TTS 或音频生成结果统一转换为 16 kHz、单声道、PCM S16LE。
3. 每 20～60 ms 发送一个二进制块；服务端会自行聚合成推理窗口。
4. 发送 `audio_end` 前不要关闭 socket，等待 `audio_done`。
5. 根据 `audio_ack` 的 `windows` 和 `queued_windows` 判断上游背压。
6. 当前回答被打断后，上游应停止发送该回答的剩余 PCM，并发送
   `audio_cancel` 丢弃未成窗数据。
7. 新回答必须在打断等待窗口内重新连接并发送首段 PCM。
8. 反向代理需要允许 WebSocket Upgrade，并将空闲超时设置得高于打断等待时间。

### 1.4 文件输入

把上游生成的语音段写入：

```text
data/audio/
```

支持 `.wav`、`.mp3`、`.m4a`、`.aac`、`.ogg`、`.flac`。

注意：`live.process_existing: true` 会把启动时已经在 `data/audio/` 中的文件也加入直播队列。当前目录内已有测试音频，正式直播前建议清空该目录，或把 `process_existing` 改为 `false`。

文件模式需显式配置：

```yaml
live:
  input_mode: file
  process_existing: false
```

`hybrid` 会同时启用 WebSocket PCM 和目录文件输入。

### 1.5 打断流程模拟

根目录脚本 [simulate_pcm_interrupt_flow.py](simulate_pcm_interrupt_flow.py) 模拟
上游 PCM 流。脚本只连接 `/ws/audio`，不会连接 `/ws/live`；直播画面仍由用户在
浏览器中观看和操作。

```bash
python simulate_pcm_interrupt_flow.py
```

该脚本只模拟上游 PCM 客户端，不会启动服务、加载模型或创建端口转发。执行前
必须先运行 `./start_streaming.sh`，并确认
`http://127.0.0.1:8000/api/status` 可访问。

脚本默认使用 `http://127.0.0.1:8000` 和三段测试音频。连接其他服务地址时
只需覆盖 `--base-url`。

操作流程：

1. 启动服务，在浏览器打开直播页并点击“进入直播”。
2. 运行模拟脚本。
3. 回答 1 使用 `sun.wav`，脚本自动等待播放完成。
4. 回答 2 使用 `eng.wav`；看到脚本提示后，在前端点击“打断”。
5. 第一次打断后不要操作，等待服务端自动恢复被打断内容。
6. 恢复播放后，再次在前端点击“打断”。
7. 第二次打断后，脚本立即发送 `musetalk_test_audio.wav` 作为新回答。
8. 回答 3 播放完成后不再发送音频，等待服务端空闲退出。

`eng.wav` 默认只发送前 15 秒作为可打断内容，确保服务端及时给出打断提示。
使用 `--answer2-seconds-before-interrupt 0` 可发送完整文件。

正式流程只接受两次打断：第一次结束后等待自动恢复，第二次应在恢复播放期间执行。
脚本使用相对事件计数，会识别服务启动以来的历史打断，并在用户额外打断时明确报错。

`sun.wav` 是 44.1 kHz，脚本会先重采样到 16 kHz。`eng.wav` 当前时长约 60 秒，
`musetalk_test_audio.wav` 约 63.6 秒，完整测试通常需要 3 分钟以上。

回答 1 和回答 3 默认每 20 ms 发送一个 PCM 块，模拟真实上游流。回答 2 使用
独立的 `--answer2-send-delay-ms`（默认 5 ms）加速预送：流式输入会边发边播，
若仍按实时速度发送，提示出现时回答 2 往往已经播完。加速后脚本会显示实际剩余
播放时间，请在该时间内点击“打断”。

不要用 0 发送间隔快速灌入长音频，否则服务端队列背压期间可能无法及时处理
WebSocket keepalive，导致连接中断和尾部音频缺失。

默认测试报告写入：

```text
output/stream_interrupt_test.json
```

## 2. 系统结构

```text
data/audio/ 新文件
  └─ 目录监听线程
       ├─ 文件稳定检测
       ├─ ffmpeg 转 16 kHz / 单声道 / PCM WAV
       └─ LiveSegment 入队
            ├─ 回答队列（priority 0）
            ├─ 恢复队列（priority 1）
            └─ 普通队列（priority 2）

推理线程                        编码线程
采样计数 → PTS
  ├─ 默认 VAD 关闭：全部帧 Whisper → UNet → VAE decode
  └─ enable_vad=true：静音帧直接使用 avatar 原帧
                              →  人脸融合 → JPEG encode
            │
            └─ WebSocket /ws/live
                 ├─ 文本控制消息
                 └─ 带 PTS 的二进制 JPEG 帧

浏览器
  ├─ Canvas 渲染
  ├─ Web Audio 连续排程音频
  ├─ ACK 回传播放进度
  └─ 打断按钮
```

设计要点：

- 模型和 avatar 缓存只加载一次，服务启动后常驻显存/内存。
- 推理线程和融合/编码线程分离，GPU 推理与 CPU 后处理重叠。
- 音频采样计数是主时钟；第 k 帧覆盖采样窗口
  `[k*sample_rate/fps, (k+1)*sample_rate/fps)`，帧头 PTS 为
  `round(global_frame*1e6/fps)` 微秒。
- 前端按 segment 的 `start_pts_us` 调用 Web Audio `start(when)`，并按帧头 PTS
  渲染，不再使用段内 `local_index`。
- 服务端从全局 0 开始连续编号。说话生成帧、静音原帧和待机原帧使用同一编号，
  因此段边界和待机切换不会重置姿态。
- VAD 默认关闭，所有帧都走 UNet，保留最后一个字之后的句尾口型收敛过程。
  只有显式设置 `inference.enable_vad: true` 时才启用静音跳帧。

## 3. 文件职责

| 文件 | 作用 |
|---|---|
| `start_streaming.sh` | 无参数启动入口，读取默认配置并启动服务 |
| `simulate_pcm_interrupt_flow.py` | 模拟上游 PCM、两次人工打断、自动恢复和新回答 |
| `configs/streaming_web.yaml` | 直播功能的唯一参数配置 |
| `stream_server.py` | 兼容启动入口，保留 `app`、`STATE` 和 `python stream_server.py` 用法 |
| `muse_stream/api/` | FastAPI 应用组装、HTTP 路由和 WebSocket 直播会话 |
| `muse_stream/audio/` | 音频转码、语音分析、段队列、打断恢复和目录输入 |
| `muse_stream/inference/` | 逐段推理、帧融合、推理线程和 JPEG 编码线程 |
| `muse_stream/models.py` | 模型、Whisper、avatar 加载与 warmup |
| `muse_stream/config.py` | 配置解析、校验和应用状态初始化 |
| `muse_stream/state.py` | 服务、模型、流水线、打断、观众和输入状态 |
| `web/index.html` | 直播页面结构 |
| `web/app.js` | Web Audio 排程、Canvas 渲染、ACK、打断交互 |
| `web/style.css` | 页面样式 |
| `web/README.md` | 前端与协议的简要说明 |
| `scripts/benchmark_stages.py` | 音视频完整链路分阶段基准脚本 |
| `data/audio/` | 上游语音输入目录 |
| `results/live_audio/<timestamp>/` | 每轮直播的转码音频与恢复段 |
| `results/v15/avatars/<id>/` | avatar 预处理缓存 |
| `output/code_snapshot/` | 源码/配置/文档快照 |

## 4. 配置说明

所有参数在 `configs/streaming_web.yaml`。

### 4.1 服务

| 参数 | 当前值 | 说明 |
|---|---:|---|
| `server.host` | `0.0.0.0` | 监听地址 |
| `server.port` | `8000` | HTTP/WebSocket 端口 |
| `server.gpu_id` | `0` | 使用的 GPU |
| `server.fps` | `24` | 输出帧率，应与源视频一致 |
| `server.batch_size` | `20` | 推理 batch；首尾 batch 会补齐到该大小 |
| `server.prebuffer` | `8` | 每个语音段开始播放前至少缓冲的帧数 |
| `server.queue_size` | `48` | 网络发送队列上限 |
| `server.jpeg_quality` | `88` | JPEG 压缩质量 |

### 4.2 模型

| 参数 | 当前值 |
|---|---|
| `models.version` | `v15` |
| `models.vae_type` | `sd-vae` |
| `models.whisper_dir` | `./models/whisper` |
| `models.unet_model_path` | `./models/musetalkV15/unet.pth` |
| `models.unet_config` | `./models/musetalkV15/musetalk.json` |

### 4.3 Avatar

| 参数 | 当前值 | 说明 |
|---|---:|---|
| `avatar.id` | `knowledge_host_720p` | 默认缓存目录名 |
| `avatar.video_path` | `data/video/knowledge_host_720p.mp4` | 默认数字人源视频；原形象可用 `streaming_duplex.yaml` 切回 |
| `avatar.bbox_shift` | `0` | v1.5 固定为 0 |
| `avatar.preparation` | `auto` | 有完整缓存则复用，否则重新预处理 |
| `avatar.extra_margin` | `10` | v1.5 下巴扩展像素 |
| `avatar.parsing_mode` | `jaw` | 人脸融合模式 |
| `avatar.left_cheek_width` | `90` | 左脸颊保护宽度 |
| `avatar.right_cheek_width` | `90` | 右脸颊保护宽度 |

### 4.4 推理

| 参数 | 当前值 | 说明 |
|---|---:|---|
| `inference.audio_padding_length_left` | `2` | 音频左 padding |
| `inference.audio_padding_length_right` | `2` | 音频右 padding |
| `inference.feature_window_mode` | `legacy` | `legacy` 原逐帧切片；`centered` LiveTalking 风格居中切片 |
| `inference.feature_window_left` | `4` | `centered` 模式左偏移，窗口为 `[center-4, center+6)` |
| `inference.feature_window_right` | `6` | `centered` 模式右端偏移（不含） |
| `inference.enable_vad` | `false` | 默认关闭 VAD，全部帧经过 UNet |
| `inference.silence_threshold_dbfs` | `-45` | 低于该帧 RMS 时跳过 UNet，输出原帧 |
| `inference.silence_merge_gap_frames` | `3` | 合并语音内部不超过 3 帧的短静音空洞 |

### 4.5 直播与打断

| 参数 | 当前值 | 说明 |
|---|---:|---|
| `live.audio_dir` | `data/audio` | 监听的音频目录 |
| `live.input_mode` | `stream` | `stream`、`file` 或 `hybrid` 输入模式 |
| `live.idle_timeout_seconds` | `30` | 无新音频且播放空闲后的退出时间 |
| `live.interrupt_wait_seconds` | `10` | 打断后等待新语音的窗口 |
| `live.interrupt_resume_mode` | `restart` | 被打断段 `restart` 重播或 `continue` 续播 |
| `live.poll_interval_seconds` | `0.5` | 目录扫描间隔 |
| `live.file_stable_seconds` | `0.5` | 文件大小稳定多久后才转码 |
| `live.max_prefetch_seconds` | `4` | 服务端最多领先客户端播放的秒数 |
| `live.idle_prebuffer_frames` | `8` | 无语音时服务端保持的待机帧预取窗口 |
| `live.process_existing` | `true` | 启动时是否处理目录中已有文件 |
| `live.extensions` | 见配置 | 接受的音频扩展名 |

### 4.6 流式音频窗口

| 参数 | 当前值 | 说明 |
|---|---:|---|
| `audio_stream.window_frames` | `20` | 每个输出窗口对应的视频帧数 |
| `audio_stream.context_left_ms` | `200` | 每个窗口左侧真实音频上下文 |
| `audio_stream.context_right_ms` | `300` | 每个窗口右侧 lookahead 上下文 |
| `audio_stream.overlap_frames` | `4` | 从右上下文额外生成的重叠帧，用于边界融合 |
| `audio_stream.pause_overlap_frames` | `5` | 边界落在静音时使用的更长融合帧数 |
| `audio_stream.pause_boundary_frames` | `6` | 在边界前后检查停顿的帧数，`0` 表示关闭停顿检测 |
| `audio_stream.max_pending_windows` | `12` | 上游背压窗口上限 |
| `audio_stream.max_buffer_seconds` | `5` | 未成窗 PCM 的最大缓冲 |

上下文只用于 Whisper/UNet 推理，不会重复播放：每个推理 WAV 包含
`左上下文 + 核心窗口 + 右上下文`，但 `/api/live/audio/<id>` 返回的核心 WAV
只包含中间窗口。右上下文会产生相应的首窗口延迟。

`overlap_frames` 会利用右上下文额外生成接缝帧，并与下一段同时间戳的首帧融合；
这些重叠帧不进入音频播放时间线，也不会重复推进全局帧号。边界落在静音时使用
`pause_overlap_frames`，可获得更长的过渡。两个值都不能超过右上下文帧数。
`pause_boundary_frames` 控制停顿检测窗口，例如 `6` 表示在边界前后各检查约
`250ms`；设为 `0` 时不启用静音边界检测。

### 4.6 流式音频

| 参数 | 当前值 | 说明 |
|---|---:|---|
| `audio_stream.sample_rate` | `16000` | 上行 PCM 采样率，当前固定为 16 kHz |
| `audio_stream.channels` | `1` | 单声道 |
| `audio_stream.format` | `s16le` | 有符号 16 位小端 PCM |
| `audio_stream.window_frames` | `20` | 每个窗口对应的视频帧数，默认等于推理 batch |
| `audio_stream.max_pending_windows` | `12` | 待推理窗口上限，超过后对上游形成背压 |
| `audio_stream.max_buffer_seconds` | `5` | 单连接未成窗 PCM 的最大缓冲 |

**两个计时器必须区分：**

- `interrupt_wait_seconds`（10 秒）：打断后的等待窗口，决定是否恢复旧内容。
- `idle_timeout_seconds`（30 秒）：整个直播没有新音频、播放和生成也空闲后，退出程序并释放端口。

## 5. 音频处理与连续播放

### 5.1 文件处理

1. 每 `poll_interval_seconds` 扫描一次 `data/audio/`。
2. 新文件需要保持大小稳定 `file_stable_seconds`，避免读到半截文件。
3. 按修改时间和文件名排序。
4. 用 ffmpeg 转成 16 kHz、单声道、`pcm_s16le` WAV。
5. 读取 PCM 采样数和采样率，计算帧数
   `floor(sample_count * fps / sample_rate)`。
6. 默认将全部帧标记为需要生成；只有 `inference.enable_vad: true` 时才按帧 RMS
   生成静音 mask。
7. 加入对应优先级队列。
8. 推理线程在真正开始该段时分配连续的全局起始帧号；先通过待机原帧补齐到
   ACK 之后的安全预缓冲位置。

### 5.2 前端播放

- 每个 segment 的元数据包含音频 URL、时长、采样数、语音/静音帧数、
  `start_frame` 和 `start_pts_us`。
- 前端立即下载并解码音频，缓存在 `AudioBuffer` 中。
- 当音频解码完成且至少缓冲 `server.prebuffer` 帧后，用
  `AudioBufferSourceNode.start(when)` 排入时间线，其中
  `when = max(audioCtx.currentTime + 0.08, timelineEpoch + start_pts_us/1e6)`。
- 每个二进制帧前 24 字节为帧头，包含 magic、帧类型、segment id、PTS（微秒）
  和全局帧号；后端 JPEG 位于帧头之后。
- 渲染循环根据 `audioCtx.currentTime - timelineEpoch` 得到目标 PTS，再从
  `ImageBitmap` 缓存中选取不晚于目标 PTS 的帧。
- 每 6 帧发送一次 ACK，ACK 只携带全局 `frame_index`、`pts_us` 和帧类型；
  服务端据此控制预取上限。

### 5.3 服务端待机帧

没有可播放的语音段时（例如等待新音频、段间空隙、打断后的等待窗口），服务端
继续从 `frame_list_cycle` 生成待机帧：

- 浏览器不再加载或循环 `<video>`；
- 待机帧使用当前全局帧号取 `frame_list_cycle[global_frame % len]`；
- 不使用 MuseTalk 推理，不做口型融合；
- 新语音段的 `start_frame` 紧接待机帧，保留同一姿态时间线；
- 有语音段内但该帧被判为静音时，同样从这一时间线取原帧。

因此待机、静音和说话帧除了嘴部区域外，使用相同的源姿态帧，解决浏览器视频
从第 0 帧重新循环导致的姿态跳变。

## 6. 打断功能

### 6.1 触发

播放中点击前端“打断”按钮。前端发送：

```json
{"type":"interrupt","segment_id":0,"frame_index":20}
```

### 6.2 后端处理

1. 校验当前段，记录打断帧。
2. 取消当前段的继续生成，丢弃已经预取但尚未播放的旧生成帧。
3. 将待机时间线重置为“当前显示帧 + 1”，并同步重置 ACK/发送水位。
4. 快照当前段之后尚未播放的所有旧语音段。
5. 进入打断等待窗口，默认 10 秒；期间立即从连续全局帧号输出待机原帧。
6. 等待期间服务保持在线，不触发空闲退出。

### 6.3 等待期间收到新音频

- 新音频进入回答优先队列（priority 0），立即生成播放。
- **取消恢复**：不恢复被打断段，也不恢复快照的旧队列。
- 前端收到 `priority=true` 的段后退出打断等待状态。

### 6.4 等待期间没有新音频

等待超过 `interrupt_wait_seconds` 后恢复“打断前的待播队列”：

1. 先恢复当前被打断段。
2. 再按原顺序恢复当前段之后、打断前已经排队的全部旧语音段。
3. `restart` 表示当前段从头重播；`continue` 表示当前段从打断点继续。
4. 后续旧段完整播放。

恢复段使用新的 segment id 和 `resume=true` 元数据，前端会按原顺序重新排程。

### 6.5 限制

- 同一时间只处理一次打断。
- 等待新语音期间“打断”按钮禁用。
- 打断时前端会丢弃当前及尚未播放的旧画面；超时恢复时后端会重新发送恢复队列。

### 6.6 连续打断

支持在一次打断流程结束后再次打断，例如：

1. 音频 1 正在播放，队列中还有音频 2；
2. 用户打断，等待期内收到音频 3 和音频 4；
3. 音频 3 优先播放，音频 4 进入后续队列，音频 2 因“有新音频则取消恢复”被丢弃；
4. 音频 3 播放期间用户再次打断；
5. 此时音频 4 属于第二次打断前的待播队列；
6. 若等待期内收到音频 5，则音频 3 和音频 4 的恢复都被取消，音频 5 优先播放；
7. 若等待期内没有音频 5，则恢复音频 3，并按顺序恢复音频 4。

注意：

- 不支持在前一次打断仍处于等待窗口时重复触发；等音频 3 开始播放后按钮会重新启用。
- 第二次打断时，音频 4 的去留遵循同一规则：收到新音频就不再恢复整个旧队列。

## 7. 空闲退出

服务在以下条件同时满足时退出：

1. 距离最后一次新音频、最后一次播放 ACK 已超过 `idle_timeout_seconds`；
2. 没有待生成、待发送或待播放的队列内容；
3. 当前不处于打断等待窗口。

**优先级：待处理音频高于空闲退出。** 即使还没有观众连接，或观众已连接但还没点击
“进入直播”，只要存在排队或正在生成的语音段，服务也不会因 30 秒空闲而退出。
`process_existing: true` 启动时读取到已有音频时，服务会等待观众连接并处理这些
队列，而不是直接退出。

退出流程：

1. 服务端向前端发送 `live_end`；
2. 1 秒后关闭 uvicorn；
3. uvicorn 返回后主动结束 Python 进程，避免 TensorFlow/CUDA 的非 daemon 线程
   让程序继续驻留；
4. `start_streaming.sh` 随之结束，端口释放，不需要在终端按 `Ctrl+C`。

没有观众连接，且没有待处理音频时，才会在超过空闲时间后退出，避免端口长期占用。

## 8. HTTP / WebSocket 协议

### 8.1 HTTP

| 路径 | 作用 |
|---|---|
| `/` | 直播页面 |
| `/static/*` | 前端资源（no-store） |
| `/api/status` | 服务、观众、队列、打断状态 |
| `/api/live/audio/{segment_id}` | 转码后的 WAV 音频 |

### 8.2 客户端 → 服务端

| 消息 | 作用 |
|---|---|
| `{"type":"ready"}` | 用户点击“进入直播”，音频上下文解锁 |
| `{"type":"ack","frame_index":12,"pts_us":500000,"kind":"speech"}` | 按全局帧时钟回传播放进度；`kind` 为 `idle` 时不延长空闲退出计时 |
| `{"type":"interrupt","segment_id":0,"frame_index":20}` | 按全局帧号打断当前段 |

### 8.3 服务端 → 客户端

| 消息 | 作用 |
|---|---|
| `meta` | fps、分辨率、缓冲、帧头长度、时钟类型、打断等待、音频目录 |
| `segment` | 段 id、采样数、语音/静音帧数、`start_frame`、`start_pts_us`、音频 URL、`priority`、`resume`、`origin_id` |
| 二进制消息 | 24 字节帧头 + JPEG；帧头依次为 `MTF1`（4B）、类型（1B）、segment id（4B）、PTS 微秒（8B）、全局帧号（4B） |
| `segment_end` | 当前段发送结束 |
| `interrupt_ack` | 打断是否成功、等待秒数、恢复模式 |
| `live_end` | 空闲退出或服务结束 |
| `error` | 推理或连接错误 |

## 9. 测试记录

| 场景 | 结果 |
|---|---|
| 2 秒 + 3 秒连续音频 | 48 / 72 帧连续生成，音频接口正常 |
| 正式 30 秒空闲配置 | `live_end` 原因 `idle_timeout`，1 秒后端口关闭 |
| 6 秒语音第 20 帧打断，无新音频 | 恢复段 `resume=true`，144 帧重播 |
| 6 秒语音第 20 帧打断，等待期内有回答 | 回答段 `priority=true` 先播，未生成恢复段 |
| 6 + 3 + 2 秒旧队列，打断首段且无新音频 | 按顺序恢复 144 / 72 / 48 帧，origins `[0,1,2]` |
| 首个 batch / 尾 batch | 通过固定 batch size 预热和补齐，避免慢速 cuDNN 路径 |
| 关闭 VAD 的语音段 | `speech_frames=1440`、`silent_frames=0`，句尾所有帧继续经过 UNet |
| 纯无音频待机 | 5 秒收到 122 帧，24.4 fps |
| 打断后的待机 | 5 秒收到 123 帧，24.6 fps，PTS 连续 |
| 在全局帧 60 打断 | 17.5 ms 返回确认，46.6 ms 后首帧为全局帧 61；随后 3 秒 75 帧，约 25 fps |
| 直播结束 | `live_end` 原因 `idle_timeout`；Python 退出码 0，端口释放 |
| 页面与静态资源 | `Cache-Control: no-store`，版本号已更新 |

### 9.1 分阶段性能基准（2026-10-22）

测试命令：

```bash
python3 scripts/benchmark_stages.py --gpu-id 1 --runs 3 --batch-size 20
```

测试条件：GPU 1、音频 `data/audio/musetalk_test_audio.wav`（63.583 秒 / 1526 帧）、
源视频 345 帧、batch 20、预热 1 次后测量 3 次；测量期间 8000 服务在 GPU 0 上运行。
模型 + 预处理模型加载 12.211 秒。

| 阶段 | 测试 1 (ms) | 测试 2 (ms) | 测试 3 (ms) | 均值 (ms) | 标准差 (ms) |
|---|---:|---:|---:|---:|---:|
| 音频转码 ffmpeg（16k mono） | 58.6 | 59.6 | 58.7 | 59.0 | 0.5 |
| 音频解码 librosa（63.6s） | 4.6 | 4.2 | 4.2 | 4.3 | 0.2 |
| Whisper Mel 特征（3×30s） | 8.9 | 7.6 | 7.8 | 8.1 | 0.7 |
| Whisper Encoder | 12.7 | 10.0 | 10.1 | 11.0 | 1.5 |
| 音频 Prompt 构造 | 5.0 | 6.1 | 4.9 | 5.3 | 0.7 |
| 音频侧总计 | 89.8 | 87.5 | 85.8 | 87.7 | 2.0 |
| 视频解码（源视频 20 帧） | 32.5 | 24.8 | 28.0 | 28.5 | 3.8 |
| 关键点+人脸检测（20 帧） | 910.6 | 830.5 | 845.5 | 862.2 | 42.6 |
| 裁脸+Resize（20 帧） | 28.2 | 27.6 | 28.4 | 28.1 | 0.4 |
| 人脸解析 Mask（20 帧） | 656.3 | 657.6 | 660.2 | 658.1 | 2.0 |
| VAE 编码（20 帧） | 251.6 | 257.5 | 257.1 | 255.4 | 3.3 |
| 视频预处理总计（20 帧） | 1879.2 | 1798.0 | 1819.3 | 1832.1 | 42.1 |
| UNet 推理（B=20） | 39.6 | 39.4 | 39.5 | 39.5 | 0.1 |
| VAE 解码（B=20） | 138.1 | 140.7 | 138.6 | 139.1 | 1.4 |
| 人脸融合（20 帧） | 157.4 | 157.2 | 153.2 | 155.9 | 2.4 |
| JPEG 编码（20 帧） | 178.1 | 180.3 | 179.0 | 179.1 | 1.1 |
| 直播运行时总计（20 帧） | 513.2 | 517.7 | 510.3 | 513.7 | 3.7 |
| 端到端总计（20 帧） | 2392.4 | 2315.7 | 2329.5 | 2345.9 | 40.9 |

单位耗时与整段投影：

| 指标 | 数值 |
|---|---:|
| 音频侧总计 / 63.6s 音频 | 87.7 ms |
| 视频预处理 / 20 源帧 | 1832.1 ms |
| 视频预处理 / 源帧 | 91.6 ms |
| 直播运行时 / 20 输出帧 | 513.7 ms |
| 直播运行时 / 输出帧 | 25.7 ms |
| 直播运行时吞吐 | 38.9 fps |
| 直播运行时 / 1526 帧 | 39.6 s |
| Avatar 预处理 / 345 帧 | 33.0 s |
| 音频链路 / 63.6s | 0.1 s |
| 完整链路投影（预处理+运行时+音频） | 72.6 s |

结论：

- 音频链路总计约 87.7 ms（含 ffmpeg 转码 59 ms），对 63.6 秒直播几乎可以忽略。
- 视频预处理约 1832 ms / 20 源帧，其中关键点+人脸检测约 862 ms、解析 Mask 约 658 ms。
  这些只在 avatar 首次准备时需要，之后复用缓存。
- Avatar 预处理 345 帧约 33.0 秒，是首次启动的主要一次性成本。
- 直播运行时约 513.7 ms / 20 帧，折合 25.7 ms/帧、38.9 fps，高于 24 fps 实时要求。
- 运行时中 UNet 只占 7.7%；VAE 解码占 27.1%，人脸融合占 30.4%，JPEG 编码占 34.9%。
  主要瓶颈是 VAE 解码、PIL 融合和 JPEG 编码，而不是 UNet。
- 完整 63.6 秒内容投影约 72.6 秒，其中运行时约 39.6 秒、首次 Avatar 预处理约 33.0 秒。

完整结果保存在 `output/benchmark_stages.md` 和 `output/benchmark_stages.json`。

### 9.2 batch_size 对比与首帧延迟

相同音频、相同源视频、GPU 1 上分别测试 batch 20 和 batch 32：

| 指标 | batch 20 | batch 32 | 变化 |
|---|---:|---:|---:|
| 直播运行时 / 批 | 513.7 ms / 20 帧 | 825.6 ms / 32 帧 | 每批增加 60.7% |
| 直播运行时 / 帧 | 25.7 ms | 25.8 ms | 约 +0.5% |
| 运行时吞吐 | 38.9 fps | 38.8 fps | 基本不变 |
| UNet / 批 | 39.5 ms | 57.7 ms | +46% |
| VAE 解码 / 批 | 139.1 ms | 228.3 ms | +64% |
| 首批 UNet + VAE 解码 | 178.6 ms | 286.0 ms | +107.4 ms |
| VAE 编码 / 源帧 | 12.8 ms | 12.6 ms | 略低 |
| 视频预处理 / 源帧 | 91.6 ms | 90.9 ms | 基本不变 |
| 音频链路 / 63.6s 音频 | 87.7 ms | 89.9 ms | 噪声范围内，与 batch 无关 |

结论：

- batch 32 对稳定的每帧吞吐几乎没有提升（38.8 vs 38.9 fps），但首批 UNet+VAE
  解码增加约 107 ms，首帧延迟会变差。
- batch 32 的 UNet/VAE 激活显存更高，批处理队列也更大。
- 当前建议保持 batch 20；优化重点应放在 VAE 解码、融合和 JPEG 编码。

长音频首帧延迟：

- 63.6 秒音频的音频链路（ffmpeg 转码 + librosa + Mel + Whisper + Prompt）约
  **87.7 ms**（batch 20），其中 ffmpeg 转码约 59 ms。
- 1 分钟音频与 63.6 秒基本同一量级，热机状态下不会“大幅延长”首帧；音频链路
  不是首帧延迟的主要来源。
- 当前实现会在生成第一帧前编码**整个音频文件**，因此耗时随音频时长线性增长，
  但 1 分钟音频的绝对增量只有约 0.1 秒。更长音频（例如数分钟）才需要改成
  “先编码第一段/第一个 30 秒，边播边编码后续”。
- 首帧延迟更主要的组成是：文件检测/稳定等待（约 0.5–1 秒）、首批 UNet+VAE
  解码（batch 20 约 0.18 秒）以及首帧融合/JPEG（约 0.02 秒）。
- 冷启动首次音频调用可能额外多约 1 秒（内核/模型首次执行），服务启动时的
  warmup 会消除这部分。

batch 32 的完整结果保存在：

- `output/benchmark_stages_b32.md`
- `output/benchmark_stages_b32.json`

## 10. 已知限制

- 当前只支持一个直播观众。
- 刷新页面可能错过已经播放的段。
- 在线预览不生成 MP4 文件；需要落盘时使用 `scripts/realtime_inference.py`。
- 浏览器自动播放策略要求用户点击一次“进入直播”。
- `process_existing: true` 会处理 `data/audio/` 中已有音频。
- `continue` 模式按帧时间截断音频，边界可能有几十毫秒误差。
- 打断时旧内容会从客户端丢弃；若等待期无新音频，后端通过恢复队列重新发送。
- 可选 VAD 当前使用逐帧 RMS 阈值；噪声底、音量差异较大的素材需要调整
  `silence_threshold_dbfs` 和 `silence_merge_gap_frames`，因此默认关闭。

## 11. 代码快照

每次改动后，相关源码、配置和文档会复制到：

```text
output/code_snapshot/
```

并通过 `MANIFEST.sha256` 校验。模型、测试音频、avatar 缓存和运行结果不重复放入代码快照。
基准脚本仅保留在仓库 `scripts/` 中，不复制到 `output/`；基准结果仍保存在
`output/benchmark_stages.md` 和 `output/benchmark_stages.json`。

## 12. 变更记录

### 2026-10-23

- 将单体 `stream_server.py` 拆分为 `muse_stream` 应用包，分离配置、状态、
  音频输入/分析、模型加载、推理、worker、HTTP 和 WebSocket 传输；原入口保留为
  兼容壳，启动方式和前端协议不变。
- 新增 `/ws/audio` 流式 PCM 输入入口，按推理 batch 聚合音频窗口，短窗口补零到
  Whisper 要求的 30 秒后提取特征；默认输入模式切换为 `stream`，同时保留
  `file` 和 `hybrid` 模式。
- 新增播放完成、打断次数和恢复次数状态，以及根目录流式打断测试脚本；补充
  虚拟机、端口映射、内网和反向代理的访问 URL 形式。
- 修复打断测试脚本提示过晚的问题：回答 2 默认截取前 15 秒；增加相对打断计数、
  计划外额外打断检测和回答 3 实际播放校验。
- 将待机帧 ACK 与媒体帧 ACK 分离：浏览器需要显式回传每个媒体段的最后一帧，
  防止待机帧把 ACK 水位推进到媒体末尾后误判回答播放完整。
- 新回答首窗口在打断期间绕过旧恢复队列背压，并清理已取消的恢复段，避免回答 3
  超过 10 秒窗口后才注册；测试脚本默认按 20 ms 实时节奏发送 PCM，避免突发灌流
  造成 keepalive 超时和尾部音频丢失。
- 修复直播服务首次生成 avatar 缓存时未向 `scripts.realtime_inference` 注入
  VAE，导致 `NameError: name 'vae' is not defined` 的问题；复用已加载的运行时
  VAE，避免重复加载模型。
- 帧时钟改为 PCM 采样计数驱动：第 k 帧对应 `k/fps`，每帧通过 24 字节二进制
  帧头携带全局 PTS 和 frame index；前端不再按段内 `local_index` 计数。
- 增加逐帧 RMS 静音判定；静音帧跳过 UNet，直接输出同一全局帧号的 avatar 原帧；
  短静音空洞可配置合并，避免碎片化推理批次。
- 待机帧改由服务端从 `frame_list_cycle` 按全局帧号输出，移除浏览器
  `idleVideo` 和 `/api/live/idle-video`；说话、静音和待机共用连续姿态时间线，
  修复待机恢复时的姿态跳变。
- 默认关闭 VAD（`inference.enable_vad: false`）；全部音频帧继续经过 UNet，
  保留句尾口型收敛过程，避免静音跳帧造成口型突变。
- 修复待机慢放：将服务端待机线程的队列轮询等待从 0.2 秒降到 0.02 秒；
  打断时同步推进 ACK 水位，使取消生成后立即以正常 24 fps 输出待机帧。
- 修复打断后先冻结数秒再跳到较后姿态帧的问题：打断时清空未播放的预取帧，
  将待机时间线重置为当前显示帧 + 1，并同步重置发送/ACK 水位，保证原帧连续。

### 2026-10-22

- 新增 FastAPI + WebSocket 直播前端，Canvas 渲染，Web Audio 连续播放。
- 新增 `start_streaming.sh` 无参数启动入口和 `configs/streaming_web.yaml` 统一配置。
- 推理与融合/编码拆成两个线程，支持 ACK 回压和最大预取。
- 修复首 batch / 尾 batch 慢速路径：按实际 batch 预热，尾 batch 补齐。
- 将音频监听目录从 `audio/` 改为 `data/audio/`。
- 新增静态资源 no-store、版本参数和 WebSocket 连接超时，修复旧前端缓存与连接状态卡住问题。
- 启动脚本忽略 `SIGTTOU/TTIN`，避免后台运行被终端挂起。
- 新增数字人直播的目录监听、16 kHz WAV 转码、连续段排队。
- 新增打断功能：优先播放新语音；等待无新语音时恢复被打断内容。
- 调整打断语义：等待期内收到新语音则取消恢复。
- 调整恢复范围：从“只恢复被打断的单段”改为“恢复被打断段 + 其后尚未播放的整个旧队列”。
- 空闲退出与打断等待分离：10 秒打断等待，30 秒空闲退出。
- 修复 `process_existing=true` 时已有音频被读取但未生成视频的问题：空闲退出现在
  必须同时满足“无排队、无生成中语音”；待处理队列的优先级高于退出。
- 修复前端显示“直播结束”且后端完成 shutdown 后进程仍驻留的问题：uvicorn 停止后
  主动 `os._exit`，无需手动 `Ctrl+C`。
- 新增待机视频：空闲等待和打断等待期间静音循环播放源视频，视频继续运动，
  无口型处理、无声音；有新语音时切回生成画面。
- 文档补充“连续打断”行为：第二次打断时，旧队列遵循“有新音频则取消恢复”的规则。
- 扩展 `scripts/benchmark_stages.py` 为音视频完整链路基准，覆盖音频转码/解码/
  Mel/Whisper/Prompt、视频解码/关键点/人脸检测/裁脸/解析 Mask/VAE 编码、
  UNet/VAE 解码/融合/JPEG，并输出单位耗时与整段投影；基准脚本不复制到 output。
- 补充 batch 20/32 对比：batch 32 基本不提升吞吐，首批 UNet+VAE 解码多约 107 ms，
  显存占用更高；1 分钟音频的音频链路约 0.09 s，不是首帧主因。
- 新增本维护文档，约定后续所有改动持续更新。
