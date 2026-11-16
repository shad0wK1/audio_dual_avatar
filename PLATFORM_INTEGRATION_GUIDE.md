# 数字人平台接入与接口使用说明

本文面向负责平台前端、平台后端和部署的同事，说明如何将本仓库的数字人能力接入外部平台。

适用范围：当前 `main` 分支，第一入口 `/avatar`、第二入口 `/omni`。

本文档覆盖平台可能访问的页面、公开 HTTP API、实时 WebSocket 和必要的诊断接口。
仅用于服务间通信的内部接口集中列在第 8 节。`/static/*` 是前端静态资源，不作为
平台业务 API；FastAPI 自动生成的 `/openapi.json` 只能描述 REST 路由，不包含
WebSocket 协议，不能替代本文档。

---

## 1. 先理解几个概念

### 1.1 平台业务 Session 与模型 Session 不是一回事

- **平台业务 Session**：平台自己的会话、用户、租户、工单或对话记录 ID。
- **模型 Session**：数字人服务在 WebSocket `/v1/realtime` 上维护的一次实时推理生命周期。

当前项目**没有**“创建一个模型 Session”的 REST 接口，例如 `POST /sessions`。

模型 Session 的建立过程是：

1. 客户端连接 `WSS /v1/realtime?mode=audio`；
2. 等待 `session.queue_done`；
3. 发送 `session.init`；
4. 收到包含 `session_id` 的 `session.created`。

`GET /api/sessions` 只是查询当前活跃任务，不是创建接口。

### 1.2 数字人画面与模型语音是两路数据

完整数字人链路包含：

```text
平台浏览器
  ├── WSS /v1/realtime?mode=audio
  │     └── Gateway -> Worker -> MiniCPM backend
  │
  └── WSS /avatar-live/ws/live
        └── Gateway -> MuseTalk 数字人口型服务

Gateway 的音频旁路：
  MiniCPM 输出音频 -> Gateway -> MuseTalk
```

平台如果只连接 `/v1/realtime`，可以得到模型文本和语音，但不会自动获得数字人口型视频。

平台如果使用项目自带的 `/avatar` 页面，则页面已经处理了模型 Session、数字人 viewer、音画同步和自动打断。

---

## 2. 推荐接入方式

### 2.1 方式一：单连接 Avatar Session API（推荐）

公共入口只有：

```text
POST /v1/avatar/sessions
WSS  /v1/avatar/sessions/{session_id}/stream?token=...
```

```http
POST /v1/avatar/sessions
Authorization: Bearer <api_key>
Content-Type: application/json

{"preset_id":"knowledge_host_720p","metadata":{"user_id":"u_123"}}
```

返回的 `stream_url` 同时传输控制 JSON、文字、WAV 音频和数字人视频帧。
平台不需要再连接 `/ws/live`、请求 WAV 或直接操作 MuseTalk。

浏览器应优先使用：

```js
import { AvatarSessionClient } from '/static/sdk/avatar-session-client.js';

const client = new AvatarSessionClient({
  canvas,
  presetId: 'knowledge_host_720p',
});
await client.connect();
await client.startMicrophone();
```

SDK 内部负责音频采集、H.264/WebP 解码、音画同步、ACK、打断与清理。
可访问 `/avatar-v2` 查看完整示例。

### 2.2 方式二：iframe 嵌入 `/avatar`

平台页面嵌入：

```html
<iframe
  src="https://dh.example.com:8006/avatar"
  title="实时数字人"
  allow="microphone; autoplay; fullscreen"
  style="width:100%;height:800px;border:0">
</iframe>
```

如果需要第二入口 `/omni` 的摄像头能力：

```html
allow="microphone; camera; autoplay; fullscreen"
```

优点：

- 平台无需实现 WebSocket 实时协议。
- 麦克风采集、Session 排队、数字人画面、口型、音频同步、自动打断均由页面处理。
- 适合快速完成平台试点和功能验证。

当前限制：

- 没有 `postMessage` 控制协议，平台暂时不能从外部设置系统提示词、用户 ID 或业务 Session ID。
- 页面使用自身默认提示词，也允许用户在页面内修改。
- 平台登录态不会自动传给数字人服务，需要反向代理或后续增加 Token 机制。

以下旧接入方式仍保留用于调试和兼容。

### 2.3 方式三：平台自研前端直接使用内部 WebSocket 协议

适合需要完全控制 UI、消息记录、角色设置和平台业务状态的场景。

平台前端需要负责：

1. 如需非默认形象，先调用 `/avatar-live/api/avatar/select` 选择本地已处理缓存；
2. 连接 `/avatar-live/ws/live` 获取数字人画面并发送 `ready`；
3. 采集并编码麦克风音频；
4. 连接 `/v1/realtime`，完成 Session 初始化；
5. 接收并处理文本和音频增量；
6. 拉取片段 WAV、播放音频、渲染帧、发送 ACK；
7. 处理自动打断、`flush`、超时和重连；
8. 关闭 Session 和释放麦克风。

建议直接复用：

- `minicpm_demo/static/duplex/lib/realtime-session.js`
- `minicpm_demo/static/avatar/avatar-player.js`
- `minicpm_demo/static/avatar/speech-interruptor.js`

### 2.4 方式四：平台后端代理 WebSocket

平台后端可以作为 WebSocket 代理，统一做鉴权、审计和多实例路由：

```text
平台浏览器 <-> 平台 WebSocket BFF <-> 数字人 Gateway
```

注意：

- 麦克风音频仍然来自平台用户浏览器，平台后端通常只做转发，不应假设后端能直接访问用户麦克风。
- 代理必须支持长连接、WebSocket Upgrade、二进制帧和至少 10 分钟读超时。
- 如果平台后端需要录制或分析模型输出，应分别处理模型音频和数字人 viewer 数据。

---

## 3. 服务地址与端口

假设数字人服务器可被平台用户访问的地址是：

```text
https://dh.example.com:8006
```

对应 WebSocket：

```text
wss://dh.example.com:8006/v1/realtime
wss://dh.example.com:8006/avatar-live/ws/live
```

| 端口 | 服务 | 是否对平台暴露 |
|---|---|---|
| `8006` | Gateway、页面、公开 API、WSS | 是 |
| `8007` | Gateway 内部 Worker 注册 | 否 |
| `22400` | Python Worker | 否 |
| `22500` | 模型 Backend | 否 |
| `8000` | MuseTalk 原始服务 | 否，仅 Gateway 内部访问 |

