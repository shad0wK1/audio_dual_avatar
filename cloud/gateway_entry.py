"""Public avatar gateway with the local cloud worker registered at startup."""
from gateway import app, GATEWAY_CONFIG

GATEWAY_CONFIG.update(workers=["127.0.0.1:22410"], default_lang="zh")
