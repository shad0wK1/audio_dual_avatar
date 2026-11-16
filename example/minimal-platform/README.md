# Minimal Avatar Platform BFF

这是一个 CPU-only 最小平台服务，部署在与数字人 Gateway 不同的机器上。

浏览器只访问本服务：

```text
Browser --HTTPS/WSS--> Platform BFF --HTTPS/WSS--> Avatar Gateway
```

本服务负责：

- 注入数字人 API Key；
- 使用服务端 CA Bundle 校验上游自签名证书；
- 代理预设查询和会话创建；
- 把上游 `stream_url` 改写为平台同源地址；
- 双向透传单 WebSocket 上的 JSON 和二进制媒体；
- 提供最小前端和浏览器 SDK。

它不加载 MiniCPM/MuseTalk 模型，不需要 GPU。

## 1. 配置

```bash
cp .env.example .env
```

必须设置：

```dotenv
AVATAR_API_BASE_URL=https://digital-human.example.com:8006
AVATAR_API_KEY=<upstream api key>
```

如果上游使用自签名证书：

```dotenv
AVATAR_CA_BUNDLE=/opt/platform/certs/digital-human-ca.pem
```

不要关闭证书校验。浏览器不需要信任数字人服务器的证书，只需平台 BFF
能够验证它。
证书必须包含实际访问域名或 IP 的 SAN；仅写 CN 在现代 Python/浏览器中不够。

## 2. 本地启动

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python app.py --host 127.0.0.1 --port 8080
```

访问 `http://127.0.0.1:8080/`。

`localhost` 是浏览器安全上下文，可以在 HTTP 下使用麦克风。远程机器访问
`http://IP:8080` 时，浏览器会禁止麦克风。生产部署应由 Nginx/Caddy/现有平台
入口提供 HTTPS，或者使用：

```bash
python app.py \
  --host 0.0.0.0 \
  --port 8443 \
  --ssl-certfile /path/platform-cert.pem \
  --ssl-keyfile /path/platform-key.pem
```

## 3. API

平台公开路由：

| 方法 | 路径 |
|---|---|
| GET | `/healthz` |
| GET | `/readyz` |
| GET | `/api/avatar/presets` |
| DELETE | `/api/avatar/presets/{preset_id}` |
| POST | `/api/avatar/sessions` |
| POST | `/api/avatar/customizations` |
| GET | `/api/avatar/customizations/{job_id}` |
| DELETE | `/api/avatar/customizations/{job_id}` |
| WSS | `/api/avatar/sessions/{session_id}/stream` |

REST 请求会加上：

```http
Authorization: Bearer <AVATAR_API_KEY>
```

该密钥只保存在平台服务器。WebSocket 使用创建会话时返回的短期 token。
自定义形象任务使用 `PLATFORM_AVATAR_OWNER_ID` 作为服务端可信 owner；
浏览器传入的同名 header 不会被透传。

`DELETE /api/avatar/presets/{preset_id}` 同样由平台注入可信 owner。Gateway 只允许
删除该 owner 的 `source: user` preset；系统 preset 和其他 owner 的 preset 会被
拒绝，共享的音频、提示词、缓存和视频不会被删除。

删除当前 active 形象时使用
`DELETE /api/avatar/presets/{preset_id}?switch_to_default=true`。平台会将其转发给
Gateway，由 Gateway 先切换系统默认形象，再删除用户 preset。

形象视频和参考音频最长均为 20 秒。上传接口会把 multipart 请求流式转发给
数字人 Gateway，不在平台服务器落盘；任务状态使用 `job_id` 轮询。生成的用户
预设默认 `private`，只能由相同 `PLATFORM_AVATAR_OWNER_ID` 查询和创建会话。
如需支持多个终端用户，应把该值替换成平台登录态中的真实用户 ID，而不是让
浏览器自行提交 owner。

## 4. 前端

页面位于 `static/index.html`，使用复制到本目录的
`static/avatar-session-client.js`。
该文件的权威来源是 `minicpm_demo/static/sdk/avatar-session-client.js`；
升级 SDK 时需同步覆盖示例中的副本，测试会检查两者是否一致。

SDK 配置为：

```js
new AvatarSessionClient({
  baseUrl: location.origin,
  apiPrefix: '/api/avatar',
  canvas,
  presetId,
  microphoneDeviceId,
});
```

## 5. Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Compose 默认只绑定 `127.0.0.1:8080`，推荐放在平台已有 HTTPS 反向代理后面。

Nginx 需要正确支持 WebSocket Upgrade，并设置较长读超时：

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 650s;
    proxy_send_timeout 650s;
}
```

## 6. 生产安全要求

这个示例为了保持最小化，没有实现平台用户登录。生产部署必须把整个服务放在
平台已有的登录鉴权、租户授权和限流之后。不要直接暴露到公网。

建议额外加入：

- 用户/租户到上游 API Key 的映射；
- 创建会话接口的 CSRF 防护；
- 每用户会话频率限制；
- 请求 ID 和结构化审计日志；
- 上游错误告警。

## 7. 测试

```bash
pip install -r requirements-dev.txt
pytest -q
```

测试使用 mock 上游，不需要启动模型服务。