生产环境建议在 `8006` 前增加 Nginx、API Gateway 或统一接入层，对外只暴露 `443`。

---

## 4. 页面入口

| 接口 | 用途 |
|---|---|
| `GET /avatar` | 第一入口，纯音频数字人，带自动打断 |
| `GET /omni` | 第二入口，完整 Omni 页面，支持视频输入和高级设置 |
| `GET /` | 总入口页，列出已启用应用 |
| `GET /realtime` | 通用 Realtime 协议演示页 |
| `GET /audio_duplex` | 纯语音双工演示页 |
| `GET /half_duplex` | 半双工音频演示页 |
| `GET /turnbased` | 轮次对话演示页 |
| `GET /mobile-omni` | 移动版 Omni 页面；重定向到 `/mobile-omni/` |
| `GET /mobile` | 移动版预览页；重定向到 `/mobile/` |
| `GET /docs` | 静态接口文档入口；重定向到 `/docs/zh/` |
| `GET /s/{session_id}` | 会话回看页面 |

平台正式接入时通常只需要 `/avatar`；其他页面主要用于调试和管理。

辅助路由：

| 方法 | 接口 | 用途 |
|---|---|---|
| `GET` | `/openapi.json` | FastAPI 生成的 REST OpenAPI 描述；不包含 WebSocket |
| `GET`、`HEAD` | `/docs`、`/docs/en` | 静态文档入口重定向 |
| `GET`、`HEAD` | `/docs/zh/`、`/docs/en/` | 中英文静态文档 |
| `GET` | `/mobile/`、`/mobile-omni/` | 移动端页面本体 |
| `GET`、`HEAD` | `/mobile/{asset_path}` | 移动端构建产物 |
| `GET`、`HEAD` | `/static/{asset_path}` | 页面 JS、CSS、图片等静态资源 |

---

## 5. 核心 Session 接口

### 5.1 连接地址

```text
WSS /v1/realtime?mode=audio
WSS /v1/realtime?mode=video
WSS /v1/realtime?mode=chat
```

| mode | 输入 | 输出 | 最大会话时长 |
|---|---|---|---|
| `audio` | 麦克风音频 | listen、文本、24kHz 音频 | 600 秒 |
| `video` | 麦克风音频、可选 JPEG 视频帧 | listen、文本、24kHz 音频 | 300 秒 |
| `chat` | 一次提交 messages | 文本、可选音频 | 单轮请求 |

数字人第一入口使用 `mode=audio`。

**必须显式传 `mode`。** Gateway 在未传 `mode` 时默认使用 `video`，而不是
`audio`，对应 300 秒会话上限。数字人接入应始终连接：

```text
WSS /v1/realtime?mode=audio
```

`mode` 不是 `audio`、`video`、`chat` 之一时，服务端以 WebSocket close code
`1008` 拒绝连接。平台不应依赖默认值。

### 5.2 推荐连接参数

```text
wss://host/v1/realtime
  ?mode=audio
  &client_id=<平台用户或设备ID>
  &page_session_id=<平台页面会话ID>
  &page_route=<平台来源页面>
  &client_surface=<web|desktop|mobile>
```

服务端会把这些参数写入 Session 记录，用于运营排查。它们是可选的匿名标识，不是认证凭据。

如果平台有正式业务 Session ID，建议映射到 `client_id` 或 `page_session_id`。

### 5.3 基本时序

```text
Client -> Gateway
  Client: WebSocket 连接
  Server: session.queued              （有排队时）
  Server: session.queue_update        （排队位置更新）
  Server: session.queue_done
  Client: session.init
  Server: session.created
  Client: input.append
  Server: response.output.delta
  Client: session.close
  Server: session.closed
```

客户端**不要在 `session.queue_done` 之前发送 `session.init`**。

### 5.4 初始化

```json
{
  "type": "session.init",
  "payload": {
    "system_prompt": "你是一名专业、亲切的中文知识传播助手……",
    "config": {
      "length_penalty": 1.1
    },
    "use_tts": true,
    "voice": {
      "ref_audio_base64": "<可选，base64 float32 PCM>",
      "tts_ref_audio_base64": "<可选，base64 float32 PCM>"
    }
  }
}
```

成功响应：

```json
{
  "type": "session.created",
  "session_id": "sess_xxx",
  "mode": "full_duplex",
  "metrics": {
    "backend": "pytorch",
    "kv_cache_length": 70
  }
}
```

`session_id` 由服务端生成，客户端不能自行指定。

### 5.5 提交音频

```json
{
  "type": "input.append",
  "input": {
    "audio": "<base64 float32 PCM>",
    "force_listen": false
  }
}
```

音频约束：

- 采样率：16000 Hz
- 声道：单声道
- 样本类型：little-endian float32
- 编码：base64
- 不使用 WAV、MP3 或其他容器封装

当前数字人页面每 1 秒提交一批音频。

视频模式可附带：

```json
{
  "video_frames": ["<base64 JPEG>", "<base64 JPEG>"],
  "max_slice_nums": 1
}
```

`force_listen=true` 表示要求模型停止输出并回到倾听状态。平台自动打断时应发送该字段。

### 5.6 接收输出

模型继续听：

```json
{
  "type": "response.output.delta",
  "kind": "listen"
}
```

文本增量：

```json
{
  "type": "response.output.delta",
  "kind": "text",
  "text": "这是一段增量文本",
  "response_id": "resp_xxx",
  "session_id": "sess_xxx"
}
```

音频增量：

```json
{
  "type": "response.output.delta",
  "kind": "audio",
  "audio": "<base64 float32 PCM>",
  "response_id": "resp_xxx",
  "session_id": "sess_xxx"
}
```

输出音频约束：

- 采样率：24000 Hz
- 声道：单声道
- 样本类型：little-endian float32
- 编码：base64

文本和音频是独立增量，不保证一一对应。

### 5.7 关闭

```json
{
  "type": "session.close",
  "reason": "user_stop"
}
```

服务端会尽力返回：

```json
{
  "type": "session.closed",
  "reason": "user_stop"
}
```

达到时长上限时，服务端会发送 `reason=timeout`。

### 5.8 错误与排队

常见服务端事件：

```json
{"type":"session.queued","position":2,"estimated_wait_s":60,"ticket_id":"q_xxx"}
{"type":"session.queue_update","position":1,"estimated_wait_s":30}
{"type":"session.queue_done"}
{"type":"error","error":{"code":"queue_full","message":"Queue full","type":"server_error"}}
```

