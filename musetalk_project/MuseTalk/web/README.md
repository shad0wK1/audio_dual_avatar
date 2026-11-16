# MuseTalk 数字人直播前端

完整入口、配置、协议、打断机制和变更记录见
[LIVE_STREAMING_GUIDE.md](../LIVE_STREAMING_GUIDE.md)。

后端常驻模型。默认由上游通过 `/ws/audio` 推送 16 kHz 单声道 PCM，
服务端按推理 batch 聚合音频窗口并立即推理，通过 WebSocket 把画面和窗口音频
推给浏览器；前端用 Web Audio 把各段音频首尾排程，实现连续直播。
配置为 `file` 或 `hybrid` 模式时也支持监听 `data/audio/`。

## 启动

```bash
./start_streaming.sh
```

浏览器打开 `http://<服务器地址>:8000`，点击“进入直播”解锁浏览器音频。之后
无需再操作，流式语音会自动连续播放。

播放过程中可以点击“打断”。打断后新写入 `data/audio/` 的语音会优先播放；
只要在等待窗口内收到新语音，就不再恢复被打断的内容。如果连续
`live.interrupt_wait_seconds` 秒没有新语音，服务端才会恢复“打断前的待播队列”：
先恢复当前被打断段，再按原顺序恢复它后面尚未播放的所有旧语音段。

所有参数都在 [configs/streaming_web.yaml](../configs/streaming_web.yaml) 中。
如需临时使用另一份配置：

```bash
STREAMING_WEB_CONFIG=/path/to/config.yaml ./start_streaming.sh
```

## 音频目录

默认监听 `data/audio/`，支持：

```text
.wav .mp3 .m4a .aac .ogg .flac
```

处理规则：

- 文件写入后等待 `live.file_stable_seconds` 秒，确认大小稳定再转码，避免读到半截文件。
- 按修改时间和文件名排序，转成 16 kHz 单声道 PCM WAV。
- 新文件会被追加到直播队列，不会覆盖正在播放的内容。
- 同一文件被覆盖且 mtime/size 变化时，会作为新语音段再次处理。
- 服务端不会删除 `data/audio/` 中的源文件。

## 播放机制

```text
data/audio/ 新文件
  └─ ffmpeg 转 16k mono WAV
       └─ LiveSegment 队列
            ├─ 推理线程：采样计数 → PTS；默认 VAD 关闭
            ├─ 编码线程：融合 + JPEG encode
            └─ WebSocket /ws/live 推送
浏览器
  ├─ Web Audio：按 segment 的 start_pts_us 排程音频
  ├─ Canvas：按帧头 PTS 从同一时间线取帧
  └─ ACK：按全局 frame_index 回传播放进度
```

- 前端不等待整段视频生成完，收到音频和少量预缓冲帧后就开始播放。
- 第 k 帧覆盖音频采样窗口 `[k*sample_rate/fps, (k+1)*sample_rate/fps)`，
  帧头 PTS 为 `round(k*1e6/fps)` 微秒；前端不再使用段内 `local_index`。
- ACK 用于限制服务端领先播放的帧数，避免浏览器内存无限增长。
- VAD 默认关闭，每个音频帧都经过 UNet，避免句尾停止发音后口型来不及收敛。
  `inference.enable_vad` 可用于重新启用逐帧 RMS 静音判断。
- 空闲等待和打断等待时不再由浏览器循环视频。服务端从 `frame_list_cycle`
  按同一个全局帧号发送待机原帧，因此说话、静音和待机姿态连续。
- 当前只支持一个直播观众；刷新页面可能错过已经播放过的段。
- 同一时间只处理一次打断；等待回答或恢复原语音期间，“打断”按钮会暂时禁用。

## 打断流程

```text
观众点击“打断”
  └─ 前端停止当前音频并清空待播内容
       └─ 后端取消当前段生成，旧内容暂停
     ├─ data/audio/ 新语音 → 优先队列，立即生成播放，取消恢复
     └─ 连续 10s 无新语音 → 恢复被打断段 + 其后尚未播放的旧队列
```

恢复方式由 `live.interrupt_resume_mode` 控制：

- `restart`（默认）：从被打断语音段的开头重新播放。
- `continue`：从被打断的时间点继续播放剩余内容。
- 被中断段之后尚未播放的旧语音段会在它之后按原顺序恢复播放。

