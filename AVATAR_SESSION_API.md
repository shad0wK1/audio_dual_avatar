# Avatar Session API

公共数字人接口把 MiniCPM-o Worker、AvatarBridge 和 MuseTalk viewer 收拢到
Gateway 内部。调用方只需要一个服务地址、一个会话创建请求和一个 WebSocket。

旧接口 `/v1/realtime`、`/avatar-live/*` 和 `/avatar` 保持兼容。

## 1. 创建会话

```http
POST /v1/avatar/sessions
Authorization: Bearer <api_key>
Content-Type: application/json
```

```json
{
  "preset_id": "knowledge_host_720p",
  "system_prompt": "可选，不传则使用预设提示词",
  "input_format": "pcm_f32le_16000",
  "video_codec": "auto",
  "config": {
    "length_penalty": 1.1
  },
  "metadata": {
    "tenant_id": "tenant-a",
    "user_id": "user-123"
  }
}
```

响应：

```json
{
  "session_id": "avs_xxx",
  "stream_url": "/v1/avatar/sessions/avs_xxx/stream?token=...",
  "expires_at": "2026-11-04T12:00:00Z",
  "preset": {
    "id": "knowledge_host_720p",
    "name": "知识分享",
    "avatar_id": "knowledge_host_720p"
  },
  "input_format": "pcm_f32le_16000",
  "audio_transport": "websocket_mta1",
  "video_transport": "websocket_muse_frame"
}
```

当前部署只允许一个活动数字人会话。已有活动会话时返回 HTTP 429：

```json
{
  "detail": {
    "code": "session_capacity_exhausted",
    "message": "An avatar session is already active"
  }
}
```

## 2. 建立 WebSocket

```text
WSS /v1/avatar/sessions/{session_id}/stream?token=...
```

连接后客户端先发送：

```json
{
  "type": "session.start",
  "capabilities": {
    "video_codecs": ["h264", "webp"]
  }
}
```

Gateway 完成 Worker、AvatarBridge 和 MuseTalk viewer 建连后发送：

```json
{
  "type": "session.ready",
  "session_id": "avs_xxx",
  "backend_session_id": "sess_xxx",
  "video_codec": "h264",
  "codec_string": "avc1.4D4028",
  "width": 768,
  "height": 1344,
  "fps": 24,
  "prebuffer": 32,
  "input_format": "pcm_f32le_16000",
  "audio_transport": "websocket_mta1",
  "video_transport": "websocket_muse_frame"
}
```

服务端默认选择 H.264。只有客户端明确只声明 `webp`，或创建会话时显式指定
`video_codec: "webp"`，才使用 WebP。

## 3. 客户端消息

### 麦克风音频

```json
{
  "type": "input.audio.append",
  "sequence": 12,
  "audio": "<base64 little-endian float32, mono, 16kHz>"
}
```

### 打断

```json
{"type":"input.interrupt"}
```

Gateway 立即停止已生成的数字人媒体片段，并在下一块麦克风音频上向
MiniCPM 传递 `force_listen=true`。

### 媒体 ACK

SDK 在视频帧真正绘制后发送：

```json
{
  "type": "media.ack",
  "frame_index": 175,
  "pts_us": 7291667,
  "kind": "speech"
}
```

ACK 只由 SDK 或自行实现播放器的客户端发送，业务代码无需处理。

### 关闭

```json
{"type":"session.close","reason":"client_closed"}
```

## 4. 服务端消息

控制消息：

- `session.connecting`
- `session.queued`
- `session.queue_update`
- `session.queue_done`
- `session.ready`
- `response.started`
- `transcript.delta`
- `response.ended`
- `response.interrupted`
- `input.audio_ack`
- `media.segment`
- `media.segment_end`
- `media.flush`
- `media.audio_error`
- `error`
- `session.closed`

`transcript.delta`：

```json
{
  "type": "transcript.delta",
  "response_id": "resp_xxx",
  "text": "好的，"
}
```

`media.segment`：

```json
{
  "type": "media.segment",
  "id": 34,
  "duration": 0.833,
  "total_frames": 20,
  "start_frame": 169,
  "start_pts_us": 7041667
}
```

## 5. 二进制媒体

### WAV 音频

```text
bytes 0..3   MTA1
bytes 4..7   segment_id, uint32 big-endian
bytes 8..    complete WAV file bytes
```

### 视频

视频沿用 MuseTalk 的 24 字节帧头：

- H.264：`MTH1` magic，后接 Annex-B access unit。
- WebP/JPEG：`MTF1` magic，后接压缩图片。

具体字段见
`musetalk_project/MuseTalk/muse_stream/protocol.py`。

## 6. Browser SDK

