"""Smoke test for a local stack using tests.mock_worker, never uses external APIs."""
import asyncio
import base64
import json
import os
import ssl
from pathlib import Path
from urllib.parse import urlsplit

import httpx
import numpy as np
import soundfile as sf
import websockets


async def main():
    base = "https://127.0.0.1:8106"
    headers = {"Authorization": "Bearer " + os.environ["AVATAR_SESSION_API_KEY"]}
    async with httpx.AsyncClient(verify=False, timeout=60) as api:
        presets = await api.get(base + "/v1/avatar/presets", headers=headers)
        presets.raise_for_status()
        print("presets:", [p["name"] for p in presets.json()["presets"] if p["available"]], flush=True)
        resp = await api.post(base + "/v1/avatar/sessions", headers=headers,
                              json={"preset_id":"gril_v2","video_codec":"h264"})
        resp.raise_for_status()
        session = resp.json()
    url = urlsplit(session["stream_url"])
    ssl_ctx = ssl._create_unverified_context()
    async with websockets.connect("wss://127.0.0.1:8106" + url.path + "?" + url.query,
                                  ssl=ssl_ctx, max_size=8*1024*1024) as ws:
        async def send(payload):
            await ws.send(json.dumps(payload))
        await send({"type":"session.start","capabilities":{"video_codecs":["h264"]}})
        async def receive():
            packet = await ws.recv()
            if isinstance(packet, bytes):
                return packet
            msg = json.loads(packet)
            if msg["type"] == "error":
                raise RuntimeError(msg["message"])
            return msg
        async def control(kind):
            while True:
                msg = await receive()
                if isinstance(msg,dict) and msg["type"] == kind:
                    return msg
        ready = await control("session.ready")
        assert ready["video_codec"] == "h264"
        for turn in (1,2):
            # A real voiced fixture must pass VAD, followed by end-of-turn silence.
            voice = Path(__file__).resolve().parents[1] / "minicpm_demo/assets/ref_audio/ref_avatar_default.wav"
            samples, rate = sf.read(voice, frames=32000, dtype="float32", always_2d=True)
            assert rate == 16000
            pcm = np.pad(samples.mean(axis=1), (0, 20000)).astype("<f4")
            await send({"type":"input.audio.append","audio":base64.b64encode(pcm.tobytes()).decode()})
            text = ""
            wav_ids, video_ids = set(), set()
            while not (wav_ids & video_ids and f"第{turn}轮回答。" in text):
                msg=await receive()
                if isinstance(msg,dict):
                    if msg["type"]=="transcript.delta":
                        text += msg["text"]
                    continue
                if msg[:4]==b"MTA1":
                    assert msg[8:12]==b"RIFF"
                    wav_ids.add(int.from_bytes(msg[4:8],"big"))
                elif len(msg)>24:
                    index=int.from_bytes(msg[20:24],"big")
                    seg=int.from_bytes(msg[8:12],"big")
                    if seg != 0xffffffff:
                        video_ids.add(seg)
                    await send({"type":"media.ack","frame_index":index,"pts_us":int.from_bytes(msg[12:20],"big"),"kind":"media" if seg!=0xffffffff else "idle"})
            print("round",turn,"text:",text,"matched WAV/H264 segment:",min(wav_ids & video_ids),flush=True)
            if turn==1:
                await send({"type":"input.interrupt"})
                await control("media.flush")
                print("interrupt flush received",flush=True)
        await send({"type":"session.close"})
        await control("session.closed")

if __name__=="__main__":
    asyncio.run(asyncio.wait_for(main(),100))