平台应处理：

- `queue_full`
- `no worker available`
- WebSocket 非正常关闭
- 600 秒音频 Session 超时
- 服务端 `session.closed`

---

## 6. 数字人 viewer 接口

### 6.1 建立 viewer

如果平台使用自带 `/avatar` 页面，本节由页面处理。

如果平台自研 UI，需要在模型开始输出前连接：

```text
WSS /avatar-live/ws/live?video_codec=h264
WSS /avatar-live/ws/live?video_codec=webp
```

`video_codec` 可选值为 `h264`、`webp`、`jpeg`。不传时使用服务端
`AVATAR_STREAM_FORMAT`，当前默认是 `h264`。客户端不支持 WebCodecs 时应显式使用
`video_codec=webp`。

连接成功后立即发送：

```json
{"type":"ready"}
```

服务端会先返回：

```json
{
  "type": "meta",
  "fps": 24,
  "prebuffer": 32,
  "max_prefetch_seconds": 4,
  "frame_header_bytes": 24,
  "video_codec": "h264",
  "codec_string": "avc1.4D4028",
  "width": 480,
  "height": 864
}
```

### 6.2 控制消息

服务端可能发送：

```json
{
  "type": "segment",
  "id": 3,
  "duration": 1.0,
  "total_frames": 24,
  "start_frame": 20,
  "start_pts_us": 833333,
  "audio_url": "/api/live/audio/3"
}
```

`audio_url` 是 Gateway 从 MuseTalk 原样透传的**上游路径**，不能直接作为平台
请求地址。平台经 Gateway 访问时必须拼接 `/avatar-live` 前缀：

```javascript
const gatewayAudioUrl = `/avatar-live${segment.audio_url}`;
// /avatar-live/api/live/audio/3
const response = await fetch(gatewayAudioUrl, { cache: "no-store" });
```

如果平台复用了其他路径前缀或网关域名，应采用等价映射；直接把
`segment.audio_url` 交给 `fetch` 会请求 Gateway 上不存在的
`/api/live/audio/{id}`。

```json
{"type":"segment_end","segment_id":3}
```

```json
{"type":"flush","frame_index":42}
```

```json
{"type":"error","message":"数字人推理或编码线程异常"}
```

```json
{"type":"live_end","reason":"idle_timeout"}
```

`flush` 表示模型被打断或回答被清空。客户端应立即停止旧音频、丢弃旧帧和旧片段，并从 `frame_index` 之后重新播放。

### 6.3 二进制帧格式

默认 H.264 格式下，每个 WebSocket binary message 携带一个 H.264 Annex-B
Access Unit：

```text
[24 字节 MTH1 头][H.264 Annex-B Access Unit]
```

头部采用 big-endian：

| 偏移 | 类型 | 字段 |
|---:|---|---|
| 0 | `4s` | magic，固定 `MTH1` |
| 4 | `uint8` | kind；0=idle，1=generated，2=silent |
| 5 | `uint8` | codec；1=H.264 |
| 6 | `uint8` | flags；bit 0=1 表示 IDR 关键帧 |
| 7 | `1 byte` | 保留 |
| 8 | `uint32` | segment_id；`0xffffffff` 表示 idle |
| 12 | `int64` | pts_us |
| 20 | `uint32` | frame_index |

H.264 必须由浏览器 `WebCodecs VideoDecoder` 解码：

```javascript
decoder.configure({
  codec: meta.codec_string,
  codedWidth: meta.width,
  codedHeight: meta.height,
  optimizeForLatency: true,
  avc: { format: "annexb" },
});
```

收到帧后构造 `EncodedVideoChunk`，`timestamp` 使用帧头中的 `pts_us`。解码输出
`VideoFrame` 后再按音频主时钟绘制到 Canvas，并在使用后调用 `VideoFrame.close()`。

`flush` 后必须 reset 解码器，丢弃所有非关键帧，直到收到新的 IDR。服务端在
`flush` 后会重启 H.264 编码器并立即产生新的 IDR，因此不依赖长 GOP 等待。
正常运行时默认每 120 帧插入一个周期性 IDR。

#### WebP/JPEG 回退格式

请求 `video_codec=webp` 或 `video_codec=jpeg` 时，每个 WebSocket binary message
仍使用原有 `MTF1` 格式：

```text
[24 字节 MTF1 头][编码后的单帧图片]
```

| 偏移 | 类型 | 字段 |
|---:|---|---|
| 0 | `4s` | magic，固定 `MTF1` |
| 4 | `uint8` | kind |
| 5-7 | `3 bytes` | 保留 |
| 8 | `uint32` | segment_id |
| 12 | `int64` | pts_us |
| 20 | `uint32` | frame_index |

图片负载可通过文件头判断：

- WebP：前 4 字节 `RIFF`，第 8-11 字节 `WEBP`
- JPEG：前 2 字节 `FF D8`

H.264 编码参数可通过以下环境变量调整：

| 环境变量 | 默认值 |
|---|---|
| `AVATAR_STREAM_FORMAT` | `h264` |
| `AVATAR_H264_CODEC_STRING` | `avc1.4D4028` |
| `AVATAR_H264_BITRATE` | `2M` |
| `AVATAR_H264_MAXRATE` | `3M` |
| `AVATAR_H264_BUFSIZE` | `2M` |
| `AVATAR_H264_GOP` | `120` |
| `AVATAR_H264_PRESET` | `ultrafast` |
| `AVATAR_H264_PROFILE` | `main` |
| `AVATAR_H264_LEVEL` | `4.0` |

### 6.4 片段音频

收到 `segment` 后，请求：

```text
GET /avatar-live/api/live/audio/{segment_id}
```

接口返回 `audio/wav`，响应带 `Cache-Control: no-store`。示例中的
`segment.audio_url` 需要按 6.2 节说明拼接 `/avatar-live` 后使用。

返回 WAV。平台应以音频为主时钟，在音频就绪后同步播放对应帧，不要先播放画面。

### 6.5 ACK

客户端需要定期回传播放进度：

```json
{
  "type": "ack",
  "frame_index": 120,
  "pts_us": 5000000,
  "kind": "speech"
}
```

建议每 6 帧发送一次 ACK，并在一个片段最后一帧额外发送一次。

`kind` 可为：

