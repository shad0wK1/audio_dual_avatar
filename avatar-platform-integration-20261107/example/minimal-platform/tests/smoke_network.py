"""Run against the local TEST BFF: python tests/smoke_network.py URL."""
import asyncio
import base64
import json
import sys
import httpx
import websockets

async def main():
    base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:18081'
    async with httpx.AsyncClient(base_url=base) as client:
        response = await client.get('/api/avatar/presets')
        response.raise_for_status()
        assert response.json()['presets'][0]['available']
        response = await client.post('/api/avatar/sessions', json={'preset_id': 'test'})
        response.raise_for_status()
        stream = response.json()['stream_url']
    async with websockets.connect(base.replace('http', 'ws', 1) + stream, origin=base) as ws:
        await ws.send(json.dumps({'type': 'session.start', 'capabilities': {'video_codecs': ['webp']}}))
        assert json.loads(await asyncio.wait_for(ws.recv(), 5))['type'] == 'session.ready'
        assert json.loads(await ws.recv())['type'] == 'transcript.delta'
        await ws.send(json.dumps({'type': 'input.audio.append', 'audio': base64.b64encode(b'\0'*64000).decode()}))
        assert json.loads(await ws.recv())['bytes'] == 64000
        await ws.send('{"type":"test.binary"}')
        assert await ws.recv() == b'MTA1\x00\x00\x00\x01test-fixture'
        await ws.send('{"type":"input.interrupt"}')
        assert json.loads(await ws.recv())['type'] == 'media.flush'
        assert json.loads(await ws.recv())['type'] == 'response.interrupted'
        await ws.send('{"type":"session.close"}')
        assert json.loads(await ws.recv())['type'] == 'session.closed'
    print('PASS: real HTTP + WebSocket proxy to mock upstream: presets, creation, ready, transcript, PCM, binary, interrupt, close')

asyncio.run(main())
