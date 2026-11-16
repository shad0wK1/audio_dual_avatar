import { AvatarPlayer, INTERRUPT_FLUSH_TIMEOUT_MS } from './avatar-player.js?v=feature-recovery2';
import { SpeechInterruptor } from './speech-interruptor.js?v=prompt2';
import { AvatarSessionClient } from '../sdk/avatar-session-client.js?v=avatar-delete2';
import { RealtimeSession } from '../duplex/lib/realtime-session.js';
import { arrayBufferToBase64, resampleAudio } from '../duplex/lib/duplex-utils.js';

const $ = (id) => document.getElementById(id);
const storage = {
    get(key, fallback = '') {
        try { return localStorage.getItem(`avatar.ui.${key}`) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(`avatar.ui.${key}`, String(value)); } catch { /* private browsing */ }
    },
};
const AVATAR_PRESET_STORAGE_KEY = 'avatarPreset';
const AVATAR_OWNER_STORAGE_KEY = 'avatar.ownerId';
const avatarVoiceRefs = new Map();
const avatarOwnerId = getAvatarOwnerId();

let session = null;
let microphone = null;
let player = null;
let starting = false;
let healthy = false;
let muted = false;
let attempt = 0;
let startedAt = 0;
let messageCount = 0;
let userMessage = null;
let lastSpeechAt = 0;
let interruptor = null;
let modelSpeaking = false;
let awaitingListen = false;
let interruptRecoveryTimer = null;
let avatarPresetSwitching = false;
let avatarCustomizing = false;
let avatarPresets = [];
let avatarPresetsLoaded = false;
let avatarPresetsError = '';
let avatarPresetId = storage.get(AVATAR_PRESET_STORAGE_KEY, '');

