/**
 * AvatarPlayer — MuseTalk /ws/live client for the omni page in avatar mode.
 *
 * Ported from MuseTalk web/app.js. Each binary message is one encoded frame
 * behind a 24-byte header (magic "MTF1", kind, segment id, pts_us, frame
 * index). Each `segment` message points at a WAV that is scheduled on the
 * AudioContext at the segment's pts; the audio clock picks the frame to
 * draw, and ACKs tell the server how far playback has got.
 */

const FRAME_MAGIC = 0x4d544631;
const H264_FRAME_MAGIC = 0x4d544831;
const IDLE_SEGMENT = 0xffffffff;
const FRAME_IDLE = 0;
const FRAME_SILENT = 2;
const RETRY_MS = 3000;
export const INTERRUPT_FLUSH_TIMEOUT_MS = 2500;
// Frames of a segment needed before its audio may start (server meta.prebuffer
// is the answer-start delay, already applied on the server timeline).
const CLIENT_PREBUFFER_FRAMES = 8;
const CONTINUATION_PREBUFFER_FRAMES = 2;
// The first server window is 20/24 s; allow its 4/24 s remainder
// plus a short jitter margin before switching to 1 s continuations.
const AUDIO_START_BUFFER_S = 0.30;
const AUDIO_CONTINUATION_LEAD_S = 0.012;
// Audio starting later than its pts by more than this shifts the video clock.
const TIMELINE_SLACK_S = 0.01;

export class AvatarPlayer {
    /**
     * @param {object} opts
     * @param {HTMLCanvasElement} opts.canvas
     * @param {HTMLElement} [opts.statusEl]   text status line
     * @param {HTMLElement} [opts.subtitleEl] subtitle line over the avatar
     * @param {string} [opts.base]            same-origin proxy prefix
     * @param {number} [opts.interruptTimeoutMs] flush recovery watchdog
     */
    constructor({
        canvas,
        statusEl = null,
        subtitleEl = null,
        base = '/avatar-live',
        interruptTimeoutMs = INTERRUPT_FLUSH_TIMEOUT_MS,
    }) {
        this.canvas = canvas;
        this.statusEl = statusEl;
        this.subtitleEl = subtitleEl;
        this.base = base;
        this.ws = null;
        this.ctx = null;
        this.gain = null;
        this.fps = 24;
        this.prebuffer = 8;
        this.maxPrefetch = 4;
        this.closed = false;
        this._supportsVideoResync = false;
        this.videoCodec = 'webp';
        this._codecString = 'avc1.640028';
        this._videoDecoder = null;
        this._decodePending = new Map();
        this._decodeSequence = 0;
        this._decodeGeneration = 0;
        this.frames = new Map();
        this._raf = 0;
        this._retryTimer = null;
        this._subtitleTimers = [];
        this._speaking = null;
        this._responseActive = false;
        this._playbackState = null;
        this.interruptTimeoutMs = interruptTimeoutMs;
        this.onInterruptAcknowledged = null;
        this.onInterruptTimeout = null;
        this._interruptTimer = null;
        this._interruptToken = 0;
        this._resetTimeline();
    }

    /** Subtitle lag ≈ server answer-start buffer + render/network margin. */
    get latencyMs() {
        return Math.round((this.prebuffer / this.fps) * 1000) + 300;
    }

    get hasPendingSpeech() {
        if (!this.ctx) return false;
        return this.segments.some((segment) => segment.startAt === null
            || segment.startAt + segment.duration > this.ctx.currentTime);
    }

    setResponseActive(active) {
        this._responseActive = Boolean(active);
    }

