# 数字人 API 版平台

远程主机运行以下命令。start 会启动 API 版数字人后端、独立 BFF、网页和入口代理，随后检查后端连通性、前端页面和账号服务。stop 关闭新版六个服务。原平台与新版共用账号服务和数据库，单独停止新版会保留它们。

    ~/audio_dual_avatar_api/platform/platform.sh start
    ~/audio_dual_avatar_api/platform/platform.sh status
    ~/audio_dual_avatar_api/platform/platform.sh stop

从 Windows PowerShell 连接远程入口后保持该终端打开：

    ssh -NT -L 127.0.0.1:13100:127.0.0.1:13100 4卡PRO5000

浏览器访问 http://127.0.0.1:13100/chat?experience=live 。隧道已建立时直接访问即可。

新版入口 13100，网页 13101，BFF 18180，数字人网关 8106。新版 BFF 配置在 /home/user01/audio_dual_avatar_api/platform/bff/.env，云服务密钥在 /home/user01/audio_dual_avatar_api/.env。旧版入口 13000，网页 13001，BFF 18080，数字人网关 8006。
