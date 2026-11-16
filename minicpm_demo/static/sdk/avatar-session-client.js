/**
 * Public browser client for the single-WebSocket avatar session API.
 *
 * The caller only creates one session and opens one WebSocket.  Microphone
 * capture, media decoding, playback scheduling, ACKs and interruption are
 * implemented here rather than in application code.
 */

const FRAME_MAGIC = 0x4d544631;
const H264_FRAME_MAGIC = 0x4d544831;
const AUDIO_MAGIC = 'MTA1';
const IDLE_SEGMENT = 0xffffffff;
const FRAME_IDLE = 0;
const FRAME_SILENT = 2;
const FRAME_FLAG_KEYFRAME = 1;
const H264_CODEC = 'avc1.4D4028';
const AUDIO_START_BUFFER_S = 0.08;
const AUDIO_CONTINUATION_LEAD_S = 0.012;
const CLIENT_PREBUFFER_FRAMES = 3;
const CONTINUATION_PREBUFFER_FRAMES = 2;
const TIMELINE_SLACK_S = 0.01;
const INTERRUPT_TIMEOUT_MS = 3000;
const CAPTURE_WORKLET_SOURCE = `
class AvatarCaptureProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.chunkSize = options.processorOptions?.chunkSize || 16000;
        this.buffer = new Float32Array(0);
        this.active = false;
        this.meterSamples = 0;
        this.meterEnergy = 0;
        this.port.onmessage = ({ data }) => {
            if (data?.command === 'start') {
                this.active = true;
                this.buffer = new Float32Array(0);
            } else if (data?.command === 'stop') {
                if (this.buffer.length) {
                    const chunk = this.buffer.slice(0);
                    this.port.postMessage(
                        { type: 'chunk', audio: chunk, final: true },
                        [chunk.buffer],
                    );
                }
                this.active = false;
                this.buffer = new Float32Array(0);
            }
        };
    }
    process(inputs, outputs) {
        const input = inputs[0]?.[0];
        const output = outputs[0]?.[0];
        if (input && output) output.set(input);
        if (!this.active || !input?.length) return true;
        for (const sample of input) this.meterEnergy += sample * sample;
        this.meterSamples += input.length;
        if (this.meterSamples >= sampleRate * 0.032) {
            this.port.postMessage({ type: 'level', rms: Math.sqrt(this.meterEnergy / this.meterSamples) });
            this.meterEnergy = 0;
            this.meterSamples = 0;
        }
        const combined = new Float32Array(this.buffer.length + input.length);
        combined.set(this.buffer);
        combined.set(input, this.buffer.length);
        this.buffer = combined;
        while (this.buffer.length >= this.chunkSize) {
            const chunk = this.buffer.slice(0, this.chunkSize);
            this.buffer = this.buffer.slice(this.chunkSize);
            this.port.postMessage({ type: 'chunk', audio: chunk }, [chunk.buffer]);
        }
        return true;
    }
}
registerProcessor('avatar-session-capture', AvatarCaptureProcessor);
`;


export class AvatarSessionClient {
    static async listPresets({
        baseUrl = '',
        apiKey = '',
        apiPrefix = '/v1/avatar',
        ownerId = '',
    } = {}) {
        const response = await fetch(
            new URL(
                `${apiPrefix.replace(/\/$/, '')}/presets`,
                baseUrl || location.origin,
            ),
            {
                headers: {
                    ...(apiKey
                        ? { Authorization: `Bearer ${apiKey}` }
                        : {}),
                    ...(ownerId
                        ? { 'X-Avatar-Owner-ID': ownerId }
                        : {}),
                },
                cache: 'no-store',
            },
        );
        if (!response.ok) {
            throw await _responseError(response, 'Failed to load presets');
        }
        return response.json();
    }

    static async deletePreset({
        baseUrl = '',
        apiKey = '',
        apiPrefix = '/v1/avatar',
        ownerId = '',
        presetId,
        switchToDefault = false,
    }) {
        const url = new URL(
            `${apiPrefix.replace(/\/$/, '')}/presets/${encodeURIComponent(presetId)}`,
            baseUrl || location.origin,
        );
        if (switchToDefault) {
            url.searchParams.set('switch_to_default', 'true');
        }
        const response = await fetch(
            url,
            {
                method: 'DELETE',
                headers: {
                    ...(apiKey
                        ? { Authorization: `Bearer ${apiKey}` }
                        : {}),
                    ...(ownerId
                        ? { 'X-Avatar-Owner-ID': ownerId }
                        : {}),
                },
                cache: 'no-store',
            },
        );
        if (!response.ok) {
            throw await _responseError(
                response,
                'Failed to delete avatar preset',
            );
        }
        return response.json();
    }

