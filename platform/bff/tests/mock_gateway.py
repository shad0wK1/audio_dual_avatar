"""LOCAL TEST FIXTURE ONLY. This is not a digital-human model service."""
import base64
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
app = FastAPI(title='Mock Avatar Gateway - tests only')

@app.get('/health')
async def health():
    return {'status': 'mock', 'test_only': True}

@app.get('/v1/avatar/presets')
async def presets():
    return {'default_preset_id': 'test', 'presets': [
        {'id': 'test', 'name': '协议测试形象（模拟服务）', 'available': True}]}

@app.post('/v1/avatar/sessions', status_code=201)
async def sessions():
    session_id = 'avs_' + uuid.uuid4().hex
    return {'session_id': session_id, 'stream_url': f'/v1/avatar/sessions/{session_id}/stream?token=test-only'}

@app.websocket('/v1/avatar/sessions/{session_id}/stream')
async def stream(ws: WebSocket, session_id: str):
    await ws.accept()
    try:
        while True:
            message = await ws.receive_json()
            kind = message.get('type')
            if kind == 'session.start':
                await ws.send_json({'type': 'session.ready', 'session_id': session_id,
                    'video_codec': 'webp', 'width': 768, 'height': 1344, 'fps': 24})
                await ws.send_json({'type': 'transcript.delta', 'text': '模拟服务连接成功；这不是模型生成的回答。'})
            elif kind == 'input.audio.append':
                audio = base64.b64decode(message['audio'], validate=True)
                await ws.send_json({'type': 'input.audio_ack', 'rms': 0.1, 'bytes': len(audio)})
            elif kind == 'input.interrupt':
                await ws.send_json({'type': 'media.flush', 'frame_index': 0})
                await ws.send_json({'type': 'response.interrupted'})
            elif kind == 'session.close':
                await ws.send_json({'type': 'session.closed', 'reason': 'client_closed'})
                await ws.close()
                return
            elif kind == 'test.binary':
                await ws.send_bytes(b'MTA1\x00\x00\x00\x01test-fixture')
    except WebSocketDisconnect:
        return
