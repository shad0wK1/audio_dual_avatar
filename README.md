# 数字人 API 后端

远程目录为 /home/user01/audio_dual_avatar_api。使用现有 MuseTalk 形象、GPU 唇形渲染和单 WebSocket 会话协议。数字人模型权重和 Python 环境链接到同机 /home/user01/audio_dual_avatar，请保留该目录。形象缓存、代码、运行文件均在新版下单独存放。

## 配置与启动

在本目录执行 nano -l .env，第二行 DASHSCOPE_API_KEY 填北京地域百炼 Key，第三行 DEEPSEEK_API_KEY 填 DeepSeek 官方 Key。文件仅当前用户可读写。第 5 行可按百炼业务空间调整服务地址。第 7 至 9 行为模型，第 10 至 12 行为小鹿、阿萍、小美的 Qwen 预置音色。密钥只由服务器上的云语音 worker 读取。

    ./run.sh check
    ./run.sh start
    ./run.sh status
    ./run.sh stop

check 仅检查本地配置。启动后服务仅监听环回地址。网关 HTTPS 8106，MuseTalk 8100，云 API worker 22410。本机通过 ssh -N -L 8106:127.0.0.1:8106 4卡PRO5000 建立隧道后，浏览器打开 https://127.0.0.1:8106/avatar-v2 。该页面的“会话 API Key”是已有平台的网关访问密钥，位于本目录 .avatar-env 的 AVATAR_SESSION_API_KEY，与两把云服务密钥用途不同。对接现有平台时，BFF 的 AVATAR_API_BASE_URL 应指向 https://127.0.0.1:8106，保留现有网关凭据及证书信任设置。现有平台未切换。

服务日志使用 journalctl --user -u avatar-api-worker.service -u avatar-api-gateway.service -u avatar-api-muse.service 查看。

## 音频与打断

浏览器提交 16 kHz 麦克风音频。worker 根据静音判断一句话结束，将 WAV 提交给 Qwen ASR。DeepSeek 接收识别文字、所选角色的原提示词及本次会话的历史，并流式生成回答。Qwen TTS 按句合成，worker 将流式 PCM 转换为 MuseTalk 需要的 24 kHz 单声道 float32。打断或断开会取消正在执行的云请求和排队的回答，网关和客户端丢弃旧音频。已有会话内保存最多十轮已完成问答。

tests/mock_worker.py 和 tests/verify_avatar.py 是离线联调入口，只在独立测试 worker 中用 HTTP fixtures 替换供应商响应。生产启动入口固定加载 cloud.worker，不会自动回退为模拟数据。

## 从 API 分支部署

部署目录为 ~/audio_dual_avatar_api，共享依赖来自同机 ~/audio_dual_avatar 的 main 分支部署。运行前从 .env.example 创建仅服务用户可读写的 .env。将 .avatar-env 配置成与本机 GPU 和平台网关凭据一致；服务脚本会读取此文件。按现有部署链接 .venv、.venv-preprocess、MuseTalk 的 models 和 ffmpeg，提供 MuseTalk 预处理的形象缓存以及 minicpm_demo/certs 下的服务器证书和私钥。

新版平台代码位于 platform/。配置 platform/bff/.env 时参考同目录的 .env.example，并填入网关访问密钥和 CA 证书路径。平台网页沿用 main 分支部署的 AIGC 网页源码。在 main 的 aigc-platform 目录以 NEXT_PUBLIC_AVATAR_EMBED_URL=/digital-human/ 构建 standalone 网页；将 apps/web/.next/standalone 的内容复制到 API 版 platform/web/，将原构建的 apps/web/.next/static 和 apps/web/public 放到副本相应目录。两版共用账号服务、数据库以及 Node/Caddy 和 BFF Python 运行环境。

将 platform/deploy 中的 service 和 target 链接到用户 systemd 目录并执行 systemctl --user daemon-reload 后，运行 platform/platform.sh start、status 或 stop。网页版入口为 http://127.0.0.1:13100/chat?experience=live。数字人后端也可以通过 ./run.sh 单独启停。

DeepSeek 默认每轮开启 low 思考，按需开放联网查询。路由在 cloud/routing.py，请求参数在 cloud/providers.py。打断时保留用户问题，并根据浏览器实际播放进度保留可确认的回答，逻辑在 cloud/history.py。