- `speech`
- `silent`
- `idle`

不发送 ACK 会导致服务端预取达到上限并停止继续发送。

### 6.6 自动打断与恢复

项目参考实现：

1. 检测用户持续说话；
2. 本地立即停止旧音频和旧画面；
3. 在下一次 `input.append` 中发送 `force_listen=true`；
4. Gateway 将 `force_listen` 上升沿转换为 MuseTalk `flush`；
5. viewer 收到 `flush` 后清理旧片段；
6. 如果 2500ms 内没有收到 `flush`，播放器重连 viewer 并恢复。

平台自研前端需要实现等价逻辑，否则可能出现“旧回答继续播放”或“打断后永久黑屏”。

---

## 7. HTTP 状态与管理接口

### 通用约定

- 除音频和二进制资源外，请求与响应均使用 JSON，字符集为 UTF-8。
- Gateway 自身的 HTTP 错误通常返回 `{"detail": "..."}`；avatar 选择错误会返回
  `{"detail": {"code": "...", "message": "..."}}`。
- 数字人代理接口可能原样透传 MuseTalk 的响应体，因此不要假设所有错误都只有
  `detail` 一个字段。
- `POST /api/sessions/{id}/upload-recording` 是唯一使用
  `multipart/form-data` 的业务接口。
- WebSocket 错误不使用 HTTP 状态码表达业务失败，应读取 `error`、`session.closed`
  或 close code。

### 7.1 健康检查

| 方法 | 接口 | 用途 |
|---|---|---|
| `GET` | `/health` | Gateway 健康检查 |
| `GET` | `/status` | Worker 数量、忙碌数量、队列状态 |
| `GET` | `/workers` | Worker 明细 |
| `GET` | `/avatar-live/api/status` | MuseTalk 数字人服务状态 |
| `GET` | `/avatar-live/api/avatars` | 本地已预处理 avatar 缓存列表 |
| `GET` | `/avatar-live/api/avatar` | 当前激活的 avatar |
| `POST` | `/avatar-live/api/avatar/select` | 选择 avatar；传空对象恢复 config 默认值 |
| `GET` | `/avatar-live/api/avatar-presets` | 聚合形象、提示词和音色的预设列表 |
| `GET` | `/avatar-live/api/avatar-presets/{id}/ref-audio` | 获取指定预设的参考音频 |
| `POST` | `/avatar-live/api/avatar-presets/{id}/activate` | 激活预设并返回绑定内容 |

平台启动前至少要检查：

```text
GET /health -> 200
GET /status -> total_workers > 0
GET /avatar-live/api/status -> ready=true
```

#### 响应结构

`GET /health`：

```json
{
  "status": "healthy",
  "timestamp": "2026-11-03T10:13:21.753525"
}
```

`GET /status`：

```json
{
  "gateway_healthy": true,
  "total_workers": 1,
  "idle_workers": 1,
  "busy_workers": 0,
  "duplex_workers": 0,
  "loading_workers": 0,
  "error_workers": 0,
  "offline_workers": 0,
  "queue_length": 0,
  "max_queue_size": 1000,
  "running_tasks": []
}
```

`running_tasks` 中每项包含 `worker_id`、`request_type`、`started_at`、
`elapsed_s`、`estimated_remaining_s`。Gateway 尚未初始化 WorkerPool 时，
`/status` 和 `/workers` 返回 HTTP 503。

`GET /workers`：

```json
{
  "total": 1,
  "workers": [
    {
      "worker_id": "worker-0",
      "host": "127.0.0.1",
      "port": 22400,
      "gpu_id": 0,
      "gpu_group": "gpu-0",
      "labels": {},
      "status": "idle",
      "current_ticket_id": null,
      "total_requests": 0,
      "avg_inference_time_ms": 0.0,
      "last_heartbeat": "2026-11-03T10:18:11.378701",
      "current_request_type": null,
      "task_started_at": null,
      "capabilities": [
        "chat",
        "streaming",
        "half_duplex_audio",
        "audio_duplex",
        "omni_duplex"
      ]
    }
  ]
}
```

`status` 取值包括 `idle`、`busy_chat`、`busy_half_duplex`、
`duplex_active`、`duplex_paused`、`loading`、`error`、`offline`。

`GET /avatar-live/api/avatar`：

```json
{
  "avatar_id": "knowledge_host_720p",
  "default_avatar_id": "knowledge_host_720p",
  "avatar_revision": 7,
  "avatar_ready": true,
  "avatar_switching": false,
  "width": 768,
  "height": 1344
}
```

`GET /avatar-live/api/status` 是 MuseTalk 状态响应的原样代理。稳定字段包括
`status`、`ready`、`accepting_streams`、`avatar_id`、`default_avatar_id`、
`avatar_revision`、`avatar_ready`、`avatar_switching`、`fps`、
`prebuffer`、`width`、`height`、`viewer_connected`、`stream_connected`、
`queued_segments`、`generating_segments`、`latest_media_segment_id`、
`ack_frame`、`exit_reason`。该响应可能随 MuseTalk 版本增加字段，客户端应忽略
未知字段，不要对字段集合做严格相等校验。

数字人代理接口在 MuseTalk 不可达时通常返回 HTTP 502；avatar 功能未配置时返回
HTTP 404；MuseTalk 自身返回的状态码会尽量原样透传。

### 7.2 队列

| 方法 | 接口 | 用途 |
|---|---|---|
| `GET` | `/api/queue` | 当前队列快照 |
| `GET` | `/api/queue/{ticket_id}` | 单张排队凭证 |
| `DELETE` | `/api/queue/{ticket_id}` | 取消排队，管理接口 |
| `GET` | `/api/config/eta` | ETA 配置和估算状态 |
| `PUT` | `/api/config/eta` | 修改 ETA，管理接口 |

`GET /api/queue` 响应：

```json
{
  "queue_length": 1,
  "max_queue_size": 1000,
  "items": [
    {
      "ticket_id": "q_xxx",
      "request_type": "audio_duplex",
      "position": 1,
      "estimated_wait_s": 30.0,
      "enqueued_at": "2026-11-03T10:20:00",
      "wait_elapsed_s": 5.0
    }
  ],
  "running_tasks": []
}
```

`GET /api/queue/{ticket_id}` 找不到排队项时返回 200 和：

```json
{
  "found": false,
  "message": "Ticket not in queue (may have been assigned or cancelled)"
}
```