    /**
     * Unlock audio and connect. Call from a user gesture (the Start click).
     * @param {(ctx: AudioContext) => void} [applySink] output device hook
     */
    async start(applySink) {
        this.videoCodec = 'webp';
        if (typeof VideoDecoder !== 'undefined') {
            try {
                const support = await VideoDecoder.isConfigSupported({
                    codec: this._codecString, optimizeForLatency: true,
                });
                if (support.supported) this.videoCodec = 'h264';
            } catch { /* use the image transport */ }
        }
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.gain = this.ctx.createGain();
            this.gain.connect(this.ctx.destination);
            if (applySink) {
                try { applySink(this.ctx); } catch (_) { /* keep default sink */ }
            }
        }
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this._connect();
        if (!this._raf) this._raf = requestAnimationFrame(() => this._render());
    }

    close() {
        this.closed = true;
        this._resetVideoDecoder();
        this._clearInterruptWatchdog();
        clearTimeout(this._retryTimer);
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = 0;
        this.clearSubtitle();
        if (this.ws) this.ws.close();
        this._stopAudio();
    }

    /** Stop queued playback immediately; the next forced-listen chunk flushes the server. */
    interrupt() {
        this._resetVideoDecoder();
        this._discardUntilFlush = true;
        this._dropFromCurrent();
        this.clearSubtitle();
        this._speaking = false;
        this._setStatus('idle', '正在听你说');
        this._startInterruptWatchdog();
    }

    /** Show model text after the avatar latency so it lines up with the mouth. */
    setSubtitle(text) {
        this._later(() => this._showSubtitle(text));
    }

    endSubtitle() {
        this._later(() => {
            const t = setTimeout(() => this._showSubtitle(''), 1500);
            this._subtitleTimers.push(t);
        });
    }

    clearSubtitle() {
        for (const t of this._subtitleTimers) clearTimeout(t);
        this._subtitleTimers = [];
        this._showSubtitle('');
    }

    _later(fn) {
        const t = setTimeout(() => {
            this._subtitleTimers = this._subtitleTimers.filter((x) => x !== t);
            fn();
        }, this.latencyMs);
        this._subtitleTimers.push(t);
    }

    _showSubtitle(text) {
        if (!this.subtitleEl) return;
        // Turn text accumulates; keep the latest part on one or two lines.
        const shown = text && text.length > 48 ? `…${text.slice(-48)}` : text;
        this.subtitleEl.textContent = shown;
        this.subtitleEl.hidden = !shown;
    }

    _setStatus(state, text) {
        if (!this.statusEl) return;
        this.statusEl.textContent = text;
        this.statusEl.dataset.state = state;
    }

    // ---- connection ----

    _connect() {
        if (this.closed || (this.ws && this.ws.readyState <= WebSocket.OPEN)) return;
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const codecQuery = encodeURIComponent(this.videoCodec);
        const ws = new WebSocket(`${proto}//${location.host}${this.base}/ws/live?video_codec=${codecQuery}`);
        ws.binaryType = 'arraybuffer';
        this.ws = ws;
        this._setStatus('connecting', '数字人连接中…');
        ws.onopen = () => {
            // Server frame indices restart at 0 for every viewer connection.
            this._resetTimeline();
            this.epoch = this.ctx.currentTime + 0.12;
            ws.send(JSON.stringify({ type: 'ready' }));
        };
        ws.onmessage = (event) => {
            if (typeof event.data === 'string') this._onControl(JSON.parse(event.data));
            else this._onFrame(event.data);
        };
        ws.onclose = () => {
            if (this.ws === ws) this.ws = null;
            this._stopAudio();
            if (this.closed) return;
            if (this.statusEl && this.statusEl.dataset.state !== 'error') {
                this._setStatus('error', '数字人连接断开，正在重连…');
            }
            clearTimeout(this._retryTimer);
            this._retryTimer = setTimeout(() => this._connect(), RETRY_MS);
        };
    }

    _onControl(msg) {
        switch (msg.type) {
        case 'meta':
            this._supportsVideoResync = Boolean(msg.video_resync)
                && (msg.codec === 'h264' || msg.video_codec === 'h264');
            this._codecString = msg.codec_string || this._codecString;
            this.fps = msg.fps || 24;
            this.prebuffer = msg.prebuffer || 8;
            this.maxPrefetch = msg.max_prefetch_seconds || 4;
            if (msg.width && msg.height) {
                this.canvas.width = msg.width;
                this.canvas.height = msg.height;
            }
            this._speaking = null;
            this._setStatus('idle', '数字人待机');
            break;
        case 'segment': {
            if (this._discardUntilFlush) break;
            const segment = {
                id: msg.id,
                totalFrames: Number(msg.total_frames || 0),
                startFrame: Number(msg.start_frame || 0),
                startPtsUs: Number(msg.start_pts_us || 0),
                duration: Number(msg.duration || 0),
                audioUrl: `${this.base}${msg.audio_url}`,
                audioBuffer: null,
                receivedFrames: new Set(),
                startAt: null,
                source: null,
            };
            this.segments.push(segment);
            this._loadAudio(segment);
            break;
        }
        case 'flush':
            this._resetVideoDecoder();
            this._discardUntilFlush = false;
            this._clearInterruptWatchdog();
            // Upstream barge-in: drop the current answer, nothing resumes.
            this._dropFromCurrent();
            this.clearSubtitle();
            // The server restarts its timeline right after this frame.
            if (Number.isFinite(msg.frame_index)) {
                // Canceled future segments must not leave a future clock
                // offset on the next response. Anchor the new timeline now.
                if (this.ctx) this.epoch = this.ctx.currentTime - (msg.frame_index + 1) / this.fps;
                this.lastDrawn = Math.min(this.lastDrawn, msg.frame_index);
                for (const [index, frame] of this.frames) {
                    if (index > msg.frame_index) {
                        frame.bitmap.close();
                        this.frames.delete(index);
                    }
                }
            }
            if (typeof this.onInterruptAcknowledged === 'function') {
                this.onInterruptAcknowledged();
            }
            break;
        case 'error':
        case 'live_end':
            this._setStatus('error', msg.message || '数字人服务异常');
            break;
        default:
            break;
        }
    }

    // ---- media ----

    _onFrame(buffer) {
        if (this._discardUntilFlush) return;
        if (buffer.byteLength <= 24) return;
        const view = new DataView(buffer);
        const magic = view.getUint32(0);
        if (magic !== FRAME_MAGIC && magic !== H264_FRAME_MAGIC) return;
        const kind = view.getUint8(4);
        const segmentId = view.getUint32(8);
        const ptsUs = Number(view.getBigInt64(12));
        const index = view.getUint32(20);
        const ws = this.ws;
        const pixels = new Uint8Array(buffer, 24);
        if (magic === H264_FRAME_MAGIC) {
            this._decodeH264(pixels, Boolean(view.getUint8(6) & 1),
                { kind, segmentId, ptsUs, index }, ws);
            return;
        }
        if (pixels[0] === 0x48 && pixels[1] === 0x32
            && pixels[2] === 0x36 && pixels[3] === 0x34) {
            this._decodeH264(pixels.subarray(5), Boolean(pixels[4]),
                { kind, segmentId, ptsUs, index }, ws);
            return;
        }
        const generation = this._decodeGeneration;
        const webp = pixels[0] === 0x52 && pixels[1] === 0x49
            && pixels[8] === 0x57 && pixels[9] === 0x45;
        createImageBitmap(new Blob([pixels], { type: webp ? 'image/webp' : 'image/jpeg' }))
            .then((bitmap) => {
                if (this.ws !== ws || generation !== this._decodeGeneration
                    || this._discardUntilFlush) { bitmap.close(); return; }
                const old = this.frames.get(index);
                if (old) old.bitmap.close();
                this.frames.set(index, { bitmap, kind, segmentId, ptsUs });
                if (segmentId !== IDLE_SEGMENT) {
                    const segment = this.segments.find((s) => s.id === segmentId);
                    if (segment) segment.receivedFrames.add(index);
                }
                if (this.lastDrawn >= 0) this._prune(this.lastDrawn);
                this._scheduleReady();
            })
            .catch(() => {});
    }

    _fallbackToImages() {
        if (this.videoCodec !== 'h264') return;
        this.videoCodec = 'webp';
        this._resetVideoDecoder();
        if (this.ws) this.ws.close();
        else if (!this.closed) this._connect();
    }

    _resetVideoDecoder() {
        this._decodeGeneration += 1;
        if (this._videoDecoder) {
            try { this._videoDecoder.close(); } catch (_) { /* already closed */ }
        }
        this._videoDecoder = null;
        this._decodePending.clear();
    }

    _decodeH264(data, key, metadata, ws) {
        if (!this._videoDecoder) {
            if (!key) return; // IDR carries SPS/PPS and starts a fresh timeline.
            const generation = this._decodeGeneration;
            const decoder = new VideoDecoder({
                output: (frame) => {
                    const meta = this._decodePending.get(frame.timestamp);
                    this._decodePending.delete(frame.timestamp);
                    if (!meta || this.closed || this.ws !== ws
                        || this._discardUntilFlush || generation !== this._decodeGeneration) {
                        frame.close(); return;
                    }
                    // Release the decoder's limited surface pool immediately.
                    // Retaining VideoFrames until playback can otherwise stall
                    // decoding before the next segment has enough buffered frames.
                    createImageBitmap(frame).then((bitmap) => {
                        if (this.closed || this.ws !== ws || this._discardUntilFlush
                            || generation !== this._decodeGeneration) {
                            bitmap.close(); return;
                        }
                        const old = this.frames.get(meta.index);
                        if (old) old.bitmap.close();
                        this.frames.set(meta.index, { bitmap, kind: meta.kind,
                            segmentId: meta.segmentId, ptsUs: meta.ptsUs });
                        if (meta.segmentId !== IDLE_SEGMENT) {
                            const segment = this.segments.find((s) => s.id === meta.segmentId);
                            if (segment) segment.receivedFrames.add(meta.index);
                        }
                        if (this.lastDrawn >= 0) this._prune(this.lastDrawn);
                        this._scheduleReady();
                    }).catch((error) => {
                        console.warn('[AvatarPlayer] H.264 frame conversion failed:', error);
                    }).finally(() => frame.close());
                },
                error: (error) => {
                    console.warn('[AvatarPlayer] H.264 decoder reset:', error);
                    if (this._videoDecoder === decoder) this._fallbackToImages();
                },
            });
            decoder.configure({ codec: this._codecString, optimizeForLatency: true, avc: { format: 'annexb' } });
            this._videoDecoder = decoder;
        }
        // Bound decode latency and recover at the next IDR rather than replay
        // stale video after the browser was suspended or the tab fell behind.
        if (this._videoDecoder.decodeQueueSize >= this.fps * 2) {
            this._resetVideoDecoder();
            if (key) this._decodeH264(data, key, metadata, ws);
            return;
        }
        const timestamp = ++this._decodeSequence;
        this._decodePending.set(timestamp, metadata);
        try {
            this._videoDecoder.decode(new EncodedVideoChunk({
                type: key ? 'key' : 'delta', timestamp, data,
            }));
        } catch (error) {
            console.warn('[AvatarPlayer] H.264 packet rejected:', error);
            this._resetVideoDecoder();
        }
    }

    _clearInterruptWatchdog() {
        if (this._interruptTimer !== null) {
            clearTimeout(this._interruptTimer);
            this._interruptTimer = null;
        }
        this._interruptToken += 1;
    }

    _startInterruptWatchdog() {
        this._clearInterruptWatchdog();
        const token = this._interruptToken;
        const timeoutMs = Math.max(250, Number(this.interruptTimeoutMs) || INTERRUPT_FLUSH_TIMEOUT_MS);
        this._interruptTimer = setTimeout(() => {
            this._interruptTimer = null;
            if (token !== this._interruptToken || !this._discardUntilFlush) return;
            console.warn(`[AvatarPlayer] no flush after ${timeoutMs}ms; recovering viewer`);
            this._discardUntilFlush = false;
            this._resetTimeline();
            this._setStatus('error', '数字人未收到打断确认，正在重连…');
            if (typeof this.onInterruptTimeout === 'function') this.onInterruptTimeout();
            if (this.ws) {
                try { this.ws.close(); } catch (_) { /* reconnect below */ }
            } else if (!this.closed) {
                this._connect();
            }
        }, timeoutMs);
    }

    async _loadAudio(segment) {
        try {
            const resp = await fetch(segment.audioUrl, { cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.arrayBuffer();
            if (!this.segments.includes(segment)) return;
            segment.audioBuffer = await this.ctx.decodeAudioData(data);
            segment.duration = segment.audioBuffer.duration;
        } catch (err) {
            // Play the frames silently rather than blocking the video forever.
            console.warn(`[AvatarPlayer] segment ${segment.id} audio failed:`, err);
            segment.audioFailed = true;
        }
        this._scheduleReady();
    }

    _hasPrebuffer(segment) {
        const needed = Math.min(segment.totalFrames, this._isContinuation(segment)
            ? CONTINUATION_PREBUFFER_FRAMES : CLIENT_PREBUFFER_FRAMES);
        for (let i = 0; i < needed; i += 1) {
            if (!segment.receivedFrames.has(segment.startFrame + i)) return false;
        }
        return true;
    }

    _isContinuation(segment) {
        const previous = this.segments[this.scheduleCursor - 1];
        return Boolean(this.audioScheduleEnd > 0 && previous && previous.startAt !== null
            && segment.startFrame === previous.startFrame + previous.totalFrames);
    }

    /**
     * Audio is the master clock. A segment's frames are held back until its
     * audio is scheduled; if the audio has to start later than the segment's
     * pts (late WAV, frames still arriving, previous audio still playing),
     * the whole video timeline shifts by that delay so lips stay on the voice.
     */
    _scheduleReady() {
        if (!this.ctx) return;
        while (this.scheduleCursor < this.segments.length) {
            const segment = this.segments[this.scheduleCursor];
            const audioReady = segment.audioBuffer || segment.audioFailed;
            if (!audioReady || !this._hasPrebuffer(segment)) break;
            const due = this.epoch + segment.startPtsUs / 1e6;
            const continuing = this._isContinuation(segment);
            // Adjacent samples share one audio clock; do not add a new
            // start delay or follow a drifting video epoch at every WAV.
            const when = continuing
                ? Math.max(this.audioScheduleEnd, this.ctx.currentTime + AUDIO_CONTINUATION_LEAD_S)
                : Math.max(this.ctx.currentTime + AUDIO_START_BUFFER_S, due, this.audioScheduleEnd);
            if (when - due > TIMELINE_SLACK_S) {
                this.epoch += when - due;
                console.log(`[AvatarPlayer] segment ${segment.id}: video timeline shifted +${((when - due) * 1000).toFixed(0)}ms to follow audio`);
            }
            segment.startAt = when;
            this.scheduleCursor += 1;
            if (!segment.audioBuffer) {
                this.audioScheduleEnd = when + segment.duration;
                continue;
            }
            const source = this.ctx.createBufferSource();
            source.buffer = segment.audioBuffer;
            source.connect(this.gain);
            source.start(when);
            segment.source = source;
            this.audioScheduleEnd = when + segment.audioBuffer.duration;
        }
    }

    // ---- playback clock ----

    _checkVideoBuffer(nowMs) {
        const pending = this.segments[this.scheduleCursor];
        if (!this._supportsVideoResync || !pending || !pending.audioBuffer
            || this._discardUntilFlush || this._hasPrebuffer(pending)) {
            this._videoBufferWait = null;
            return;
        }
        const count = pending.receivedFrames.size;
        const waiting = this._videoBufferWait;
        if (!waiting || waiting.segment !== pending || waiting.count !== count) {
            this._videoBufferWait = { segment: pending, count, since: nowMs };
            return;
        }
        if (nowMs - waiting.since < 1500 || nowMs - this._lastVideoResyncAt < 2500
            || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        // Recover the decoder from a bounded GOP replay without dropping
        // pending audio, resetting the conversation or disabling the mic.
        this._resetVideoDecoder();
        this.ws.send(JSON.stringify({ type: 'video_resync' }));
        this._lastVideoResyncAt = nowMs;
        waiting.since = nowMs;
    }

    _render() {
        this._raf = requestAnimationFrame(() => this._render());
        if (!this.ctx || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const now = this.ctx.currentTime;
        while (this.currentIndex + 1 < this.segments.length) {
            const next = this.segments[this.currentIndex + 1];
            if (next.startAt === null || now < next.startAt) break;
            this._release(this.segments[this.currentIndex]);
            this.currentIndex += 1;
        }
        this._trimSegments();

        const target = this._playbackTarget(now);
        this._drawAt(target);
        this._ack(this.lastDrawn);
        this._checkVideoBuffer(performance.now());

        const segment = this.segments[this.currentIndex];
        const speaking = Boolean(
            segment && segment.startAt !== null
            && now >= segment.startAt && now < segment.startAt + segment.duration,
        );
        this._speaking = speaking;
        const playbackState = speaking ? 'speaking'
            : this.hasPendingSpeech ? 'buffering' : this._responseActive ? 'generating' : 'idle';
        if (playbackState !== this._playbackState) {
            this._playbackState = playbackState;
            this._setStatus(playbackState, speaking ? '数字人说话中'
                : playbackState === 'buffering' ? '语音缓冲中…'
                    : playbackState === 'generating' ? '正在生成语音…' : '数字人待机');
        }
    }

    _playbackTarget(now) {
        const segment = this.segments[this.currentIndex];
        if (segment && segment.startAt !== null && now >= segment.startAt) {
            const endFrame = segment.startFrame + segment.totalFrames - 1;
            const elapsed = now - segment.startAt;
            if (elapsed < segment.duration) {
                // Each scheduled AudioBuffer is its own immutable clock anchor.
                // A later segment may move epoch while this audio still plays.
                return Math.min(endFrame, segment.startFrame
                    + Math.floor(elapsed * this.fps + 1e-6));
            }
            const next = this.segments[this.currentIndex + 1];
            if (next && next.startFrame === endFrame + 1
                && (next.startAt === null || now < next.startAt)) {
                return endFrame;
            }
            return Math.max(endFrame, Math.floor(Math.max(0, now - this.epoch) * this.fps));
        }
        return Math.floor(Math.max(0, now - this.epoch) * this.fps);
    }

    _drawAt(target) {
        // Hold the picture before the first segment whose audio is not
        // scheduled yet; it starts together with its voice.
        const pending = this.segments[this.scheduleCursor];
        const limit = pending ? Math.min(target, pending.startFrame - 1) : target;
        let selectedIndex = -1;
        let selected = null;
        for (const [index, frame] of this.frames) {
            if (index <= limit && index > selectedIndex) {
                selectedIndex = index;
                selected = frame;
            }
        }
        if (!selected || selectedIndex <= this.lastDrawn) return;
        this.canvas.getContext('2d').drawImage(
            selected.bitmap, 0, 0, this.canvas.width, this.canvas.height,
        );
        this.lastDrawn = selectedIndex;
        this._prune(selectedIndex);
    }

    _prune(anchor) {
        const minIndex = Math.max(0, anchor - 6);
        for (const [index, frame] of this.frames) {
            if (index < minIndex) {
                frame.bitmap.close();
                this.frames.delete(index);
            }
        }
    }

    _ack(index) {
        const frame = this.frames.get(index);
        if (!frame || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const segment = frame.segmentId === IDLE_SEGMENT
            ? null
            : this.segments.find((s) => s.id === frame.segmentId);
        const finalMedia = segment && frame.kind !== FRAME_IDLE
            && index >= segment.startFrame + segment.totalFrames - 1;
        let send = false;
        if (frame.kind !== FRAME_IDLE && index > this.lastMediaAck
            && (index - this.lastMediaAck >= 6 || finalMedia)) {
            this.lastMediaAck = index;
            send = true;
        }
        if (index - this.lastAck >= 6) {
            this.lastAck = index;
            send = true;
        }
        if (!send) return;
        const kind = frame.kind === FRAME_IDLE ? 'idle'
            : frame.kind === FRAME_SILENT ? 'silent' : 'speech';
        this.ws.send(JSON.stringify({
            type: 'ack', frame_index: index, pts_us: frame.ptsUs, kind,
        }));
    }

    // ---- bookkeeping ----

    _dropFromCurrent() {
        this._responseActive = false;
        for (let i = this.currentIndex; i < this.segments.length; i += 1) {
            const segment = this.segments[i];
            this._stopSource(segment);
            for (const index of segment.receivedFrames) {
                const frame = this.frames.get(index);
                if (frame) {
                    frame.bitmap.close();
                    this.frames.delete(index);
                }
            }
            this._release(segment);
        }
        this.segments = this.segments.slice(0, this.currentIndex);
        this.scheduleCursor = this.segments.length;
        this.currentIndex = this.segments.length;
        this.audioScheduleEnd = 0;
    }

    _stopSource(segment) {
        if (!segment.source) return;
        try { segment.source.stop(); } catch (_) { /* already ended */ }
        segment.source = null;
    }

    _stopAudio() {
        for (const segment of this.segments) this._stopSource(segment);
    }

    _release(segment) {
        segment.audioBuffer = null;
        segment.source = null;
    }

    /** Forget segments that finished long ago so the list stays short. */
    _trimSegments() {
        const drop = this.currentIndex - 8;
        if (drop <= 0) return;
        this.segments.splice(0, drop);
        this.currentIndex -= drop;
        this.scheduleCursor -= drop;
    }

    _resetTimeline() {
        this._videoBufferWait = null;
        this._lastVideoResyncAt = -Infinity;
        this._responseActive = false;
        this._playbackState = null;
        this._resetVideoDecoder();
        this._discardUntilFlush = false;
        this._clearInterruptWatchdog();
        for (const frame of this.frames.values()) frame.bitmap.close();
        this.frames = new Map();
        this.segments = [];
        this.scheduleCursor = 0;
        this.currentIndex = 0;
        this.audioScheduleEnd = 0;
        this.epoch = 0;
        this.lastDrawn = -1;
        this.lastAck = -1;
        this.lastMediaAck = -1;
    }
}