打断确认后，服务端会丢弃已预取但尚未播放的生成帧，并立即从“当前显示帧 + 1”
继续发送待机原帧；待机与被打断画面使用同一全局姿态时间线，不会冻结到预取队列
末尾，也不会跳到更靠后的姿态。

打断等待（默认 10 秒）与空闲退出（默认 30 秒）是两套独立计时：

- 打断等待内即使没有音频，服务也会保持直播和最后一帧，不会退出；等待期间
  一旦收到新语音，恢复计划立即取消，新语音播放完后继续正常直播。
- 只有长时间没有新音频、且播放/生成队列空闲时，才会触发空闲退出。

## 自动退出

当 `data/audio/` 连续 `live.idle_timeout_seconds` 秒没有新文件，且没有待生成/待播放
内容时，服务端发送 `live_end`，关闭 uvicorn，shell 随之退出并释放端口。
默认是 30 秒。

如果还没有观众连接，同样会在超时后退出；如果观众已连接但一直未点击“进入直播”，
也会在超时后退出，避免端口长期占用。

## 主要配置

| 参数 | 说明 |
|---|---|
| `server.host` / `server.port` | 监听地址和端口 |
| `server.gpu_id` | 使用哪块 GPU |
| `server.fps` | 输出帧率，应与源视频一致 |
| `server.batch_size` | 推理 batch，默认 20 |
| `server.prebuffer` | 每段开始播放前需要的帧数，默认 8 |
| `server.queue_size` | 网络发送队列上限 |
| `server.jpeg_quality` | JPEG 压缩质量 |
| `models.*` | UNet、VAE、Whisper 路径 |
| `avatar.*` | avatar id、源视频、bbox 和融合参数 |
| `inference.silence_threshold_dbfs` | 静音判定阈值，默认 `-45` dBFS |
| `inference.silence_merge_gap_frames` | 合并短静音空洞的帧数，默认 3 |
| `inference.enable_vad` | 是否启用静音跳帧，默认 `false` |
| `inference.audio_padding_*` | 音频左右 padding |
| `inference.feature_window_mode` | `legacy` 或 LiveTalking 风格 `centered` |
| `inference.feature_window_*` | `centered` 模式的左右 Whisper 特征偏移 |
| `live.audio_dir` | 监听的音频目录，默认 `data/audio` |
| `live.idle_timeout_seconds` | 无新音频/播放活动后的退出时间，默认 30 秒 |
| `live.interrupt_wait_seconds` | 打断后等待新语音的时间，默认 10 秒 |
| `live.interrupt_resume_mode` | `restart` 重新播放或 `continue` 继续播放 |
| `live.poll_interval_seconds` | 目录扫描间隔 |
| `live.file_stable_seconds` | 判断文件写入完成的稳定时间 |
| `live.max_prefetch_seconds` | 服务端最多领先客户端播放的秒数 |
| `live.idle_prebuffer_frames` | 无语音时服务端待机帧窗口，默认 8 |
| `live.process_existing` | 启动时是否处理 `data/audio/` 中已有文件 |
| `live.extensions` | 接受的文件扩展名 |
| `audio_stream.window_frames` | 每个输出窗口对应的视频帧数 |
| `audio_stream.context_left_ms` | 窗口左侧真实音频上下文，默认 200 ms |
| `audio_stream.context_right_ms` | 窗口右侧 lookahead 上下文，默认 300 ms |
| `audio_stream.overlap_frames` | 段边界融合帧数，默认 4，设为 0 关闭 |
| `audio_stream.pause_overlap_frames` | 静音边界使用更长融合，默认 5 |
| `audio_stream.pause_boundary_frames` | 边界前后停顿检测范围，默认 6，0 关闭 |
| `audio_stream.max_pending_windows` | 上游音频窗口背压上限 |

## 缓存

avatar 缓存与 `scripts/realtime_inference.py` 共用：

```text
results/v15/avatars/<avatar_id>/
├── full_imgs/          # 正向 + 反向镜像帧
├── latents.pt          # VAE latents
├── coords.pkl          # 每帧 bbox
├── mask/               # 融合 mask
├── mask_coords.pkl     # mask 裁剪框
└── avator_info.json
```

每轮直播转码后的音频保存在 `results/live_audio/<timestamp>/`。