function getAvatarOwnerId() {
    try {
        const existing = localStorage.getItem(AVATAR_OWNER_STORAGE_KEY) || '';
        if (existing) return existing;
        const value = globalThis.crypto?.randomUUID?.()
            || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(AVATAR_OWNER_STORAGE_KEY, value);
        return value;
    } catch {
        return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
}

function selectedAvatarPreset() {
    return avatarPresets.find((preset) => preset.id === avatarPresetId) || null;
}

function avatarPresetById(id) {
    return avatarPresets.find((preset) => preset.id === id) || null;
}

function promptDraftKey(preset) {
    const revision = preset?.prompt?.sha256 || 'latest';
    return `prompt.${preset?.id || 'none'}.${revision}`;
}

function showPresetPortrait(preset) {
    const poster = $('avatarPoster');
    if (!preset) {
        poster.removeAttribute('src');
        $('portraitName').textContent = '数字人';
        return;
    }
    poster.alt = preset.name;
    poster.src = '/static/avatar/portraits/' + encodeURIComponent(preset.avatar_id) + '.jpg';
    $('portraitName').textContent = preset.name;
}

// Carry over drafts from the version immediately preceding the character rename.
const renamedPrompts = {
    '5da6264d65d6b631fbd8e0c5ae5ce08c2c88de4dfaef87492d7f6834d1be91e4': { oldHash: 'fa1ca17c839566613d9cb12b42ab2ad8dcc5e3a28199e5093eb0917e900c7cd7', oldName: '阿萍' },
    '78d5c6d90b20afd99a62df4f99f4daa3eca59aefbe61cb4a9508a437a533468e': { oldHash: 'fce37e19d3d5ec1e59def2e310c58db08293aa153753b69f12908082a86e8d32', oldName: '小鹿' },
};

function applyPresetPrompt(preset) {
    if (!preset?.prompt?.text) return;
    const key = promptDraftKey(preset);
    let draft = storage.get(key, null);
    const previous = renamedPrompts[preset.prompt.sha256];
    if (draft === null && previous) {
        draft = storage.get(`prompt.${preset.id}.${previous.oldHash}`, null);
        if (draft === null && preset.id === 'gril_v2') draft = storage.get('prompt.knowledge.v1', null);
        const oldIntro = `你叫${previous.oldName}，`;
        if (draft?.startsWith(oldIntro)) draft = `你叫${preset.name}，` + draft.slice(oldIntro.length);
    }
    $('systemPrompt').value = draft ?? preset.prompt.text;
    updatePrompt();
}

async function loadAvatarVoiceRef(preset = selectedAvatarPreset()) {
    if (!preset?.voice?.audio_url) {
        throw new Error('当前形象没有可用的参考声线');
    }
    const cached = avatarVoiceRefs.get(preset.id);
    if (cached?.name === preset.voice.name && cached?.base64) return cached;
    const response = await fetch(preset.voice.audio_url, {
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
        headers: { 'X-Avatar-Owner-ID': avatarOwnerId },
    });
    if (!response.ok) {
        throw new Error(`${preset.name}的参考声线加载失败`);
    }
    const data = await response.json();
    if (!data?.base64) {
        throw new Error(`${preset.name}的参考声线为空`);
    }
    avatarVoiceRefs.set(preset.id, data);
    return data;
}

function setAvatarPresetStatus(text, state = '') {
    const el = $('avatarPresetStatus');
    if (!el) return;
    el.textContent = text;
    if (state) el.dataset.state = state;
    else delete el.dataset.state;
}

function renderAvatarPresets() {
    const busy = starting
        || Boolean(session?.running)
        || avatarPresetSwitching
        || avatarCustomizing;
    const grid = $('avatarPresetGrid');
    grid.replaceChildren();
    if (!avatarPresetsLoaded) {
        const loading = document.createElement('span');
        loading.className = 'avatar-preset-loading';
        loading.textContent = avatarPresetsError || '正在加载形象预设…';
        grid.append(loading);
    } else if (avatarPresets.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'avatar-preset-loading';
        empty.textContent = '没有可用的形象预设';
        grid.append(empty);
    } else {
        for (const preset of avatarPresets) {
            const card = document.createElement('div');
            card.className = 'avatar-preset-card';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'avatar-preset';
            button.dataset.presetId = preset.id;
            button.setAttribute('role', 'radio');
            button.setAttribute('aria-checked', String(preset.id === avatarPresetId));
            button.setAttribute('aria-busy', String(avatarPresetSwitching));
            button.classList.toggle('active', preset.id === avatarPresetId);
            button.classList.toggle('unavailable', !preset.available);
            button.disabled = busy || !preset.available;

            const name = document.createElement('span');
            name.className = 'avatar-preset-name';
            name.textContent = preset.name;
            const detail = document.createElement('span');
            detail.className = 'avatar-preset-detail';
            const dimensions = preset.cache
                ? ` · ${preset.cache.width}×${preset.cache.height}`
                : '';
            const voice = preset.voice?.name ? ` · ${preset.voice.name}` : '';
            detail.textContent = `${preset.description || preset.avatar_id}${dimensions}${voice}`;
            button.append(name, detail);
            if (!preset.available && preset.error) {
                const error = document.createElement('span');
                error.className = 'avatar-preset-error';
                error.textContent = preset.error;
                button.append(error);
            }
            button.addEventListener('click', () => selectAvatarPreset(preset.id));
            card.append(button);
            if (preset.deletable) {
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'avatar-preset-delete';
                remove.textContent = '删除';
                remove.title = `删除自建形象：${preset.name}`;
                remove.setAttribute(
                    'aria-label',
                    `删除自建形象：${preset.name}`,
                );
                remove.disabled = busy;
                remove.addEventListener('click', (event) => {
                    event.stopPropagation();
                    deleteAvatarPreset(preset);
                });
                card.append(remove);
            }
            grid.append(card);
        }
    }
    $('btnRefreshAvatars').disabled = busy;
}


async function deleteAvatarPreset(preset) {
    if (
        starting
        || avatarPresetSwitching
        || avatarCustomizing
        || session?.running
    ) {
        return;
    }
    if (!window.confirm(`确认删除自建形象“${preset.name}”？该操作不可撤销。`)) {
        return;
    }
    const switchToDefault = Boolean(preset.active);
    if (
        switchToDefault
        && !window.confirm(
            `该形象当前处于活跃状态。删除后将自动切换为系统默认形象。`
            + `确认继续删除“${preset.name}”？`,
        )
    ) {
        return;
    }
    avatarPresetSwitching = true;
    setAvatarPresetStatus(
        switchToDefault ? '正在切换默认形象…' : '正在删除…',
    );
    updateControls();
    try {
        const response = await fetch(
            `/avatar-live/api/avatar-presets/${encodeURIComponent(preset.id)}`
                + (switchToDefault ? '?switch_to_default=true' : ''),
            {
                method: 'DELETE',
                headers: { 'X-Avatar-Owner-ID': avatarOwnerId },
                signal: AbortSignal.timeout(60000),
            },
        );
        let data = null;
        try {
            data = await response.json();
        } catch {
            // Keep the HTTP status as the error message.
        }
        if (!response.ok) {
            const detail = data?.detail;
            const message = typeof detail === 'object'
                ? detail?.message
                : detail;
            throw new Error(message || `HTTP ${response.status}`);
        }
        avatarVoiceRefs.delete(preset.id);
        if (avatarPresetId === preset.id) {
            avatarPresetId = '';
            storage.set(AVATAR_PRESET_STORAGE_KEY, '');
        }
        await loadAvatarPresets();
        setAvatarPresetStatus('已删除');
        hint(`已删除自建形象：${preset.name}`);
    } catch (error) {
        console.error(error);
        setAvatarPresetStatus('删除失败', 'error');
        hint(error.message || '删除形象失败', true);
    } finally {
        avatarPresetSwitching = false;
        updateControls();
    }
}


async function loadAvatarPresets() {
    try {
        const response = await fetch('/avatar-live/api/avatar-presets', {
            signal: AbortSignal.timeout(15000),
            cache: 'no-store',
            headers: { 'X-Avatar-Owner-ID': avatarOwnerId },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        avatarPresets = Array.isArray(data.presets) ? data.presets : [];
        const available = avatarPresets.filter((preset) => preset.available);
        const saved = storage.get(AVATAR_PRESET_STORAGE_KEY, '');
        if (available.some((preset) => preset.id === saved)) {
            avatarPresetId = saved;
        } else if (available.some((preset) => preset.id === data.default_preset_id)) {
            avatarPresetId = data.default_preset_id;
        } else {
            avatarPresetId = available[0]?.id || avatarPresets[0]?.id || '';
        }
        storage.set(AVATAR_PRESET_STORAGE_KEY, avatarPresetId);
        avatarPresetsLoaded = true;
        avatarPresetsError = '';
        const preset = selectedAvatarPreset();
        showPresetPortrait(preset);
        if (preset) applyPresetPrompt(preset);
        const active = preset && preset.avatar_id === data.active_avatar_id;
        setAvatarPresetStatus(
            active ? '已激活' : `${available.length} 个可用`,
            available.length ? 'ready' : 'error',
        );
    } catch (error) {
        avatarPresetsError = error.message || '形象预设加载失败';
        setAvatarPresetStatus('加载失败', 'error');
    } finally {
        renderAvatarPresets();
        updateControls();
    }
}

async function selectAvatarPreset(id) {
    const preset = avatarPresetById(id);
    if (!preset?.available || starting || session?.running || avatarPresetSwitching) return;
    avatarPresetSwitching = true;
    updateControls();
    setAvatarPresetStatus('切换中…');
    hint(`正在切换为${preset.name}…`);
    try {
        const response = await fetch(`/avatar-live/api/avatar-presets/${encodeURIComponent(id)}/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Avatar-Owner-ID': avatarOwnerId,
            },
            signal: AbortSignal.timeout(60000),
        });
        let data = null;
        try { data = await response.json(); } catch { /* keep fallback text */ }
        if (!response.ok) {
            throw new Error(data?.detail?.message || data?.message || '形象切换失败');
        }
        avatarPresetId = preset.id;
        storage.set(AVATAR_PRESET_STORAGE_KEY, avatarPresetId);
        const updated = {
            ...preset,
            ...data,
            available: true,
            error: null,
        };
        avatarPresets = avatarPresets.map((item) => item.id === id ? updated : item);
        showPresetPortrait(updated);
        applyPresetPrompt(updated);
        renderAvatarPresets();
        setAvatarPresetStatus(`已切换 · ${updated.cache?.width || data.width}×${updated.cache?.height || data.height}`, 'ready');
        hint(`${preset.name}已激活，提示词和声线已同步`);
        try {
            const voice = await loadAvatarVoiceRef(updated);
            hint(`${preset.name}已激活 · ${voice.name}`);
        } catch (error) {
            setAvatarPresetStatus('声线加载失败', 'error');
            hint(error.message, true);
        }
    } catch (error) {
        setAvatarPresetStatus('切换失败', 'error');
        hint(error.message || '形象切换失败', true);
    } finally {
        avatarPresetSwitching = false;
        updateControls();
    }
}

function setCustomAvatarStatus(text, state = '') {
    const element = $('customAvatarStatus');
    element.textContent = text;
    if (state) element.dataset.state = state;
    else delete element.dataset.state;
}

async function createCustomAvatar(event) {
    event.preventDefault();
    const video = $('customVideo').files[0];
    const audio = $('customAudio').files[0];
    const name = $('customAvatarName').value.trim();
    const description = $('customAvatarDescription').value.trim();
    const prompt = $('systemPrompt').value.trim();
    if (!video || !audio || !name || !prompt) {
        hint('请填写名称和提示词，并选择视频与参考音频', true);
        return;
    }
    $('btnCreateAvatar').disabled = true;
    $('customAvatarProgress').hidden = false;
    $('customAvatarProgress').value = 0;
    $('customAvatarHint').textContent = '正在上传素材…';
    setCustomAvatarStatus('上传中');
    avatarCustomizing = true;
    updateControls();
    try {
        const job = await AvatarSessionClient.createCustomization({
            baseUrl: location.origin,
            apiPrefix: '/v1/avatar',
            ownerId: avatarOwnerId,
            video,
            audio,
            prompt,
            name,
            description,
            onProgress: (ratio) => {
                $('customAvatarProgress').value = Math.round(ratio * 12);
                $('customAvatarHint').textContent = `上传中 ${Math.round(ratio * 100)}%`;
            },
        });
        let current = job;
        while (!['ready', 'failed', 'cancelled'].includes(current.status)) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            current = await AvatarSessionClient.getCustomization({
                baseUrl: location.origin,
                apiPrefix: '/v1/avatar',
                ownerId: avatarOwnerId,
                jobId: job.job_id,
            });
            $('customAvatarProgress').value = current.progress || 0;
            $('customAvatarHint').textContent = `${current.stage || current.status} · ${current.progress || 0}%`;
            setCustomAvatarStatus(current.status === 'processing' ? '生成中' : current.status);
        }
        if (current.status !== 'ready') {
            throw new Error(current.error || '形象生成失败');
        }
        $('customAvatarProgress').value = 100;
        $('customAvatarHint').textContent = '生成完成，请在上方选择新形象';
        setCustomAvatarStatus('已完成', 'ready');
        await loadAvatarPresets();
        if (current.preset_id) {
            avatarPresetId = current.preset_id;
            storage.set(AVATAR_PRESET_STORAGE_KEY, avatarPresetId);
            renderAvatarPresets();
        }
    } catch (error) {
        console.error(error);
        setCustomAvatarStatus('失败', 'error');
        $('customAvatarHint').textContent = error.message || '形象生成失败';
    } finally {
        avatarCustomizing = false;
        updateControls();
    }
}

function hint(text, error = false) {
    $('sessionHint').textContent = text;
    $('sessionHint').dataset.error = String(error);
}

function updateControls() {
    const sessionBusy = starting
        || avatarPresetSwitching
        || Boolean(session?.running);
    const busy = sessionBusy || avatarCustomizing;
    const preset = selectedAvatarPreset();
    const ready = avatarPresetsLoaded
        && Boolean(preset?.available)
        && Boolean($('systemPrompt').value.trim());
    $('btnStart').disabled = busy || !healthy || !ready;
    $('btnStart').lastChild.textContent = starting ? ' 正在连接…' : ' 开始对话';
    $('btnStop').disabled = !sessionBusy;
    $('btnMute').disabled = !session?.running;
    $('btnInterrupt').disabled = !session?.running;
    for (const id of ['systemPrompt', 'btnResetPrompt', 'micDevice', 'echoCancellation', 'btnRefreshDevices']) {
        $(id).disabled = busy || !avatarPresetsLoaded;
    }
    for (const id of [
        'customVideo',
        'customAudio',
        'customAvatarName',
        'customAvatarDescription',
        'btnCreateAvatar',
    ]) {
        $(id).disabled = busy;
    }
    renderAvatarPresets();
    document.querySelector('.portrait-card').dataset.state = session?.running ? 'running' : 'idle';
    document.querySelector('.conversation-footer').dataset.state = session?.running ? 'running' : 'idle';
}

function addMessage(role, text) {
    $('conversationEmpty')?.remove();
    const row = document.createElement('article');
    row.className = 'message';
    row.dataset.role = role;
    const badge = document.createElement('span');
    badge.className = 'message-avatar';
    badge.textContent = role === 'assistant' ? 'AI' : role === 'user' ? '你' : '!';
    const content = document.createElement('div');
    content.className = 'message-content';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const label = document.createElement('span');
    label.textContent = role === 'assistant' ? '数字人' : role === 'user' ? '你' : '提示';
    const time = document.createElement('time');
    time.dateTime = new Date().toISOString();
    time.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const body = document.createElement('p');
    body.className = 'message-text';
    body.textContent = text;
    meta.append(label, time);
    content.append(meta, body);
    row.append(badge, content);
    $('conversationLog').append(row);
    $('messageCount').textContent = String(++messageCount);
    scrollConversation();
    return body;
}

function scrollConversation() {
    $('conversationLog').scrollTop = $('conversationLog').scrollHeight;
}

function noteSpeech(samples) {
    if (muted) return;
    let power = 0;
    for (const sample of samples) power += sample * sample;
    if (Math.sqrt(power / samples.length) < 0.012) return;
    const now = Date.now();
    if (!userMessage || now - lastSpeechAt > 1800) userMessage = addMessage('user', '语音消息');
    lastSpeechAt = now;
}

function clearInterruptRecovery() {
    if (interruptRecoveryTimer !== null) {
        clearTimeout(interruptRecoveryTimer);
        interruptRecoveryTimer = null;
    }
}

function recoverFromInterruptTimeout() {
    clearInterruptRecovery();
    if (!session?.running) return;
    awaitingListen = false;
    modelSpeaking = false;
    hint('数字人未及时确认打断，已自动恢复，请继续说话', true);
    $('conversationState').textContent = '数字人连接已恢复';
}

function armInterruptRecovery(owner) {
    clearInterruptRecovery();
    interruptRecoveryTimer = setTimeout(() => {
        if (session === owner) recoverFromInterruptTimeout();
    }, INTERRUPT_FLUSH_TIMEOUT_MS + 100);
}

class Microphone {
    constructor(onChunk) {
        this.onChunk = onChunk;
        this.active = false;
        this.stopped = false;
        this.stream = null;
        this.ctx = null;
        this.raf = 0;
        this.silentChunks = 0;
    }

    async open() {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('请在支持麦克风的浏览器中使用 HTTPS 打开页面');
        }
        const deviceId = $('micDevice').value;
        const echoCancellation = $('echoCancellation').checked;
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
                ...(echoCancellation ? {} : { echoCancellation: false }),
            },
            video: false,
        });
        if (this.stopped) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        this.stream = stream;
        // Match the proven Omni capture ordering: obtain the microphone first,
        // then create and resume the AudioContext.
        this.ctx = new AudioContext({ sampleRate: 16000 });
        await this.ctx.resume();
        await this.ctx.audioWorklet.addModule('/static/duplex/lib/capture-processor.js');
        if (this.stopped) return;
        this.source = this.ctx.createMediaStreamSource(stream);
        this.capture = new AudioWorkletNode(
            this.ctx,
            'capture-processor',
            { processorOptions: { chunkSize: this.ctx.sampleRate } },
        );
        this.source.connect(this.capture);
        // A MediaStreamDestination keeps the capture graph live without
        // monitoring the microphone through the speakers.
        this.recDest = this.ctx.createMediaStreamDestination();
        this.capture.connect(this.recDest);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.source.connect(this.analyser);
        this.capture.port.onmessage = ({ data }) => {
            if (!this.active || data.type !== 'chunk') return;
            const samples = resampleAudio(data.audio, this.ctx.sampleRate, 16000);
            const hasSignal = samples.some((sample) => sample !== 0);
            this.silentChunks = hasSignal ? 0 : this.silentChunks + 1;
            if (this.silentChunks === 2) {
                const track = this.stream?.getAudioTracks()[0];
                const detail = track?.muted
                    ? '麦克风被系统静音'
                    : '麦克风没有采集到声音，请检查设备和系统权限';
                $('micState').textContent = '麦克风无信号';
                hint(detail, true);
                console.warn('[avatar] silent microphone chunks', {
                    muted: track?.muted,
                    readyState: track?.readyState,
                    label: track?.label,
                    settings: track?.getSettings?.(),
                });
            } else if (hasSignal && this.silentChunks === 0) {
                $('micState').textContent = muted ? '已静音' : '正在收音';
            }
            noteSpeech(samples);
            this.onChunk(samples);
        };
        const track = stream.getAudioTracks()[0];
        track?.addEventListener('mute', () => {
            if (!this.stopped) {
                $('micState').textContent = '麦克风被系统静音';
                hint('麦克风被系统静音，请检查系统输入设备', true);
            }
        });
        track?.addEventListener('unmute', () => {
            if (!this.stopped && this.active) $('micState').textContent = muted ? '已静音' : '正在收音';
        });
        const settings = track?.getSettings?.() || {};
        console.info('[avatar] microphone ready', {
            label: track?.label,
            sampleRate: settings.sampleRate,
            channelCount: settings.channelCount,
            echoCancellation: settings.echoCancellation,
            deviceId: settings.deviceId,
        });
        enumerateDevices().catch(() => {});
    }

    start() {
        if (this.stopped || !this.capture || !this.ctx) throw new Error('麦克风尚未准备好');
        this.ctx.resume().catch(() => {});
        this.active = true;
        this.capture.port.postMessage({ command: 'start' });
        const samples = new Float32Array(this.analyser.fftSize);
        const meter = () => {
            if (!this.active) return;
            this.analyser.getFloatTimeDomainData(samples);
            let energy = 0;
            for (const sample of samples) energy += sample * sample;
            const rms = Math.sqrt(energy / samples.length);
            $('micLevel').style.width = `${muted ? 0 : Math.min(100, rms * 360)}%`;
            const speaking = modelSpeaking || Boolean(player?._speaking)
                || Boolean(player?.hasPendingSpeech);
            interruptor?.update(rms, speaking, muted);
            this.raf = requestAnimationFrame(meter);
        };
        meter();
    }

    stop() {
        this.stopped = true;
        this.active = false;
        cancelAnimationFrame(this.raf);
        this.capture?.port.postMessage({ command: 'stop' });
        for (const node of [this.source, this.capture, this.recDest, this.analyser]) {
            try { node?.disconnect(); } catch { /* already released */ }
        }
        this.stream?.getTracks().forEach((track) => track.stop());
        this.ctx?.close().catch(() => {});
        $('micLevel').style.width = '0%';
    }
}

function applyOutput() {
    if (!player?.ctx) return;
    const id = $('speakerDevice').value;
    if (typeof player.ctx.setSinkId === 'function') {
        player.ctx.setSinkId(id || '').catch(() => hint('此浏览器使用系统默认扬声器'));
    }
    if (player.gain) player.gain.gain.value = Number($('volume').value) / 100;
}

function cleanup(owner) {
    if (session !== owner) return;
    clearInterruptRecovery();
    microphone?.stop();
    microphone = null;
    const oldPlayer = player;
    oldPlayer?.close();
    const canvas = $('avatarCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    oldPlayer?.ctx?.close().catch(() => {});
    player = null;
    session = null;
    interruptor = null;
    modelSpeaking = false;
    awaitingListen = false;
    starting = false;
    muted = false;
    startedAt = 0;
    $('btnMute').setAttribute('aria-pressed', 'false');
    $('btnMute').setAttribute('aria-label', '静音麦克风');
    $('micState').textContent = '麦克风未开启';
    $('conversationState').textContent = '对话已结束';
    $('avatarStatus').textContent = '准备好后，点击开始对话';
    $('avatarStatus').dataset.state = 'off';
    hint('可以边听边说，也可以随时打断');
    updateControls();
}

async function start() {
    if (session || starting) return;
    const currentAttempt = ++attempt;
    starting = true;
    userMessage = null;
    hint('正在准备麦克风和数字人…');
    $('conversationState').textContent = '正在连接';
    updateControls();
    const owner = new RealtimeSession('avatar', {
        getWsUrl: () => `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/v1/realtime?mode=audio`,
        getMaxKvTokens: () => 8192,
        outputSampleRate: 24000,
    });
    session = owner;
    owner.audioPlayer.setMuted(true);
    interruptor = new SpeechInterruptor(() => {
        if (session !== owner || !owner.running) return;
        const hasReply = modelSpeaking || Boolean(player?._speaking) || Boolean(player?.hasPendingSpeech);
        awaitingListen = true;
        modelSpeaking = false;
        player?.setResponseActive(false);
        armInterruptRecovery(owner);
        if (hasReply) player?.interrupt();
        owner.audioPlayer.stopAll?.();
        hint('已打断，正在听你说');
        $('conversationState').textContent = '正在听你说';
    });
    owner.onCleanup = () => cleanup(owner);
    owner.onQueueUpdate = (queue) => {
        if (queue) {
            hint(queue.position > 1
                ? `正在等待，前面还有 ${queue.position - 1} 位`
                : '正在准备声音，请稍候…');
        }
    };
    owner.onSystemLog = (message) => {
        if (/error|failed|timeout/i.test(message)) hint('连接出现异常，请结束后重试', true);
    };
    owner.onSpeakStart = (text) => {
        if (awaitingListen) return null;
        modelSpeaking = true;
        player?.setResponseActive(true);
        userMessage = null;
        player?.setSubtitle(text);
        $('conversationState').textContent = '数字人正在回应';
        return addMessage('assistant', text);
    };
    owner.onSpeakUpdate = (element, text) => {
        if (awaitingListen) return;
        modelSpeaking = true;
        player?.setResponseActive(true);
        if (element) element.textContent = text;
        player?.setSubtitle(text);
        scrollConversation();
    };
    owner.onSpeakEnd = () => {
        modelSpeaking = false;
        player?.setResponseActive(false);
        player?.endSubtitle();
        $('conversationState').textContent = muted ? '麦克风已静音' : '正在听你说';
    };
    owner.onListenResult = () => {
        clearInterruptRecovery();
        awaitingListen = false;
        modelSpeaking = false;
        player?.setResponseActive(false);
    };
    owner.onRunningChange = (running) => {
        if (running) starting = false;
        updateControls();
    };
    try {
        const preset = selectedAvatarPreset();
        if (!preset?.available || !preset.prompt?.text) {
            throw new Error('请先选择可用的数字人形象');
        }
        const [avatarResponse, voiceRef] = await Promise.all([
            fetch(`/avatar-live/api/avatar-presets/${encodeURIComponent(preset.id)}/activate`, {
                method: 'POST',
                signal: AbortSignal.timeout(60000),
            }),
            loadAvatarVoiceRef(preset),
        ]);
        if (!avatarResponse.ok) {
            let message = '数字人形象准备失败';
            try {
                const detail = await avatarResponse.json();
                message = detail?.detail?.message || detail?.message || message;
            } catch { /* keep generic message */ }
            throw new Error(message);
        }
        setAvatarPresetStatus('已激活', 'ready');
        renderAvatarPresets();
        if (currentAttempt !== attempt) return;
        player = new AvatarPlayer({
            canvas: $('avatarCanvas'),
            statusEl: $('avatarStatus'),
            subtitleEl: $('avatarSubtitle'),
        });
        player.onInterruptAcknowledged = () => {
            clearInterruptRecovery();
            awaitingListen = false;
            modelSpeaking = false;
            player?.setResponseActive(false);
            hint('已打断，正在听你说');
        };
        player.onInterruptTimeout = () => {
            if (session === owner) recoverFromInterruptTimeout();
        };
        await player.start(applyOutput);
        applyOutput();
        if (currentAttempt !== attempt) return;
        const capture = new Microphone((samples) => {
            if (session === owner && owner.running) {
                owner.sendChunk({
                    audio_base64: arrayBufferToBase64(samples.buffer),
                    force_listen: interruptor?.forceListen() || false,
                });
            }
        });
        microphone = capture;
        await capture.open();
        if (currentAttempt !== attempt || capture.stopped) {
            capture.stop();
            return;
        }
        const customPrompt = $('systemPrompt').value.trim();
        if (!customPrompt) {
            throw new Error('系统提示词为空');
        }
        const prompt = customPrompt.startsWith('Streaming')
            ? customPrompt
            : `Streaming Audio Conversation. ${customPrompt}`;
        await owner.start(
            prompt,
            {
                config: { length_penalty: 1.1 },
                use_tts: true,
                ref_audio_base64: voiceRef.base64,
                tts_ref_audio_base64: voiceRef.base64,
            },
            () => {
                if (currentAttempt !== attempt) throw new Error('已取消连接');
                capture.start();
            },
        );
        if (currentAttempt !== attempt) {
            owner.stop();
            return;
        }
        startedAt = Date.now();
        $('micState').textContent = '正在收音';
        $('conversationState').textContent = '正在听你说';
        hint('已连接，可以直接开口说话');
        updateControls();
    } catch (error) {
        if (session === owner) {
            owner.cleanup();
            cleanup(owner);
        }
        if (currentAttempt !== attempt) return;
        const message = error.name === 'NotAllowedError'
            ? '麦克风未授权，请在浏览器中允许后重试'
            : error.name === 'NotFoundError'
                ? '没有找到麦克风，请连接设备后重试'
                : error.name === 'NotReadableError'
                    ? '麦克风被其他程序占用，请释放后重试'
                    : error.message || '连接失败，请稍后重试';
        hint(message, true);
        $('conversationState').textContent = '连接未完成';
    }
}

function stop() {
    attempt++;
    clearInterruptRecovery();
    const owner = session;
    if (owner) {
        if (owner.running) owner.stop();
        else owner.cancelQueue();
        cleanup(owner);
    }
}

async function enumerateDevices(requestPermission = false) {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    if (requestPermission) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        stream.getTracks().forEach((track) => track.stop());
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    for (const [id, kind, label] of [
        ['micDevice', 'audioinput', '麦克风'],
        ['speakerDevice', 'audiooutput', '扬声器'],
    ]) {
        const select = $(id);
        const previous = select.value || storage.get(id);
        select.replaceChildren(new Option(`系统默认${label}`, ''));
        const seen = new Set(['', 'default']);
        for (const device of devices.filter((item) => item.kind === kind)) {
            if (seen.has(device.deviceId)) continue;
            seen.add(device.deviceId);
            select.add(new Option(device.label || `${label} ${seen.size - 1}`, device.deviceId));
        }
        if ([...select.options].some((option) => option.value === previous)) select.value = previous;
    }
}

async function checkHealth() {
    try {
        const response = await fetch('/avatar-live/api/status', { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('unavailable');
        const status = await response.json();
        healthy = Boolean(status.ready);
        $('serviceStatus').dataset.state = healthy ? 'ready' : 'connecting';
        $('serviceStatus').querySelector('span').textContent = healthy ? '服务已就绪' : '服务准备中';
    } catch {
        healthy = false;
        $('serviceStatus').dataset.state = 'error';
        $('serviceStatus').querySelector('span').textContent = '连接已断开';
    }
    updateControls();
}

function updatePrompt() {
    $('promptCount').textContent = `${$('systemPrompt').value.length} 字`;
    const preset = selectedAvatarPreset();
    if (preset?.prompt) {
        storage.set(promptDraftKey(preset), $('systemPrompt').value);
    }
    updateControls();
}

$('systemPrompt').value = '';
$('systemPrompt').addEventListener('input', updatePrompt);
$('btnResetPrompt').addEventListener('click', () => {
    const preset = selectedAvatarPreset();
    if (!preset?.prompt?.text) return;
    $('systemPrompt').value = preset.prompt.text;
    updatePrompt();
    hint(`已恢复${preset.name}的默认提示词`);
});
$('volume').value = storage.get('volume', '80');
function updateVolume() {
    $('volumeValue').value = `${$('volume').value}%`;
    storage.set('volume', $('volume').value);
    applyOutput();
}
$('volume').addEventListener('input', updateVolume);
for (const id of ['micDevice', 'speakerDevice']) {
    $(id).addEventListener('change', () => {
        storage.set(id, $(id).value);
        if (id === 'speakerDevice') applyOutput();
    });
}
$('btnRefreshDevices').addEventListener('click', () => {
    enumerateDevices(true)
        .then(() => hint('音频设备已刷新'))
        .catch(() => hint('请允许麦克风权限后重试', true));
});
$('btnRefreshAvatars').addEventListener('click', () => {
    setAvatarPresetStatus('检查中…');
    loadAvatarPresets();
});
$('avatarCreateForm').addEventListener('submit', createCustomAvatar);
$('btnStart').addEventListener('click', start);
$('btnStop').addEventListener('click', stop);
$('btnInterrupt').addEventListener('click', () => interruptor?.trigger());
$('btnMute').addEventListener('click', () => {
    muted = !muted;
    microphone?.stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    $('btnMute').setAttribute('aria-pressed', String(muted));
    $('btnMute').setAttribute('aria-label', muted ? '取消麦克风静音' : '静音麦克风');
    $('btnMute').title = muted ? '取消麦克风静音' : '静音麦克风';
    $('micState').textContent = muted ? '已静音' : '正在收音';
    $('conversationState').textContent = muted ? '麦克风已静音' : '正在听你说';
});
const emptyConversation = $('conversationEmpty').cloneNode(true);
$('btnClearConversation').addEventListener('click', () => {
    $('conversationLog').replaceChildren(emptyConversation.cloneNode(true));
    $('messageCount').textContent = '0';
    messageCount = 0;
    userMessage = null;
});
navigator.mediaDevices?.addEventListener('devicechange', () => enumerateDevices().catch(() => {}));
window.addEventListener('pagehide', stop);
setInterval(() => {
    const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    $('sessionClock').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}, 1000);
updatePrompt();
updateVolume();
updateControls();
enumerateDevices().catch(() => {});
loadAvatarPresets();
checkHealth();
setInterval(checkHealth, 10000);