    constructor({
        canvas,
        baseUrl = '',
        apiKey = '',
        presetId = '',
        systemPrompt = '',
        metadata = {},
        inputFormat = 'pcm_f32le_16000',
        microphoneDeviceId = '',
        speechInterruptor = null,
        idleVideo = null,
        binaryMicrophone = false,
        apiPrefix = '/v1/avatar',
        ownerId = '',
    } = {}) {
        this.canvas = canvas;
        this.baseUrl = baseUrl || location.origin;
        this.apiKey = apiKey;
        this.presetId = presetId;
        this.systemPrompt = systemPrompt;
        this.metadata = metadata;
        this.inputFormat = inputFormat;
        this.microphoneDeviceId = microphoneDeviceId;
        this.speechInterruptor = speechInterruptor;
        this.idleVideo = idleVideo;
        this.binaryMicrophone = binaryMicrophone;
        this.lastRemoteKind = null;
        this.lastIdlePaint = -1;
        this.lastRemoteDrawTime = 0;
        this.responseActive = false;
        this.apiPrefix = apiPrefix.replace(/\/$/, '');
        this.ownerId = ownerId;
        this.session = null;
        this.ws = null;
        this.audioCtx = null;
        this.gain = null;
        this.micCtx = null;
        this.micStream = null;
        this.micSource = null;
        this.micNode = null;
        this.micDest = null;
        this.micAnalyser = null;
        this.micPrepared = false;
        this.micActive = false;
        this.muted = false;
        this.closed = false;
        this.fps = 24;
        this.prebuffer = 8;
        this.videoCodec = 'webp';
        this.codecString = H264_CODEC;
        this.segments = [];
        this.scheduleCursor = 0;
        this.currentIndex = 0;
        this.audioScheduleEnd = 0;
        this.epoch = 0;
        this.frames = new Map();
        this.pendingAudio = new Map();
        this.highestSegmentId = -1;
        this.cancelledThrough = -1;
        this.lastDrawn = -1;
        this.lastAck = -1;
        this.lastMediaAck = -1;
        this.sequence = 0;
        this.videoDecoder = null;
        this.decoderMeta = new Map();
        this.decoderGeneration = 0;
        this.decodeSequence = 0;
        this.lastResyncAt = -Infinity;
        this.waitingKeyframe = false;
        this.discardUntilFlush = false;
        this.renderHandle = 0;
        this.interruptTimer = null;
        this.listeners = new Map();
        this._readyWaiter = null;
        this._connectAbort = new AbortController();
    }

    on(type, handler) {
        if (typeof handler !== 'function') return () => {};
        const handlers = this.listeners.get(type) || new Set();
        handlers.add(handler);
        this.listeners.set(type, handlers);
        return () => handlers.delete(handler);
    }

    _emit(type, payload) {
        for (const handler of this.listeners.get(type) || []) {
            try {
                handler(payload);
            } catch (error) {
                console.error(`[AvatarSessionClient] ${type} listener failed`, error);
            }
        }
    }

    async connect() {
        try {
            return await this._connect();
        } catch (error) {
            this.close();
            throw error;
        }
    }

    async _connect() {
        if (this.closed) throw new Error('Avatar session is closed');
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext();
            this.gain = this.audioCtx.createGain();
            this.gain.connect(this.audioCtx.destination);
        }
        await this.audioCtx.resume();