存在时返回 `{"found": true, "ticket": {...}}`。`DELETE /api/queue/{ticket_id}`
返回 `{"success": true|false}`，属于管理操作。

`GET /api/config/eta` 响应：

```json
{
  "config": {
    "eta_chat_s": 15.0,
    "eta_half_duplex_s": 180.0,
    "eta_audio_duplex_s": 120.0,
    "eta_omni_duplex_s": 90.0,
    "ema_alpha": null
  },
  "ema_alpha": 0.3,
  "ema_chat_s": null,
  "ema_half_duplex_s": null,
  "ema_audio_duplex_s": 36.59,
  "ema_omni_duplex_s": null,
  "ema_chat_samples": 0,
  "ema_half_duplex_samples": 0,
  "ema_audio_duplex_samples": 9,
  "ema_omni_duplex_samples": 0
}
```

`PUT /api/config/eta` 接受包含任意 ETA 基准字段的 JSON 对象，字段为
`eta_chat_s`、`eta_half_duplex_s`、`eta_audio_duplex_s`、
`eta_omni_duplex_s`、`ema_alpha`，未传字段使用默认值。该接口会修改运行时配置，
生产环境应作为管理接口保护。

### 7.3 会话查询与回看

| 方法 | 接口 | 用途 |
|---|---|---|
| `GET` | `/sessions` | `/api/sessions` 的兼容别名 |
| `GET` | `/api/sessions` | 当前活跃任务 |
| `GET` | `/api/sessions/{session_id}` | 会话元数据 |
| `GET` | `/api/sessions/{session_id}/recording` | 完整事件流 |
| `GET` | `/api/sessions/{session_id}/download` | 下载会话 ZIP |
| `GET`、`HEAD` | `/api/sessions/{session_id}/assets/{path}` | 下载录音、视频等资源 |
| `POST` | `/api/sessions/{session_id}/upload-recording` | 上传前端录制文件 |
| `POST` | `/api/sessions/{session_id}/comment` | 写评语 |
| `GET` | `/api/sessions/{session_id}/comment` | 读评语 |

`GET /api/sessions` 或 `GET /sessions` 只返回 Gateway 当前占用 Worker 的任务，
不返回历史 Session，也不能用于创建 Session：

```json
{
  "total": 1,
  "sessions": [
    {
      "ticket_id": "q_xxx",
      "worker_id": "worker-0",
      "messages_hash": "",
      "last_active": "2026-11-03T10:20:05.123456"
    }
  ]
}
```

`GET /api/sessions/{session_id}` 原样返回该 Session 的 `meta.json`，不存在时
返回 HTTP 404。`GET /api/sessions/{session_id}/recording` 返回：

```json
{
  "session_id": "sess_xxx",
  "meta": {},
  "events": [
    {
      "seq": 1,
      "ts": "2026-11-03T10:20:00.000000",
      "dir": "up",
      "frame": {}
    }
  ]
}
```

事件流中的二进制资源使用 `@blob/NNN.ext` 指针；去掉开头的 `@` 后，通过
`/api/sessions/{session_id}/assets/{path}` 获取。资源接口支持 `GET` 和 `HEAD`，
并校验 `session_id` 及资源路径，禁止目录穿越。

`GET /api/sessions/{session_id}/download` 返回 ZIP：

```text
Content-Type: application/zip
Content-Disposition: attachment; filename={session_id}.zip
```

`POST /api/sessions/{session_id}/upload-recording` 使用 `multipart/form-data`，
文件字段名必须为 `file`：

```http
POST /api/sessions/{session_id}/upload-recording
Content-Type: multipart/form-data

file=<binary audio/video>
```

允许的 MIME 类型为 `video/webm`、`video/mp4`、`audio/wav`、`audio/webm`，
最大 200 MB。成功响应：

```json
{
  "status": "ok",
  "path": "frontend_replay.webm",
  "size_bytes": 12345678
}
```

`POST /api/sessions/{session_id}/comment` 请求体：

```json
{"comment": "本次会话的评语"}
```

评语最长 2000 字符，空字符串会删除已有评语。成功响应为
`{"status":"ok","len":10}`。`GET /api/sessions/{session_id}/comment` 返回
`{"comment":"..."}`，没有评语时返回空字符串。

### 7.4 预设与参考音频

| 方法 | 接口 | 用途 |
|---|---|---|
| `GET` | `/api/apps` | 启用中的应用和入口 |
| `GET` | `/api/frontend_defaults` | 前端默认配置 |
| `GET` | `/api/presets` | 预设列表 |
| `GET` | `/api/presets/{mode}/{preset_id}/audio` | 预设音频 |
| `GET` | `/api/default_ref_audio` | 默认参考音频 |
| `GET` | `/api/avatar_ref_audio` | `/avatar` 专属参考音频 |
| `GET` | `/api/assets/ref_audio` | 参考音频列表 |
| `POST` | `/api/assets/ref_audio` | 上传参考音频 |
| `DELETE` | `/api/assets/ref_audio/{id}` | 删除参考音频 |

如果平台不开放音色切换，可以不暴露这组接口。

`GET /api/apps`：

```json
{
  "apps": [
    {
      "app_id": "avatar",
      "name": "Digital Human",
      "route": "/avatar"
    }
  ]
}
```

`GET /api/frontend_defaults`：

```json
{
  "playback_delay_ms": 200,
  "default_lang": "zh"
}
```

`default_lang` 只在 Gateway 启动时指定 `--lang` 后出现。

`GET /api/presets` 按模式返回预设元数据。`audio_duplex` 和 `omni` 项通常包含
`id`、`order`、`name`、`description`、`system_prompt`、`ref_audio`；
`half_duplex_audio` 项通常包含 `system_content`。音频字段中的 `data` 为 `null`，
实际音频通过下一个接口按需获取：

```json
{
  "audio_duplex": [
    {
      "id": "chinese_call",
      "order": 1,
      "name": "中文通话",
      "description": "中文语音助手",
      "system_prompt": "...",
      "ref_audio": {
        "data": null,
        "path": "assets/ref_audio/ref_minicpm_signature.wav",
        "name": "ref_minicpm_signature.wav",
        "duration": 6.0
      }
    }
  ]
}
```

YAML 预设允许扩展字段，平台应以 `id`、`name`、`system_prompt` 或
`system_content` 为主要字段，并忽略不认识的字段。

`GET /api/presets/{mode}/{preset_id}/audio` 返回按需加载的音频数据：

