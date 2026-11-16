#!/usr/bin/env python3
"""Minimal client for the public single-WebSocket avatar session API."""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import ssl
from pathlib import Path

import httpx
import librosa
import numpy as np
import websockets


async def run(args: argparse.Namespace) -> None:
    headers = {}
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    async with httpx.AsyncClient(
        verify=not args.insecure,
        timeout=120.0,
    ) as client:
        response = await client.post(
            f"{args.base_url.rstrip('/')}/v1/avatar/sessions",
            headers=headers,
            json={
                "preset_id": args.preset_id,
                "metadata": {"client": "python-example"},
            },
        )
        response.raise_for_status()
        session = response.json()
    print(json.dumps(session, ensure_ascii=False, indent=2))

    stream_url = session["stream_url"]
    if stream_url.startswith("/"):
        stream_url = args.base_url.rstrip("/") + stream_url
    stream_url = (
        stream_url.replace("https://", "wss://", 1)
        .replace("http://", "ws://", 1)
    )
    ssl_context = ssl._create_unverified_context() if args.insecure else None
    async with websockets.connect(
        stream_url,
        ssl=ssl_context,
        max_size=None,
        open_timeout=10,
    ) as ws:
        await ws.send(
            json.dumps(
                {
                    "type": "session.start",
                    "capabilities": {"video_codecs": ["webp"]},
                }
            )
        )
        while True:
            raw = await asyncio.wait_for(ws.recv(), timeout=150)
            if isinstance(raw, bytes):
                continue
            message = json.loads(raw)
            print(json.dumps(message, ensure_ascii=False))
            if message.get("type") == "session.ready":
                break
            if message.get("type") == "error":
                raise RuntimeError(message)

        receive_task = asyncio.create_task(_receive(ws))
        if args.audio:
            samples, _ = librosa.load(str(args.audio), sr=16000, mono=True)
            one_second = 16000
            for index, start in enumerate(range(0, len(samples), one_second)):
                chunk = samples[start : start + one_second]
                if len(chunk) < one_second:
                    chunk = np.pad(chunk, (0, one_second - len(chunk)))
                await ws.send(
                    json.dumps(
                        {
                            "type": "input.audio.append",
                            "sequence": index,
                            "audio": base64.b64encode(
                                chunk.astype("<f4").tobytes()
                            ).decode("ascii"),
                        }
                    )
                )
                await asyncio.sleep(1.0)
        else:
            await asyncio.sleep(args.duration)

        await ws.send(
            json.dumps({"type": "session.close", "reason": "example_done"})
        )
        await receive_task


async def _receive(ws) -> None:
    media = {"MTA1": 0, "MTF1": 0, "MTH1": 0}
    transcript: list[str] = []
    while True:
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=60)
        except websockets.ConnectionClosed:
            break
        except asyncio.TimeoutError:
            continue
        if isinstance(raw, bytes):
            magic = raw[:4].decode("latin1")
            if magic in media:
                media[magic] += 1
            continue
        message = json.loads(raw)
        message_type = message.get("type")
        if message_type == "transcript.delta":
            transcript.append(message.get("text", ""))
        if message_type in ("session.closed", "error"):
            print(json.dumps(message, ensure_ascii=False))
            break
    print("transcript:", "".join(transcript))
    print("media packets:", media)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://127.0.0.1:8006")
    parser.add_argument("--api-key", default="")
    parser.add_argument("--preset-id", default="")
    parser.add_argument("--audio", type=Path)
    parser.add_argument("--duration", type=float, default=5.0)
    parser.add_argument("--insecure", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