```js
import { AvatarSessionClient } from '/static/sdk/avatar-session-client.js';

const client = new AvatarSessionClient({
  canvas,
  presetId: 'knowledge_host_720p',
  microphoneDeviceId: '<device-id returned by enumerateDevices()>',
});

client.on('transcript', ({ text }) => console.log(text));
client.on('error', (error) => console.error(error));

await client.connect();
await client.startMicrophone();

// Later:
client.interrupt();
client.close();
```

SDK 负责：

- 麦克风采集和 Base64 编码；
- WebCodecs H.264 和 WebP 解码；
- AudioContext 排程和音画同步；
- ACK、打断、flush；
- 解码器和媒体资源清理。

## 7. 配置

```bash
AVATAR_SESSION_API_KEY=
AVATAR_SESSION_TTL_SECONDS=180
AVATAR_SESSION_MAX_SECONDS=600
AVATAR_SESSION_ALLOWED_ORIGINS=https://platform.example.com
AVATAR_CUSTOMIZATION_ENABLED=true
AVATAR_CUSTOMIZATION_VIDEO_MAX_SECONDS=20
AVATAR_CUSTOMIZATION_AUDIO_MAX_SECONDS=20
```

- `AVATAR_SESSION_API_KEY` 为空时允许同源/本地匿名调用。
- `AVATAR_SESSION_ALLOWED_ORIGINS` 用于允许跨域浏览器调用，多个来源用逗号分隔。
- 创建会话后必须在 TTL 内连接 WebSocket。
- WebSocket 建立后最长运行到 `AVATAR_SESSION_MAX_SECONDS`。

## 8. 用户形象定制

创建任务：

```http
POST /v1/avatar/customizations
Authorization: Bearer <api_key>
X-Avatar-Owner-ID: <trusted-user-id>
Content-Type: multipart/form-data
```

字段：

- `video`：视频文件，最长 20 秒
- `audio`：参考音频，最长 20 秒
- `prompt`：提示词文本
- `name`：形象名称
- `description`：可选说明

视频支持 `.mp4/.mov/.webm/.m4v`，默认最大 200 MiB；音频支持
`.wav/.mp3/.m4a/.flac/.ogg`，默认最大 20 MiB；提示词默认最大 64 KiB。
生成任务串行执行，调用 MuseTalk 前会检查当前没有活跃数字人会话。

返回 HTTP 202：

```json
{"job_id":"acj_xxx","status":"queued","stage":"queued","progress":5}
```

查询：

```http
GET /v1/avatar/customizations/{job_id}
X-Avatar-Owner-ID: <trusted-user-id>
```

取消：

```http
DELETE /v1/avatar/customizations/{job_id}
X-Avatar-Owner-ID: <trusted-user-id>
```

完成后任务返回 `preset_id`。新预设写入运行时
`data/avatar_customizations/avatar_presets.user.yaml`，随后出现在同名 owner 的
`GET /v1/avatar/presets` 结果中。用户预设默认 `private`。

`AVATAR_CUSTOMIZATION_DATA_ROOT` 的相对路径以 `minicpm_demo/` 为基准；
默认 preset 路径会自动指向该目录下的 `avatar_presets.user.yaml`。

`X-Avatar-Owner-ID` 必须由可信平台 BFF 注入，不能直接信任浏览器任意值。

### 删除用户形象

```http
DELETE /v1/avatar/presets/{preset_id}
Authorization: Bearer <api_key>
X-Avatar-Owner-ID: <trusted-user-id>
```

只有 `source: user` 且 `owner_id` 与请求 owner 一致的 preset 可以通过 API
删除。系统 preset 返回 `403 system_preset_protected`。

如果目标 preset 是当前 active avatar，普通删除返回 `409 avatar_active`。
用户确认后可以显式要求先切换为系统默认形象，再删除：

```http
DELETE /v1/avatar/presets/{preset_id}?switch_to_default=true
```

切换默认由 Gateway 调用 MuseTalk 完成；默认形象加载或切换失败时不会删除
preset 或资源。成功响应包含 `switched_to_preset_id`、`switched_avatar_id`
和当前 `active_avatar_id`。

删除时会检查参考音频、提示词、逐帧缓存和基底视频是否仍被其他 preset
使用。共享文件会保留，独占文件才会删除。相关资源使用情况包括已禁用和
其他 owner 的 preset。

配置中的 `source` 取值为 `system` 或 `user`。命令行管理可删除任意 preset：

```bash
./delete_avatar.sh --dry-run up_0123456789abcdef
./delete_avatar.sh up_0123456789abcdef
./delete_avatar.sh system_preset --new-default knowledge_host_720p
```

最小 Python 客户端：

```bash
.venv/bin/python minicpm_demo/examples/avatar_session_api_client.py \
  --base-url https://127.0.0.1:8006 \
  --audio minicpm_demo/tests/cases/common/user_audio/当出现植物大战僵尸的时候提醒我.wav \
  --insecure
```