        const response = await fetch(
            new URL(`${this.apiPrefix}/sessions`, this.baseUrl),
            {
                method: 'POST',
                signal: this._connectAbort.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey
                        ? { Authorization: `Bearer ${this.apiKey}` }
                        : {}),
                    ...(this.ownerId
                        ? { 'X-Avatar-Owner-ID': this.ownerId }
                        : {}),
                },
                body: JSON.stringify({
                    preset_id: this.presetId || undefined,
                    system_prompt: this.systemPrompt || undefined,
                    input_format: this.inputFormat,
                    video_codec: 'auto',
                    metadata: this.metadata,
                }),
            },
        );
        if (!response.ok) {
            throw await _responseError(response, 'Failed to create avatar session');
        }
        this.session = await response.json();
        if (this.closed) throw new Error('Avatar session is closed');
        this._emit('sessionCreated', this.session);

        const streamUrl = new URL(this.session.stream_url, this.baseUrl);
        streamUrl.protocol = streamUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const ready = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this._failReady(new Error('Avatar session did not become ready'));
                this.close();
            }, 150000);
            this._readyWaiter = {
                resolve: (value) => {
                    clearTimeout(timer);
                    resolve(value);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
            };
        });
        // The socket may fail before the open waiter resolves.
        ready.catch(() => {});

        this.ws = new WebSocket(streamUrl.toString());
        this.ws.binaryType = 'arraybuffer';
        this.ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
                this._onControl(JSON.parse(event.data));
            } else {
                this._onBinary(event.data);
            }
        };
        this.ws.onerror = () => {
            this._failReady(new Error('Avatar WebSocket failed'));
        };
        this.ws.onclose = () => {
            this._failReady(new Error('Avatar WebSocket closed'));
            this.close();
        };
        await new Promise((resolve, reject) => {
            this.ws.onopen = resolve;
            const originalClose = this.ws.onclose;
            this.ws.onclose = (event) => {
                originalClose?.(event);
                reject(new Error('Avatar WebSocket closed before opening'));
            };
            const originalError = this.ws.onerror;
            this.ws.onerror = (event) => {
                originalError?.(event);
                reject(new Error('Avatar WebSocket failed to open'));
            };
        });

        const videoCodecs = await this._supportedVideoCodecs();
        if (this.closed) throw new Error('Avatar session is closed');
        this.ws.send(JSON.stringify({
            type: 'session.start',
            capabilities: { video_codecs: videoCodecs },
        }));
        return ready;
    }

    static async createCustomization({
        baseUrl = '',
        apiKey = '',
        apiPrefix = '/v1/avatar',
        ownerId = '',
        video,
        audio,
        prompt,
        name,
        description = '',
        onProgress = null,
    }) {
        const form = new FormData();
        form.append('video', video, video.name);
        form.append('audio', audio, audio.name);
        form.append('prompt', prompt);
        form.append('name', name);
        form.append('description', description);
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(
                'POST',
                new URL(
                    `${apiPrefix.replace(/\/$/, '')}/customizations`,
                    baseUrl || location.origin,
                ),
            );
            if (apiKey) {
                xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
            }
            if (ownerId) {
                xhr.setRequestHeader('X-Avatar-Owner-ID', ownerId);
            }
            xhr.upload.onprogress = (event) => {
                if (typeof onProgress === 'function') {
                    const ratio = event.lengthComputable
                        ? event.loaded / event.total
                        : 0;
                    onProgress(ratio);
                }
            };
            xhr.onerror = () => reject(new Error('Avatar upload failed'));
            xhr.onload = () => {
                let payload = null;
                try {
                    payload = JSON.parse(xhr.responseText);
                } catch {
                    // Keep fallback error.
                }
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(_apiError(payload, `Avatar upload failed: ${xhr.status}`));
                    return;
                }
                resolve(payload);
            };
            xhr.send(form);
        });
    }

    static async getCustomization({
        baseUrl = '',
        apiKey = '',
        apiPrefix = '/v1/avatar',
        ownerId = '',
        jobId,
    }) {
        const response = await fetch(
            new URL(
                `${apiPrefix.replace(/\/$/, '')}/customizations/${encodeURIComponent(jobId)}`,
                baseUrl || location.origin,
            ),
            {
                headers: {
                    ...(apiKey
                        ? { Authorization: `Bearer ${apiKey}` }
                        : {}),
                    ...(ownerId
                        ? { 'X-Avatar-Owner-ID': ownerId }
                        : {}),
                },
                cache: 'no-store',
            },
        );
        if (!response.ok) {
            throw await _responseError(
                response,
                'Failed to query avatar customization',
            );
        }
        return response.json();
    }

    async _supportedVideoCodecs() {
        if (typeof VideoDecoder === 'undefined') return ['webp'];
        try {
            const support = await VideoDecoder.isConfigSupported({
                codec: H264_CODEC,
                optimizeForLatency: true,
                avc: { format: 'annexb' },
            });
            return support.supported ? ['h264', 'webp'] : ['webp'];
        } catch {
            return ['webp'];
        }
    }

    _failReady(error) {
        if (this._readyWaiter) {
            this._readyWaiter.reject(error);
            this._readyWaiter = null;
        }
    }

    _onControl(message) {
        this._emit('control', message);
        switch (message.type) {
        case 'session.ready':
            this.fps = Number(message.fps || 24);
            this.prebuffer = Number(message.prebuffer || 8);
            this.videoCodec = message.video_codec || 'webp';
            this.supportsResync = Boolean(message.video_resync);
            this.codecString = message.codec_string || H264_CODEC;
            if (message.width && message.height && this.canvas) {
                this.canvas.width = Number(message.width);
                this.canvas.height = Number(message.height);
            }
            this.epoch = this.audioCtx.currentTime + 0.12;
            this._configureVideoDecoder();
            this._startRender();
            if (this._readyWaiter) {
                this._readyWaiter.resolve(message);
                this._readyWaiter = null;
            }
            this._emit('ready', message);
            break;
        case 'session.queued':
        case 'session.queue_update':
        case 'session.queue_done':
        case 'session.connecting':
            this._emit(message.type, message);
            break;
        case 'transcript.delta':
            this._emit('transcript', message);
            break;
        case 'input.audio_ack':
            this._emit('audioAccepted', message);
            break;
        case 'response.started':
            this.responseActive = true;
            this._emit('responseStarted', message);
            break;
        case 'response.ended':
            this.responseActive = false;
            this._emit('responseEnded', message);
            break;
        case 'response.interrupted':
            this.responseActive = false;
            this._emit('interrupted', message);
            break;
        case 'media.segment':
            this._addSegment(message);
            break;
        case 'media.segment_end':
            this._emit('segmentEnd', message);
            break;
        case 'media.audio_error':
            {
                const segment = this.segments.find(item => item.id === Number(message.segment_id));
                if (segment) segment.audioFailed = true;
                this._emit('error', new Error(message.message || 'Audio segment failed'));
                this._scheduleReady();
            }
            break;
        case 'media.flush':
            this._handleFlush(message);
            break;
        case 'media.interrupt_ack':
            this._emit('interruptAcknowledged', message);
            break;
        case 'session.closed':
            this._emit('closed', message);
            this._cleanupMedia();
            this.closed = true;
            if (this.ws) {
                try { this.ws.close(); } catch { /* already closed */ }
                this.ws = null;
            }
            break;
        case 'error':
            {
                const error = new Error(
                    message.message || message.code || 'Avatar error',
                );
                this._failReady(error);
                this._emit('error', error);
            }
            break;
        default:
            break;
        }
    }

    _addSegment(message) {
        const id = Number(message.id);
        this.highestSegmentId = Math.max(this.highestSegmentId, id);
        if (this.discardUntilFlush || id <= this.cancelledThrough) return;
        const segment = {
            id: Number(message.id),
            totalFrames: Number(message.total_frames || 0),
            startFrame: Number(message.start_frame || 0),
            startPtsUs: Number(message.start_pts_us || 0),
            duration: Number(message.duration || 0),
            responseId: message.response_id,
            responseStartSample: message.response_start_sample,
            sampleRate: message.sample_rate,
            sampleCount: message.sample_count,
            audioScheduled: false,
            audioBuffer: null,
            audioFailed: false,
            receivedFrames: new Set(),
            highestWireFrame: -1,
            missingSince: null,
            resyncFrame: -1,
            startAt: null,
            source: null,
        };
        this.segments.push(segment);
        const pending = this.pendingAudio.get(segment.id);
        if (pending) {
            this.pendingAudio.delete(segment.id);
            this._decodeSegmentAudio(segment, pending);
        }
        this._emit('segment', message);
    }

    _onBinary(buffer) {
        if (this.discardUntilFlush || buffer.byteLength < 8) return;
        const view = new DataView(buffer);
        const magicText = String.fromCharCode(
            view.getUint8(0),
            view.getUint8(1),
            view.getUint8(2),
            view.getUint8(3),
        );
        if (magicText === AUDIO_MAGIC) {
            const segmentId = view.getUint32(4);
            if (segmentId <= this.cancelledThrough) return;
            const wav = buffer.slice(8);
            const segment = this.segments.find((item) => item.id === segmentId);
            if (segment) this._decodeSegmentAudio(segment, wav);
            else this.pendingAudio.set(segmentId, wav);
            return;
        }
        if (buffer.byteLength <= 24) return;
        const magic = view.getUint32(0);
        if (magic === H264_FRAME_MAGIC) {
            this._decodeH264Frame(view, buffer);
            return;
        }
        if (magic !== FRAME_MAGIC) return;
        this._decodeImageFrame(view, buffer);
    }

    _decodeSegmentAudio(segment, wav) {
        this.audioCtx.decodeAudioData(wav.slice(0))
            .then((audioBuffer) => {
                if (!this.segments.includes(segment)) return;
                segment.audioBuffer = audioBuffer;
                segment.duration = audioBuffer.duration;
                this._scheduleReady();
            })
            .catch((error) => {
                if (!this.segments.includes(segment)) return;
                segment.audioFailed = true;
                this._emit('error', error);
                this._scheduleReady();
            });
    }

    _decodeImageFrame(view, buffer) {
        const kind = view.getUint8(4);
        const segmentId = view.getUint32(8);
        const ptsUs = Number(view.getBigInt64(12));
        const index = view.getUint32(20);
        const pixels = new Uint8Array(buffer, 24);
        const webp = pixels[0] === 0x52 && pixels[1] === 0x49
            && pixels[8] === 0x57 && pixels[9] === 0x45;
        const generation = this.decoderGeneration;
        createImageBitmap(
            new Blob([pixels], { type: webp ? 'image/webp' : 'image/jpeg' }),
        ).then((bitmap) => {
            if (generation !== this.decoderGeneration || this.discardUntilFlush) {
                bitmap.close();
                return;
            }
            this._storeFrame(index, bitmap, kind, segmentId, ptsUs);
        }).catch((error) => this._emit('error', error));
    }

    _configureVideoDecoder() {
        this._resetDecoder();
        if (this.videoCodec !== 'h264' || typeof VideoDecoder === 'undefined') {
            return;
        }
        const generation = this.decoderGeneration;
        try {
            this.videoDecoder = new VideoDecoder({
                output: (frame) => {
                    const meta = this.decoderMeta.get(frame.timestamp);
                    this.decoderMeta.delete(frame.timestamp);
                    if (
                        generation !== this.decoderGeneration
                        || this.discardUntilFlush
                        || !meta
                    ) {
                        frame.close();
                        return;
                    }
                    createImageBitmap(frame).then((bitmap) => {
                        if (
                            generation !== this.decoderGeneration
                            || this.discardUntilFlush
                        ) {
                            bitmap.close();
                            return;
                        }
                        this._storeFrame(
                            meta.index,
                            bitmap,
                            meta.kind,
                            meta.segmentId,
                            meta.ptsUs,
                        );
                    }).catch(error => this._emit('frameDropped', error)).finally(() => frame.close());
                },
                error: (error) => {
                    if (generation !== this.decoderGeneration || this.closed) return;
                    this._resetDecoder();
                    this._emit('decoderReset', error);
                },
            });
            this.videoDecoder.configure({
                codec: this.codecString,
                codedWidth: this.canvas?.width || undefined,
                codedHeight: this.canvas?.height || undefined,
                optimizeForLatency: true,
                avc: { format: 'annexb' },
            });
            this.waitingKeyframe = true;
        } catch (error) {
            this.videoDecoder = null;
            this._emit('error', error);
        }
    }

    _decodeH264Frame(view, buffer) {
        const kind = view.getUint8(4);
        const keyframe = (view.getUint8(6) & FRAME_FLAG_KEYFRAME) !== 0;
        const segmentId = view.getUint32(8);
        const ptsUs = Number(view.getBigInt64(12));
        const index = view.getUint32(20);
        const segment = this.segments.find(item => item.id === segmentId);
        if (segment) segment.highestWireFrame = Math.max(segment.highestWireFrame, index);
        if (this.videoDecoder?.decodeQueueSize > this.fps * 2) this._resetDecoder();
        if (!this.videoDecoder) {
            if (!keyframe) return;
            this._configureVideoDecoder();
            if (!this.videoDecoder) return;
        }
        if (this.waitingKeyframe && !keyframe) return;
        if (keyframe) this.waitingKeyframe = false;
        const timestamp = ++this.decodeSequence;
        this.decoderMeta.set(timestamp, { kind, segmentId, ptsUs, index });
        try {
            this.videoDecoder.decode(new EncodedVideoChunk({
                type: keyframe ? 'key' : 'delta',
                timestamp,
                data: new Uint8Array(buffer, 24),
            }));
        } catch (error) {
            this._emit('error', error);
            this._resetDecoder();
        }
    }

    _storeFrame(index, bitmap, kind, segmentId, ptsUs) {
        // The shared Gateway timeline may continue across viewer connections.
        // Start this viewer's clock at its first decoded frame, not frame zero.
        if (this.lastDrawn < 0 && this.frames.size === 0 && this.audioCtx && !this.audioScheduleEnd) {
            this.epoch = this.audioCtx.currentTime + 0.12 - ptsUs / 1e6;
        }
        // After an idle-stream underrun, consume the returning frames at their
        // original cadence instead of jumping to the end of every network burst.
        if (kind === FRAME_IDLE && this.lastDrawn >= 0 && index > this.lastDrawn
            && this.lastDrawn === this.newestFrame && this.scheduleCursor === this.segments.length
            && this.audioScheduleEnd <= this.audioCtx.currentTime) {
            const nextDue = this.epoch + (this.lastDrawn + 1) / this.fps;
            if (this.audioCtx.currentTime - nextDue > 2 / this.fps) {
                this.epoch = this.audioCtx.currentTime - (this.lastDrawn + 1) / this.fps;
            }
        }
        this.newestFrame = Math.max(this.newestFrame ?? -1, index);
        const old = this.frames.get(index);
        if (old) old.bitmap.close();
        this.frames.set(index, { bitmap, kind, segmentId, ptsUs });
        if (segmentId !== IDLE_SEGMENT) {
            const segment = this.segments.find((item) => item.id === segmentId);
            if (segment) segment.receivedFrames.add(index);
        }
        if (this.lastDrawn >= 0) this._prune(this.lastDrawn);
        this._scheduleReady();
    }

    _hasPrebuffer(segment) {
        return this._firstMissingFrame(segment) === null;
    }

    _firstMissingFrame(segment) {
        const continuation = this._isContinuation(segment);
        const needed = Math.min(
            segment.totalFrames,
            continuation ? CONTINUATION_PREBUFFER_FRAMES : CLIENT_PREBUFFER_FRAMES,
        );
        for (let offset = 0; offset < needed; offset += 1) {
            if (!segment.receivedFrames.has(segment.startFrame + offset)) {
                return segment.startFrame + offset;
            }
        }
        return null;
    }

    _isContinuation(segment) {
        const previous = this.segments[this.scheduleCursor - 1];
        return Boolean(
            this.audioScheduleEnd > 0
            && previous
            && previous.startAt !== null
            && segment.startFrame === previous.startFrame + previous.totalFrames,
        );
    }

    _recoverMissingFrame(segment, missing) {
        if (!this.supportsResync || this.videoCodec !== 'h264' || missing === null
            || segment.highestWireFrame < missing || segment.resyncFrame === missing) return;
        const now = performance.now();
        if (segment.missingSince === null) segment.missingSince = now;
        if (now - segment.missingSince < 1500 || now - this.lastResyncAt < 2500) return;
        if (this.ws?.readyState !== WebSocket.OPEN || this.discardUntilFlush) return;
        segment.resyncFrame = missing;
        this.lastResyncAt = now;
        this._configureVideoDecoder();
        this.ws.send(JSON.stringify({ type: 'media.video_resync', segment_id: segment.id, frame_index: missing }));
    }

    _scheduleReady() {
        if (!this.audioCtx) return;
        while (this.scheduleCursor < this.segments.length) {
            const segment = this.segments[this.scheduleCursor];
            if (!segment.audioBuffer && !segment.audioFailed) break;
            const due = this.epoch + segment.startPtsUs / 1e6;
            const continuing = this._isContinuation(segment);
            const missing = this._firstMissingFrame(segment);
            if (missing !== null) {
                this._recoverMissingFrame(segment, missing);
                // For consecutive WAVs the prior audio already provides a clock.
                // Schedule the samples now. Draw whichever lip frame is due on that clock.
                if (!continuing) break;
            }
            const when = continuing
                ? Math.max(
                    this.audioScheduleEnd,
                    this.audioCtx.currentTime + AUDIO_CONTINUATION_LEAD_S,
                )
                : Math.max(
                    this.audioCtx.currentTime + AUDIO_START_BUFFER_S,
                    due,
                    this.audioScheduleEnd,
                );
            if (when - due > TIMELINE_SLACK_S) {
                this.epoch += when - due;
            }
            segment.startAt = when;
            this.scheduleCursor += 1;
            if (!segment.audioBuffer) {
                this.audioScheduleEnd = when + segment.duration;
                continue;
            }
            const source = this.audioCtx.createBufferSource();
            source.buffer = segment.audioBuffer;
            source.connect(this.gain);
            source.start(when);
            segment.source = source;
            segment.audioScheduled = true;
            this.audioScheduleEnd = when + segment.audioBuffer.duration;
        }
    }

    _playbackTarget(now) {
        const segment = this.segments[this.currentIndex];
        if (segment && segment.startAt !== null && now >= segment.startAt) {
            const endFrame = segment.startFrame + segment.totalFrames - 1;
            const elapsed = now - segment.startAt;
            if (elapsed < segment.duration) {
                return Math.min(
                    endFrame,
                    segment.startFrame + Math.floor(elapsed * this.fps + 1e-6),
                );
            }
            const next = this.segments[this.currentIndex + 1];
            if (
                next
                && next.startFrame === endFrame + 1
                && (next.startAt === null || now < next.startAt)
            ) {
                return endFrame;
            }
            return Math.max(
                endFrame,
                Math.floor(Math.max(0, now - this.epoch) * this.fps),
            );
        }
        return Math.floor(Math.max(0, now - this.epoch) * this.fps);
    }

    _startRender() {
        if (this.renderHandle) return;
        const tick = () => {
            this.renderHandle = requestAnimationFrame(tick);
            this._render();
        };
        this.renderHandle = requestAnimationFrame(tick);
    }

    _render() {
        if (!this.audioCtx || !this.canvas) return;
        this._scheduleReady();
        const now = this.audioCtx.currentTime;
        while (this.currentIndex + 1 < this.segments.length) {
            const next = this.segments[this.currentIndex + 1];
            if (next.startAt === null || now < next.startAt) break;
            this._releaseSegment(this.segments[this.currentIndex]);
            this.currentIndex += 1;
        }
        this._drawAt(this._playbackTarget(now));
        this._ack(this.lastDrawn);
    }

    _drawAt(target) {
        const pending = this.segments[this.scheduleCursor];
        const limit = pending
            ? Math.min(target, pending.startFrame - 1)
            : target;
        let selectedIndex = -1;
        let selected = null;
        for (const [index, frame] of this.frames) {
            if (index <= limit && index > selectedIndex) {
                selectedIndex = index;
                selected = frame;
            }
        }
        if (!selected || selectedIndex <= this.lastDrawn) {
            this._drawBufferedIdle();
            return;
        }
        const previousKind = this.lastRemoteKind;
        this.lastRemoteKind = selected.kind;
        this.lastRemoteDrawTime = this.audioCtx.currentTime;
        const idle = this.idleVideo;
        if (idle && selected.kind === FRAME_IDLE && Number.isFinite(idle.duration) && idle.duration > 0) {
            const phase = (selectedIndex / this.fps) % idle.duration;
            if (!idle.seeking && (previousKind !== FRAME_IDLE || Math.abs(idle.currentTime - phase) > 0.18)) {
                idle.currentTime = phase;
            }
            if (idle.paused) idle.play().catch(() => {});
        } else if (idle && !idle.paused) {
            idle.pause();
        }
        const context = this.canvas.getContext('2d');
        context.drawImage(
            selected.bitmap,
            0,
            0,
            this.canvas.width,
            this.canvas.height,
        );
        const firstFrame = this.lastDrawn < 0;
        this.lastDrawn = selectedIndex;
        if (firstFrame) this._emit('firstFrame', { index: selectedIndex });
        this._prune(selectedIndex);
    }

    _drawBufferedIdle() {
        const idle = this.idleVideo;
        if (!idle || this.lastRemoteKind !== FRAME_IDLE || idle.readyState < 2
            || idle.seeking || idle.paused || this.discardUntilFlush) return false;
        const now = this.audioCtx.currentTime;
        if (now - this.lastRemoteDrawTime < 2 / this.fps) return false;
        const current = this.segments[this.currentIndex];
        if (current?.startAt != null && now >= current.startAt
            && now < current.startAt + current.duration) return false;
        const frame = Math.floor(idle.currentTime * this.fps);
        if (this.lastIdlePaint === frame) return false;
        this.lastIdlePaint = frame;
        this.canvas.getContext('2d').drawImage(idle, 0, 0, this.canvas.width, this.canvas.height);
        // The ACK clock tracks server frames only.
        return true;
    }

    _prune(anchor) {
        const minimum = Math.max(0, anchor - 6);
        for (const [index, frame] of this.frames) {
            if (index < minimum) {
                frame.bitmap.close();
                this.frames.delete(index);
            }
        }
    }

    _ack(index) {
        const frame = this.frames.get(index);
        if (
            !frame
            || !this.ws
            || this.ws.readyState !== WebSocket.OPEN
        ) {
            return;
        }
        const segment = frame.segmentId === IDLE_SEGMENT
            ? null
            : this.segments.find((item) => item.id === frame.segmentId);
        const finalMedia = segment
            && frame.kind !== FRAME_IDLE
            && index >= segment.startFrame + segment.totalFrames - 1;
        let send = false;
        if (
            frame.kind !== FRAME_IDLE
            && index > this.lastMediaAck
            && (index - this.lastMediaAck >= 6 || finalMedia)
        ) {
            this.lastMediaAck = index;
            send = true;
        }
        if (index - this.lastAck >= 3) {
            this.lastAck = index;
            send = true;
        }
        if (!send) return;
        this.ws.send(JSON.stringify({
            type: 'media.ack',
            frame_index: index,
            pts_us: frame.ptsUs,
            kind: frame.kind === FRAME_IDLE
                ? 'idle'
                : frame.kind === FRAME_SILENT ? 'silent' : 'speech',
        }));
    }

    async prepareMicrophone() {
        try {
            return await this._prepareMicrophone();
        } catch (error) {
            this.close();
            throw error;
        }
    }

    async _prepareMicrophone() {
        if (this.closed) throw new Error('Avatar session is closed');
        if (this.micStream) return;
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext();
            this.gain = this.audioCtx.createGain();
            this.gain.connect(this.audioCtx.destination);
        }
        await this.audioCtx.resume();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
                channelCount: 1,
                echoCancellation: true,
                ...(this.microphoneDeviceId
                    ? { deviceId: { exact: this.microphoneDeviceId } }
                    : {}),
            },
        });
        if (this.closed) {
            for (const track of stream.getTracks()) track.stop();
            throw new Error('Avatar session is closed');
        }
        this.micStream = stream;
        // Match the proven /avatar capture ordering.
        const context = new AudioContext({ sampleRate: 16000 });
        this.micCtx = context;
        await context.resume();
        const workletUrl = URL.createObjectURL(
            new Blob([CAPTURE_WORKLET_SOURCE], { type: 'text/javascript' }),
        );
        try {
            await context.audioWorklet.addModule(workletUrl);
        } finally {
            URL.revokeObjectURL(workletUrl);
        }
        if (this.closed) throw new Error('Avatar session is closed');
        const source = context.createMediaStreamSource(stream);
        const node = new AudioWorkletNode(context, 'avatar-session-capture', {
            processorOptions: { chunkSize: Math.round(context.sampleRate / 5) },
        });
        const destination = context.createMediaStreamDestination();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(node);
        node.connect(destination);
        source.connect(analyser);
        const analyserSamples = new Float32Array(analyser.fftSize);
        node.port.onmessage = ({ data }) => {
            if (data?.type === 'level') {
                if (this.speechInterruptor && this.micActive && !this.closed) {
                    const speaking = !this.discardUntilFlush && (this.responseActive
                        || this.scheduleCursor < this.segments.length
                        || this.audioScheduleEnd > this.audioCtx.currentTime);
                    this.speechInterruptor.update(data.rms, speaking, this.muted);
                }
                return;
            }
            if (data?.type !== 'chunk') return;
            const samples = _resampleAudio(
                data.audio,
                context.sampleRate,
                16000,
            );
            let energy = 0;
            for (let index = 0; index < samples.length; index += 1) {
                energy += samples[index] * samples[index];
            }
            const rms = Math.sqrt(energy / Math.max(1, samples.length));
            analyser.getFloatTimeDomainData(analyserSamples);
            let sourceEnergy = 0;
            for (const sample of analyserSamples) {
                sourceEnergy += sample * sample;
            }
            const sourceRms = Math.sqrt(
                sourceEnergy / Math.max(1, analyserSamples.length),
            );
            this._emit('microphoneLevel', { rms, sourceRms });
            if (
                !this.micActive
                || !this.ws
                || this.ws.readyState !== WebSocket.OPEN
            ) {
                return;
            }
            const forceListen = !this.muted && Boolean(this.speechInterruptor?.forceListen());
            if (this.binaryMicrophone) {
                this.ws.send(_microphonePacket(samples, forceListen, energy === 0));
                this.sequence++;
                return;
            }
            this.ws.send(JSON.stringify({
                type: 'input.audio.append',
                sequence: this.sequence++,
                force_listen: forceListen,
                audio: _arrayBufferToBase64(samples.buffer),
            }));
        };
        this.micCtx = context;
        this.micStream = stream;
        this.micSource = source;
        this.micNode = node;
        this.micDest = destination;
        this.micAnalyser = analyser;
        this.micPrepared = true;
        const track = stream.getAudioTracks()[0];
        const microphoneInfo = {
            label: track?.label || '',
            muted: Boolean(track?.muted),
            readyState: track?.readyState || '',
            settings: track?.getSettings?.() || {},
        };
        console.info('[avatar-session] microphone ready', microphoneInfo);
        track?.addEventListener('mute', () => {
            this._emit('microphoneTrackState', { muted: true });
        });
        track?.addEventListener('unmute', () => {
            this._emit('microphoneTrackState', { muted: false });
        });
        this._emit('microphoneReady', microphoneInfo);
    }

    async startMicrophone() {
        if (!this.micPrepared) await this.prepareMicrophone();
        if (this.micActive) return;
        this.micActive = true;
        this.micNode.port.postMessage({ command: 'start' });
        this._emit('microphoneStarted', null);
    }

    _playedSamples() {
        const ctx = this.audioCtx;
        const result = Object.create(null);
        if (!ctx) return result;
        // Output time excludes rendered audio still queued at the device.
        const outputTime = ctx.getOutputTimestamp?.().contextTime;
        const now = Number.isFinite(outputTime) ? outputTime
            : Math.max(0, ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0));
        const ends = new Map();
        for (const segment of this.segments) {
            const { responseId, sampleRate, sampleCount, responseStartSample, startAt } = segment;
            if (!responseId || !segment.audioScheduled || startAt === null || startAt >= now
                || !Number.isInteger(responseStartSample) || !(sampleRate > 0)) continue;
            const previous = ends.get(responseId) || 0;
            if (responseStartSample > previous) continue;
            const elapsed = now - startAt;
            const samples = elapsed >= segment.duration ? sampleCount
                : Math.min(sampleCount, Math.floor(elapsed * sampleRate));
            const end = Math.max(previous, responseStartSample + samples);
            ends.set(responseId, end);
            result[responseId] = Math.floor(end * 24000 / sampleRate);
        }
        return Object.fromEntries(Object.entries(result).slice(-11));
    }

    interrupt() {
        if (this.discardUntilFlush || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.responseActive = false;
        this.discardUntilFlush = true;
        const playback = this._playedSamples();
        this._dropFromCurrent();
        this._emit('interrupted', { reason: 'local_interrupt' });
        this.ws.send(JSON.stringify({ type: 'input.interrupt', playback }));
        clearTimeout(this.interruptTimer);
        this.interruptTimer = setTimeout(() => {
            // Delay is not proof the old media has been flushed.
            this._emit('interruptTimeout', null);
        }, INTERRUPT_TIMEOUT_MS);
    }

    _handleFlush(message) {
        clearTimeout(this.interruptTimer);
        this.interruptTimer = null;
        this.discardUntilFlush = false;
        this.lastRemoteKind = null;
        this._dropFromCurrent();
        const frameIndex = Number(message.frame_index);
        if (Number.isFinite(frameIndex)) {
            this.lastDrawn = Math.min(this.lastDrawn, frameIndex);
            this.newestFrame = this.lastDrawn;
            this.lastAck = Math.min(this.lastAck, frameIndex);
            this.lastMediaAck = Math.min(this.lastMediaAck, frameIndex);
            if (this.audioCtx) this.epoch = this.audioCtx.currentTime - frameIndex / this.fps;
            for (const [index, frame] of this.frames) {
                if (index > frameIndex) {
                    frame.bitmap.close();
                    this.frames.delete(index);
                }
            }
        }
        // A flush is a new H.264 decoding epoch. Recreate the decoder so the
        // incoming post-flush IDR can be consumed instead of being dropped by
        // the null decoder left behind by interrupt().
        this._configureVideoDecoder();
        this._emit('flush', message);
    }

    _dropFromCurrent() {
        this.cancelledThrough = this.highestSegmentId;
        for (const segment of this.segments) {
            this._stopSource(segment);
            this._releaseSegment(segment);
        }
        for (const frame of this.frames.values()) frame.bitmap.close();
        this.frames.clear();
        this.segments = [];
        this.scheduleCursor = 0;
        this.currentIndex = 0;
        this.audioScheduleEnd = 0;
        this.pendingAudio.clear();
    }

    _stopSource(segment) {
        if (!segment.source) return;
        try {
            segment.source.stop();
        } catch {
            // Already stopped.
        }
        segment.source.disconnect();
        segment.source = null;
    }

    _releaseSegment(segment) {
        segment.audioBuffer = null;
        segment.source = null;
    }

    _resetDecoder() {
        this.decoderGeneration += 1;
        this.decoderMeta.clear();
        this.waitingKeyframe = false;
        if (this.videoDecoder) {
            try {
                this.videoDecoder.close();
            } catch {
                // Already closed.
            }
            this.videoDecoder = null;
        }
    }

    mute(muted = true) {
        this.muted = Boolean(muted);
        if (this.micStream) {
            for (const track of this.micStream.getAudioTracks()) {
                track.enabled = !this.muted;
            }
        }
    }

    setVolume(value) {
        if (this.gain) {
            this.gain.gain.value = Math.max(0, Math.min(1, Number(value)));
        }
    }

    async setOutputDevice(deviceId = '') {
        if (this.audioCtx && typeof this.audioCtx.setSinkId === 'function') {
            await this.audioCtx.setSinkId(deviceId || '');
        }
    }

    _cleanupMedia() {
        this.idleVideo?.pause();
        this.lastRemoteKind = null;
        if (this.renderHandle) cancelAnimationFrame(this.renderHandle);
        this.renderHandle = 0;
        clearTimeout(this.interruptTimer);
        this.interruptTimer = null;
        this._stopMicrophone();
        for (const segment of this.segments) this._stopSource(segment);
        for (const frame of this.frames.values()) frame.bitmap.close();
        this.frames.clear();
        this.segments = [];
        this._resetDecoder();
        this.audioCtx?.close().catch(() => {});
        this.audioCtx = null;
        this.gain = null;
    }

    _stopMicrophone() {
        if (this.micNode) {
            try {
                this.micNode.port.postMessage({ command: 'stop' });
            } catch {
                // Worklet already stopped.
            }
        }
        for (const node of [
            this.micSource,
            this.micNode,
            this.micDest,
            this.micAnalyser,
        ]) {
            try {
                node?.disconnect();
            } catch {
                // Already disconnected.
            }
        }
        for (const track of this.micStream?.getTracks() || []) track.stop();
        this.micCtx?.close().catch(() => {});
        this.micStream = null;
        this.micSource = null;
        this.micNode = null;
        this.micDest = null;
        this.micAnalyser = null;
        this.micCtx = null;
        this.micPrepared = false;
        this.micActive = false;
    }

    close() {
        if (this.closed) return;
        this.closed = true;
        this._connectAbort.abort();
        this._failReady(new Error('Avatar session is closed'));
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'session.close',
                reason: 'client_closed',
            }));
        }
        this._cleanupMedia();
        try {
            this.ws?.close();
        } catch {
            // Already closed.
        }
        this.ws = null;
        this._emit('closed', { reason: 'client_closed' });
    }
}


