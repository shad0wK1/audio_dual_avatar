import assert from 'node:assert/strict';
import fs from 'node:fs/promises';


const source = await fs.readFile(
    new URL('../static/sdk/avatar-session-client.js', import.meta.url),
    'utf8',
);
const events = [];
let requestedConstraints = null;
let customizationRequest = null;
let customizationQuery = null;

globalThis.AudioContext = class {
    constructor(options = {}) {
        this.sampleRate = options.sampleRate || 48000;
        this.destination = {};
        this.audioWorklet = {
            addModule: async () => {
                events.push(`module:${this.sampleRate}`);
            },
        };
    }
    async resume() {
        events.push(`resume:${this.sampleRate}`);
    }
    async close() {}
    createGain() {
        return { connect() {}, gain: { value: 1 } };
    }
    createMediaStreamSource() {
        return { connect() {}, disconnect() {} };
    }
    createMediaStreamDestination() {
        return {};
    }
    createAnalyser() {
        return {
            fftSize: 256,
            connect() {},
            disconnect() {},
            getFloatTimeDomainData(target) {
                target.fill(0);
            },
        };
    }
};
globalThis.AudioWorkletNode = class {
    constructor() {
        this.port = {
            postMessage: (message) => events.push(`worklet:${message.command}`),
        };
    }
    connect() {}
    disconnect() {}
};
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
        mediaDevices: {
            getUserMedia: async (constraints) => {
                events.push('getUserMedia');
                requestedConstraints = constraints;
                return {
                    getTracks: () => [{
                        stop() {},
                        addEventListener() {},
                    }],
                    getAudioTracks: () => [{
                        enabled: true,
                        addEventListener() {},
                    }],
                };
            },
        },
    },
});
globalThis.location = { origin: 'https://example.test' };
globalThis.XMLHttpRequest = class {
    constructor() {
        this.upload = {};
    }
    open(method, url) {
        this.method = method;
        this.url = url;
    }
    setRequestHeader(name, value) {
        this.headers = { ...this.headers, [name]: value };
    }
    send(body) {
        customizationRequest = {
            method: this.method,
            url: this.url,
            headers: this.headers,
            body,
        };
        this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 5,
            total: 10,
        });
        this.status = 202;
        this.responseText = JSON.stringify({
            job_id: 'acj_0123456789abcdef0123',
            status: 'queued',
        });
        this.onload();
    }
};
globalThis.fetch = async (url, options) => {
    customizationQuery = { url: String(url), options };
    return {
        ok: true,
        json: async () => ({
            job_id: 'acj_0123456789abcdef0123',
            status: 'ready',
        }),
    };
};

const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { AvatarSessionClient } = await import(moduleUrl);
const client = new AvatarSessionClient({
    baseUrl: 'https://example.test',
    canvas: {},
    microphoneDeviceId: 'mic-2',
});
let ready = false;
client.on('microphoneReady', () => {
    ready = true;
});

await client.prepareMicrophone();
assert.equal(ready, true);
assert.equal(events.includes('getUserMedia'), true);
assert.equal(
    requestedConstraints.audio.deviceId.exact,
    'mic-2',
    'selected microphone must be sent as an exact getUserMedia constraint',
);
assert.equal(
    events.findIndex((value) => value === 'resume:48000')
        < events.findIndex((value) => value === 'getUserMedia'),
    true,
    'playback AudioContext must be unlocked in the user gesture',
);
assert.equal(
    events.some((value) => value === 'worklet:start'),
    false,
    'capture must not start before the session is ready',
);

await client.startMicrophone();
assert.equal(events.includes('worklet:start'), true);
client.close();

let uploadProgress = 0;
const video = new Blob(['video'], { type: 'video/mp4' });
video.name = 'face.mp4';
const audio = new Blob(['audio'], { type: 'audio/wav' });
audio.name = 'voice.wav';
const job = await AvatarSessionClient.createCustomization({
    baseUrl: 'https://example.test',
    apiPrefix: '/v1/avatar',
    ownerId: 'user-a',
    video,
    audio,
    prompt: 'prompt',
    name: 'avatar',
    description: 'description',
    onProgress: (ratio) => {
        uploadProgress = ratio;
    },
});
assert.equal(job.status, 'queued');
assert.equal(uploadProgress, 0.5);
assert.equal(customizationRequest.method, 'POST');
assert.equal(
    String(customizationRequest.url),
    'https://example.test/v1/avatar/customizations',
);
assert.equal(customizationRequest.headers['X-Avatar-Owner-ID'], 'user-a');
assert.equal(customizationRequest.body.get('prompt'), 'prompt');
assert.equal(customizationRequest.body.get('video').name, 'face.mp4');

const queried = await AvatarSessionClient.getCustomization({
    baseUrl: 'https://example.test',
    apiPrefix: '/v1/avatar',
    ownerId: 'user-a',
    jobId: job.job_id,
});
assert.equal(queried.status, 'ready');
assert.equal(
    customizationQuery.url,
    `https://example.test/v1/avatar/customizations/${job.job_id}`,
);
assert.equal(
    customizationQuery.options.headers['X-Avatar-Owner-ID'],
    'user-a',
);

const deleted = await AvatarSessionClient.deletePreset({
    baseUrl: 'https://example.test',
    ownerId: 'user-a',
    presetId: 'up_123',
    switchToDefault: true,
});
assert.equal(deleted.status, 'ready');
assert.equal(
    customizationQuery.url,
    'https://example.test/v1/avatar/presets/up_123?switch_to_default=true',
);
assert.equal(customizationQuery.options.method, 'DELETE');
assert.equal(
    customizationQuery.options.headers['X-Avatar-Owner-ID'],
    'user-a',
);

console.log('AvatarSessionClient microphone, customization and preset deletion checks passed');
