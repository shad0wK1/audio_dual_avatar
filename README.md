# 数字人 API 后端

远程目录为 /home/user01/audio_dual_avatar_api。使用现有 MuseTalk 形象、GPU 唇形渲染和单 WebSocket 会话协议。数字人模型权重和 Python 环境链接到同机 /home/user01/audio_dual_avatar，请保留该目录。形象缓存、代码、运行文件均在新版下单独存放。

## 配置与启动

在本目录执行 nano -l .env，第二行 DASHSCOPE_API_KEY 填北京地域百炼 Key，第三行 DEEPSEEK_API_KEY 填 DeepSeek 官方 Key。文件仅当前用户可读写。第 5 行可按百炼业务空间调整服务地址。第 7 至 9 行为模型，第 10 至 12 行为小鹿、阿萍、小美的 Qwen 预置音色。密钥只由服务器上的云语音 worker 读取。

    ./run.sh check
    ./run.sh start
    ./run.sh status
    ./run.sh stop

check 仅检查本地配置。启动后服务仅监听环回地址。网关 HTTPS 8106，MuseTalk 8100，云 API worker 22410。本机通过 ssh -N -L 8106:127.0.0.1:8106 4卡PRO5000 建立隧道后，浏览器打开 https://127.0.0.1:8106/avatar-v2 。该页面的“会话 API Key”是已有平台的网关访问密钥，位于本目录 .avatar-env 的 AVATAR_SESSION_API_KEY，与两把云服务密钥用途不同。对接现有平台时，BFF 的 AVATAR_API_BASE_URL 应指向 https://127.0.0.1:8106，保留现有网关凭据及证书信任设置。

服务日志使用 journalctl --user -u avatar-api-worker.service -u avatar-api-gateway.service -u avatar-api-muse.service 查看。

## 音频与打断

浏览器提交 16 kHz 麦克风音频。worker 根据静音判断一句话结束，将 WAV 提交给 Qwen ASR。DeepSeek 接收识别文字、所选角色的原提示词及本次会话的历史，并流式生成回答。Qwen TTS 按句合成，worker 将流式 PCM 转换为 MuseTalk 需要的 24 kHz 单声道 float32。打断或断开会取消正在执行的云请求和排队的回答，网关和客户端丢弃旧音频。已有会话内保存最多十轮已完成问答。

tests/mock_worker.py 和 tests/verify_avatar.py 是离线联调入口，只在独立测试 worker 中用 HTTP fixtures 替换供应商响应。生产启动入口固定加载 cloud.worker，不会自动回退为模拟数据。

## 2026-11-23 后端更新

- **DeepSeek 双请求均为 SSE 流式。** 第一请求实时接收联网路由标签，只有完整标签校验通过后才启动回答。第二请求持续转发正文，首个可播短句到达后即可合成语音。
- **按问题复杂度选择联网模式。** 单一机构规则、官方渠道和单一货币对的公开参考汇率走快速联网回答。天气、市场行情、跨来源比较和复杂问题保留低强度深度检索。直答和深度检索使用 low 思考，快速联网回答关闭思考。
- **改进检索证据与日期核对。** 提示模型优先使用主管机构或原始来源，核心事实已经有依据时减少继续打开网页。联网搜索没有返回可用来源时，快速回答会在播报前回退到深度检索。按日天气预报还会核对来源是否覆盖目标日期。
- **增加联网语音过渡提示。** 搜索开始时随机播放一条简短提示，并与检索并行。正式答案排在提示后播放。`cloud/search_audio/` 中包含当前四条提示按 Cherry、Serena、Chelsie 三种音色预先合成的 PCM。未命中的音色会实时合成提示。过渡提示计入浏览器播放进度，但不会写入对话历史。
- **加强口播回答要求。** 通用系统提示要求结论准确、术语合适、数字带日期与单位、说明时效信息口径，并区分事实、估计和建议。默认小鹿角色提示仍位于 `minicpm_demo/assets/prompts/avatar/gril_v2.txt`。
- **更新语音端点检测与渲染预热。** worker 用 20 毫秒帧和约 800 毫秒静音判定一句话结束，并通过音频能量检测语音。MuseTalk 启动时预热常用形象帧缓存，最大预取窗口从 3.5 秒降到 1.5 秒。服务脚本支持把 GPEN 放到独立 GPU 上运行。
- **补充路由、日期、过渡播放回归用例。** 新用例位于 `tests/test_deepseek_router.py`、`tests/test_search_route.py`、`tests/test_weather_dates.py` 和 `tests/test_web_opening.py`。

部署 MuseTalk 服务前，按机器配置从 `.gpen-env.example` 创建本机私有的 `.gpen-env`。GPEN 模型权重由部署环境提供，文件不入库，SHA-256 记录在 `weights.sha256`。`.gpen-env`、服务密钥、网关配置、TLS 私钥和模型权重不应提交到仓库。

## 平台数字人前端

平台网页、BFF、登录对接和反向代理由 [aigc-platform 数字人目录](https://github.com/shad0wK1/aigc-platform/tree/main/digital-human) 维护。 此版本部署在 ~/aigc-platform/digital-human/api/。

## 空闲显存与服务生命周期

`./run.sh start` 启用三个用户级 systemd 服务并随系统启动。`./run.sh stop` 停止服务并取消自启。
待机时可读取角色和预览；公开会话发送 `session.start` 后才加载 CUDA 渲染器。
最后一个渲染连接断开 60 秒后回收渲染子进程及 CUDA 上下文。活动会话即使静音也保留显存。
GPU 机执行 `curl http://127.0.0.1:8100/api/status`，查看 `status`、`gpu_resident` 和 `active_render_leases`。
平台 BFF 的 prepare 校验须接受已验证角色的 `standby` 状态；加载期间仍需等待。