```json
{
  "ref_audio": {
    "data": "<base64 float32 PCM，16kHz mono>",
    "name": "ref_minicpm_signature.wav",
    "duration": 6.0
  },
  "system_content_audio": []
}
```

只返回预设实际存在的部分；预设不存在时返回 HTTP 404。

`GET /api/default_ref_audio`、`GET /api/avatar_ref_audio` 和预设参考音频接口
返回同一种结构：

```json
{
  "name": "ref_avatar_default.wav",
  "duration": 6.0,
  "sample_rate": 16000,
  "samples": 96000,
  "base64": "<base64 float32 little-endian PCM>"
}
```

该 `base64` 不含 WAV 容器头，可直接作为 `session.init` 中
`ref_audio_base64` 或 `tts_ref_audio_base64` 的值。

`GET /api/assets/ref_audio`：

```json
{
  "total": 1,
  "ref_audios": [
    {
      "id": "uuid",
      "name": "自定义音色",
      "filename": "uuid.wav",
      "source_type": "upload",
      "duration_ms": 6000,
      "sample_rate": 16000,
      "created_at": "2026-11-03T10:20:00"
    }
  ]
}
```

`POST /api/assets/ref_audio` 请求体：

```json
{
  "name": "自定义音色",
  "audio_base64": "<base64 编码的音频文件>"
}
```

服务会把输入音频统一转换为 16kHz、单声道、16-bit PCM WAV。成功响应包含
`success`、`id`、`name`、`message`。`DELETE /api/assets/ref_audio/{id}`
返回同样的操作响应，目标不存在时返回 HTTP 404。参考音频注册表未初始化时，
三个素材接口返回 HTTP 503。

`/omni` 继续使用全局声线：

```json
{
  "audio": {
    "ref_audio_path": "assets/ref_audio/ref_minicpm_signature.wav",
    "avatar_ref_audio_path": "assets/ref_audio/ref_avatar_default.wav"
  }
}
```

- `ref_audio_path` 继续作为 `/omni`、preset 和其他 TTS 入口的默认音色；
- `/api/avatar_ref_audio` 是兼容接口，返回 `avatar_presets.yaml` 中默认预设的
  参考音频；
- 新的 `/avatar` 页面通过 `/avatar-live/api/avatar-presets/{id}/ref-audio`
  获取当前预设音频，并同时放入 `ref_audio_base64` 和 `tts_ref_audio_base64`；
- 该配置不会修改 `/omni` 或参考音频 preset。

### 7.5 Avatar 缓存选择

服务端只会扫描已经预处理完成的本地缓存，不会根据参考视频动态生成形象。
缓存目录为：

```text
musetalk_project/MuseTalk/results/v15/avatars/<avatar_id>/
```

默认 avatar 来自 `configs/streaming_duplex_knowledge.yaml` 的 `avatar.id`。
服务启动时加载该默认缓存。仓库内置 `knowledge_host_720p`、
`musetalk_test_avatar` 和 `ecommerce` 三套完整缓存，无需在部署环境重新生成。

#### 配置化形象预设

`/avatar` 的形象、参考音频和提示词绑定统一由以下文件定义：

```text
minicpm_demo/assets/avatar_presets.yaml
```

路径相对于 `minicpm_demo/`。配置示例：

```yaml
version: 1
default_preset: knowledge_host_720p

presets:
  knowledge_host_720p:
    name: 知识分享
    description: 720p 知识传播数字人
    avatar_id: knowledge_host_720p
    voice_ref: assets/ref_audio/ref_avatar_default.wav
    prompt_file: assets/prompts/avatar/knowledge_host.txt
    order: 10
    enabled: true

  musetalk_test_avatar:
    name: 经典形象
    description: 480×864 经典数字人
    avatar_id: musetalk_test_avatar
    voice_ref: assets/ref_audio/ref_minicpm_signature.wav
    prompt_file: assets/prompts/avatar/classic.txt
    order: 20
    enabled: true

  ecommerce:
    name: 电商小选
    description: 电商导购数字人
    avatar_id: ecommerce
    voice_ref: assets/ref_audio/ref_minicpm_signature.wav
    prompt_file: assets/prompts/avatar/ecommerce.txt
    order: 30
    enabled: true
```

新增形象时必须同时增加配置项。仅把缓存目录放入
`results/v15/avatars/` 不会自动获得提示词和音色绑定，也不会出现在前端卡片中。
修改 YAML 后下一次请求即生效，无需重启 Gateway。

#### 查询预设

```http
GET /avatar-live/api/avatar-presets
```

响应示例：

```json
{
  "default_preset_id": "knowledge_host_720p",
  "active_avatar_id": "knowledge_host_720p",
  "avatar_revision": 3,
  "presets": [
    {
      "id": "knowledge_host_720p",
      "name": "知识分享",
      "description": "720p 知识传播数字人",
      "avatar_id": "knowledge_host_720p",
      "order": 10,
      "available": true,
      "error": null,
      "cache": {
        "valid": true,
        "width": 768,
        "height": 1344,
        "frame_count": 690
      },
      "prompt": {
        "name": "knowledge_host.txt",
        "sha256": "<sha256>",
        "text": "<完整提示词>"
      },
      "voice": {
        "name": "ref_avatar_default.wav",
        "duration": 16.6,
        "audio_url": "/avatar-live/api/avatar-presets/knowledge_host_720p/ref-audio"
      }
    }
  ]
}
```

前端根据 `presets` 数组数量动态生成卡片，不限制形象数量。无效预设仍会返回，
但 `available=false` 且 `error` 给出原因。

#### 获取预设参考音频

```http
GET /avatar-live/api/avatar-presets/{preset_id}/ref-audio
```

返回 16 kHz 单声道 float32 PCM base64，可直接用于 `session.init.voice`。

#### 激活预设

```http
POST /avatar-live/api/avatar-presets/{preset_id}/activate
```

该接口先校验缓存、音色和提示词，再调用底层 avatar 切换接口，成功后返回当前预设
的提示词、音色信息和新的缓存尺寸。失败时不会改变当前已激活缓存。

成功响应包含列表项的全部字段，并额外返回本次实际激活尺寸：