async function _responseError(response, fallback) {
    let payload = null;
    try {
        payload = await response.json();
    } catch {
        // Keep fallback.
    }
    const detail = payload?.detail;
    const message = typeof detail === 'object'
        ? detail?.message
        : detail;
    const error = new Error(message || fallback);
    error.code = typeof detail === 'object' ? detail?.code : undefined;
    error.status = response.status;
    return error;
}


function _apiError(payload, fallback) {
    const detail = payload?.detail;
    const message = typeof detail === 'object'
        ? detail?.message
        : detail;
    const error = new Error(message || fallback);
    error.code = typeof detail === 'object' ? detail?.code : undefined;
    return error;
}


function _resampleAudio(samples, fromRate, toRate) {
    if (fromRate === toRate) return samples;
    const ratio = fromRate / toRate;
    const length = Math.round(samples.length / ratio);
    const output = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
        const sourceIndex = index * ratio;
        const floor = Math.floor(sourceIndex);
        const fraction = sourceIndex - floor;
        const next = Math.min(floor + 1, samples.length - 1);
        output[index] = samples[floor] * (1 - fraction)
            + samples[next] * fraction;
    }
    return output;
}


function _microphonePacket(samples, forceListen, silent) {
    const bytes = new Uint8Array(7 + (silent ? 0 : samples.length * 2));
    bytes.set([77, 73, 67, 49]); // MIC1
    const view = new DataView(bytes.buffer);
    view.setUint8(4, Number(forceListen) | (silent ? 2 : 0));
    view.setUint16(5, samples.length, true);
    if (!silent) {
        for (let i = 0; i < samples.length; i++) {
            const value = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32768)));
            view.setInt16(7 + i * 2, value, true);
        }
    }
    return bytes;
}

function _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunks = [];
    for (let index = 0; index < bytes.length; index += 8192) {
        chunks.push(
            String.fromCharCode.apply(
                null,
                bytes.subarray(index, index + 8192),
            ),
        );
    }
    return btoa(chunks.join(''));
}
