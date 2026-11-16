import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../static/avatar-session-client.js', import.meta.url), 'utf8');
const { AvatarSessionClient } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
globalThis.location = { origin: 'http://localhost' };
let closedContexts = 0;
globalThis.AudioContext = class {
    constructor() { this.destination = {}; }
    createGain() { return {connect() {}}; }
    async resume() {}
    async close() { closedContexts++; }
};
globalThis.WebSocket = class {
    static OPEN = 1;
    constructor() {
        this.readyState = 0;
        queueMicrotask(() => this.onclose?.({code: 1006}));
    }
    close() { this.readyState = 3; }
};
globalThis.fetch = async () => ({ok: true, json: async () => ({stream_url: '/stream?token=t'})});
const rejected = new AvatarSessionClient({canvas: {}});
await assert.rejects(rejected.connect(), /closed/i);
assert.equal(rejected.closed, true);
assert.equal(closedContexts, 1, 'failed socket handshake releases audio context');

let resolveFetch;
globalThis.fetch = async () => new Promise(resolve => { resolveFetch = resolve; });
const cancelled = new AvatarSessionClient({canvas: {}});
const connecting = cancelled.connect();
await new Promise(resolve => setImmediate(resolve));
cancelled.close();
resolveFetch({ok: true, json: async () => ({stream_url: '/stream?token=t'})});
await assert.rejects(connecting, /closed/i);
assert.equal(cancelled.ws, null, 'cancelled request must not open a late socket');

let grantPermission;
let stoppedTracks = 0;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {mediaDevices: {
    getUserMedia: () => new Promise(resolve => { grantPermission = resolve; }),
}}});
const microphone = new AvatarSessionClient({canvas: {}});
const preparing = microphone.prepareMicrophone();
await new Promise(resolve => setImmediate(resolve));
microphone.close();
grantPermission({getTracks: () => [{stop() { stoppedTracks++; }}]});
await assert.rejects(preparing, /closed/i);
assert.equal(stoppedTracks, 1, 'permission granted after cancellation releases microphone');

const disconnected = new AvatarSessionClient({canvas: {}});
disconnected.audioCtx = new AudioContext();
disconnected.micStream = {getTracks: () => [{stop() { stoppedTracks++; }}]};
disconnected.close();
disconnected.close();
assert.equal(stoppedTracks, 2, 'cleanup is idempotent');
console.log('SDK lifecycle: failed handshake, cancelled creation, late microphone permission and cleanup passed');
const reconnect = new AvatarSessionClient({canvas: {}});
reconnect.audioCtx = {currentTime: 10};
reconnect._scheduleReady = () => {};
reconnect._storeFrame(2400, {close() {}}, 0, 0xffffffff, 100000000);
assert.equal(reconnect.epoch, -89.88, 'reconnect clock anchors to actual first frame');
reconnect._storeFrame(2401, {close() {}}, 0, 0xffffffff, 100041667);
assert.equal(reconnect.epoch, -89.88, 'later frames must not move the clock');
console.log('SDK reconnect timeline regression passed');