```json
{
  "success": true,
  "id": "musetalk_test_avatar",
  "avatar_id": "musetalk_test_avatar",
  "width": 480,
  "height": 864,
  "avatar_revision": 4,
  "prompt": {
    "name": "classic.txt",
    "sha256": "<sha256>",
    "text": "<完整提示词>"
  },
  "voice": {
    "name": "ref_minicpm_signature.wav",
    "duration": 6.0,
    "audio_url": "/avatar-live/api/avatar-presets/musetalk_test_avatar/ref-audio"
  }
}
```

预设配置中的相对路径必须位于 `minicpm_demo/` 以内。绝对路径、`../` 越界和
符号链接逃逸都会被拒绝。前端以提示词 SHA-256 区分提示词版本，同一预设下不同
版本不会错误复用旧的 localStorage 草稿。

#### 底层缓存接口（兼容）

以下接口继续保留，供内部切换和兼容调用：

```http
GET /avatar-live/api/avatars
```

响应示例：

```json
{
  "default_avatar_id": "knowledge_host_720p",
  "active_avatar_id": "knowledge_host_720p",
  "avatar_revision": 1,
  "avatar_ready": true,
  "avatar_switching": false,
  "avatars": [
    {
      "id": "knowledge_host_720p",
      "valid": true,
      "width": 768,
      "height": 1344,
      "frame_count": 690,
      "source_frame_count": 345,
      "error": null
    },
    {
      "id": "musetalk_test_avatar",
      "valid": true,
      "width": 480,
      "height": 864,
      "frame_count": 690,
      "source_frame_count": 345,
      "error": null
    }
  ]
}
```

`valid=false` 的缓存也会返回，但 `error` 会说明缺文件、帧数不一致或解码失败等
原因。这类缓存不能激活。

#### 选择指定缓存

```http
POST /avatar-live/api/avatar/select
Content-Type: application/json
```

```json
{
  "avatar_id": "musetalk_test_avatar"
}
```

成功响应：

```json
{
  "success": true,
  "id": "musetalk_test_avatar",
  "valid": true,
  "width": 480,
  "height": 864,
  "frame_count": 690,
  "source_frame_count": 345,
  "error": null,
  "default_avatar_id": "knowledge_host_720p",
  "active_avatar_id": "musetalk_test_avatar",
  "avatar_revision": 2
}
```

#### 恢复 config 默认缓存

请求体为空对象时不传 `avatar_id`，服务会重新激活 config 中的默认缓存：

```http
POST /avatar-live/api/avatar/select
Content-Type: application/json

{}
```

也可以显式传：

```json
{
  "avatar_id": null
}
```

#### 调用顺序

切换 avatar 会导致画面分辨率变化，并重新加载整份缓存，因此必须按以下顺序：

```text
POST /avatar-live/api/avatar/select
  -> WSS /avatar-live/ws/live
  -> WSS /v1/realtime?mode=audio
```

不能在会话进行中切换。存在以下任一状态时，选择新缓存会返回
`409 avatar_busy`：

- 已有 viewer 连接；
- 已有 `/ws/audio` 或 `/ws/minicpm` 上游连接；
- 仍有帧正在推理生成。

如果请求的 avatar 与当前已激活 avatar 相同，接口幂等返回成功，不会重新加载。

项目自带的 `/avatar` 页面在系统提示词上方根据
`/avatar-live/api/avatar-presets` 动态显示形象卡片。点击卡片会立即激活预设，
加载该预设的提示词和参考音频；开始对话时使用用户当前看到/编辑后的提示词和
预设绑定的音色。

切换期间，新 viewer 和音频上游会暂时收到 `avatar_switching` 或
`avatar_unavailable`。切换失败时会尝试恢复之前的 avatar，并将目标缓存标记为
不可用。

错误示例：

```json
{
  "detail": {
    "code": "avatar_not_found",
    "message": "Avatar cache not found: unknown"
  }
}
```

主要错误码：

| HTTP | code | 含义 |
|---:|---|---|
| 404 | `avatar_not_found` | 缓存目录不存在或 ID 非法 |
| 409 | `avatar_busy` | 当前有活跃 viewer、音频流或推理任务 |
| 409 | `avatar_switching` | 另一个切换请求正在执行 |
| 422 | `avatar_invalid` | 缓存结构不完整或内容不一致 |
| 500 | `avatar_activation_failed` | 加载失败 |
| 503 | `avatar_unavailable` | 模型运行时尚未初始化 |
| 404 | `avatar_preset_voice_error` | 预设音色文件不存在或无法解码 |
| 422 | `avatar_preset_unavailable` | 预设缓存、提示词或音色不可用 |
| 500 | `avatar_preset_config_error` | 预设 YAML 配置或引用文件无效 |

平台只需访问 Gateway 的 `8006`。MuseTalk 的 `8000` 端口及其内部
`/api/avatar/select` 不应对平台暴露。

### 7.6 缓存与运维接口

`GET /cache` 返回 Gateway 侧 Worker 缓存状态摘要：

```json
{
  "workers": [
    {
      "worker_id": "worker-0",
      "status": "idle"
    }
  ]
}
```

该接口只用于运维诊断，不参与 Session 创建或业务调度。WorkerPool 未初始化时返回
HTTP 503。

静态文档保留了以下兼容跳转，平台一般只需使用 `/docs`：

| 方法 | 接口 | 目标 |
|---|---|---|
| `GET`、`HEAD` | `/docs/overview` | `/docs/zh/realtime-api/overview/` |
| `GET`、`HEAD` | `/docs/video` | `/docs/zh/realtime-api/video/` |
| `GET`、`HEAD` | `/docs/audio` | `/docs/zh/realtime-api/audio/` |
| `GET`、`HEAD` | `/docs/en/overview` | `/docs/en/realtime-api/overview/` |
| `GET`、`HEAD` | `/docs/en/video` | `/docs/en/realtime-api/video/` |
| `GET`、`HEAD` | `/docs/en/audio` | `/docs/en/realtime-api/audio/` |

至此，本文档覆盖了 Gateway 的全部非内部 HTTP 路由、两个对外 WebSocket
（`/v1/realtime`、`/avatar-live/ws/live`）以及页面和静态文档入口。内部注册与
后端协议见下一节。FastAPI 的 `/openapi.json` 可用于核对 REST 路径，但其中不含
WebSocket 消息协议，也没有本文档中的音视频帧格式。

---

## 8. 不应暴露给平台的内部接口

以下接口只用于本项目内部服务通信：

- `GET http://gateway:8007/health`
- `PUT http://gateway:8007/internal/workers/{worker_id}`
- `WSS http://worker:22400/v1/worker/chat`
- `WSS http://worker:22400/v1/worker/duplex`
- `WSS http://backend:22500/backend`
- `POST http://backend:22500/sessions/{session_id}/close`
- `WSS http://musetalk:8000/ws/audio`
- `WSS http://musetalk:8000/ws/minicpm`
- `WSS http://musetalk:8000/ws/live`（平台应使用 gateway 的 `/avatar-live/ws/live`）
- `POST /api/_debug/record_trace`
- `GET /admin`
- `GET /api/admin/apps`
- `PUT /api/admin/apps/{app_id}`

生产环境不要公开 `8000`、`8007`、`22400`、`22500`。

---

## 9. 鉴权、跨域和部署

### 9.1 当前鉴权状况

当前项目没有平台级登录、Token 验证、租户隔离或 RBAC。

必须在生产环境增加：

- 平台统一登录态校验；
- API Token / Cookie / HMAC 签名；
- WebSocket 连接鉴权；
- 用户和业务 Session 白名单；
- 速率限制；
- Origin 白名单。

### 9.2 HTTPS 与 iframe

- 平台和数字人服务都必须使用 HTTPS。
- 麦克风只在 Secure Context 下可用。
- 自签名证书会导致 Chrome 拒绝麦克风或阻止 iframe 加载，正式环境必须换成可信证书。
- iframe 必须声明 `allow="microphone; autoplay; fullscreen"`。

### 9.3 跨域

当前 Gateway 没有配置 CORS Middleware。

- iframe 页面内部访问同源资源不受普通 CORS 影响。
- 平台前端如果跨域 `fetch('/api/...')`，会被浏览器拦截。
- 如果确实需要跨域 REST，必须在 Gateway 或反向代理增加明确的 CORS 白名单。
- WebSocket 虽然不受普通 CORS 限制，但仍需要鉴权和 Origin 校验。

### 9.4 反向代理

代理必须支持：

- WebSocket Upgrade；
- 二进制 WebSocket 帧；
- 长连接至少 10 分钟；
- 关闭响应缓冲；
- 正确传递 `X-Forwarded-For`；
- TLS 终止。

不要对 `/v1/realtime` 或 `/avatar-live/ws/live` 做短超时、压缩或消息聚合。

---

## 10. 并发和容量限制

### 10.1 当前数字人单实例只支持一个并发 Session

MuseTalk 当前限制：

- 同一时间只支持一个 viewer；
- 同一时间只支持一个上游音频流；
- 第二个数字人 Session 会收到 `stream_busy`。

MiniCPM Worker 可以排队，但 Gateway 的数字人音频旁路仍指向同一个 MuseTalk 实例。

### 10.2 平台并发方案

短期方案：

- 平台维护数字人实例池；
- 每个并发用户分配一个“Gateway + MuseTalk + MiniCPM”实例；
- 平台负责排队、路由、回收和健康检查。

中长期方案：

- 改造 MuseTalk 为多 Session / 多 viewer 架构；
- 按租户或用户分片；
- 引入独立 WebRTC 媒体服务，用于弱网自适应和更低传输延迟。

如果只增加 MiniCPM Worker 数量，**不能解决数字人 viewer 单实例限制**。

---

## 11. 和 Gitee 版本的关系

当前版本与 Gitee 版本的接口路径、HTTP 方法、WebSocket 路由以及 `/v1/realtime` 消息协议一致。

需要平台同事注意的非协议差异：

- 当前 `/api/apps` 中新增第一入口 `avatar`。
- 当前 `/avatar` 使用独立数字人页面。
- 当前默认使用 H.264 Annex-B + WebCodecs，并保留 WebP/JPEG 回退。
- 当前保留本地 `prebuffer=32`、客户端 8 帧起播等参数。
- 当前增加麦克风诊断和打断恢复 watchdog。

如果平台只依赖 `/v1/realtime`，当前版本可以直接替换 Gitee 版本。

如果平台依赖 `/api/apps` 的固定列表，需要允许 `avatar` 这一新增项。

---

## 12. 联调验收清单

### 12.1 页面接入

- [ ] 平台电脑能访问 `https://<host>:8006/health`
- [ ] 平台页面能通过 HTTPS 嵌入 `/avatar`
- [ ] iframe 已允许 microphone、autoplay
- [ ] 点击开始后浏览器能获得麦克风权限
- [ ] `/avatar-live/api/status` 返回 `ready=true`
- [ ] 如需切换形象，先调用 `/avatar-live/api/avatar/select`
- [ ] 模型能收到非全零音频
- [ ] 数字人画面、语音和字幕正常
- [ ] 用户开口可以自动打断

### 12.2 自研前端接入

- [ ] 连接 `/v1/realtime?mode=audio`
- [ ] 显式指定 `mode`，没有依赖服务端默认的 `video`
- [ ] 收到 `session.queue_done`
- [ ] 正确发送 `session.init`
- [ ] 收到 `session.created` 和 `session_id`
- [ ] 正确编码 16kHz float32 PCM
- [ ] 正确处理 24kHz float32 PCM
- [ ] 正确处理 text/audio/listen 增量
- [ ] 根据 WebCodecs 能力选择 `video_codec=h264`，否则使用 `webp`
- [ ] 连接 `/avatar-live/ws/live` 并发送 `ready`
- [ ] 切换形象后重新连接 viewer，并读取新的 `meta.width/meta.height`
- [ ] 能解析 24 字节帧头
- [ ] 能识别 H.264 `MTH1`、WebP/JPEG `MTF1`
- [ ] H.264 模式下能处理关键帧标记和 `flush` 后等待 IDR
- [ ] 正确拉取 segment WAV
- [ ] 拉取 WAV 时已将 `audio_url` 映射为 `/avatar-live{audio_url}`
- [ ] 每 6 帧发送 ACK
- [ ] 能处理 `flush`
- [ ] 能处理 `session.closed` 和超时
- [ ] WebSocket 断开后能恢复

### 12.3 生产上线

- [ ] 只暴露 Gateway 端口
- [ ] 关闭公开 Admin
- [ ] 配置可信 HTTPS 证书
- [ ] 增加平台鉴权
- [ ] 配置 Origin 白名单
- [ ] 配置 WebSocket 长连接超时
- [ ] 完成单 Session 并发压测
- [ ] 明确并发实例扩容方案
- [ ] 配置日志、指标和告警
