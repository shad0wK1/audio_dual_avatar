import { AvatarPlayer, INTERRUPT_FLUSH_TIMEOUT_MS } from './avatar-player.js?v=stutter2';
import { SpeechInterruptor } from './speech-interruptor.js?v=prompt2';
import { RealtimeSession } from '../duplex/lib/realtime-session.js';
import { arrayBufferToBase64, resampleAudio } from '../duplex/lib/duplex-utils.js';

const $ = (id) => document.getElementById(id);
const PROMPT_STORAGE_KEY = 'prompt.knowledge.v1';
const DEFAULT_PROMPT = '你叫阿萍，是一名专业、亲切的中文知识传播助手，面向普通大众进行准确、易懂、有温度的知识讲解。'
    + '你的目标是帮助用户理解概念、建立知识框架，并能在生活或学习中应用。回答时：先准确理解问题，'
    + '必要时用一句话澄清；默认使用自然、简洁的中文口语，先给核心结论，再分点解释，必要时使用类比或例子；'
    + '根据用户背景控制专业术语密度，首次出现时进行解释；涉及事实、数据、研究或出处时说明确定性，不编造，'
    + '不确定就明确说明并给出可靠的核查方向；对争议话题保持中立，呈现主要观点和依据；语音回答避免冗长和复杂格式，'
    + '一般控制在几句话到一小段，用户要求时再深入展开；合适时可以给一个延伸问题或可执行的小建议，但不要机械追问。'
    + '始终尊重用户，不传播歧视、仇恨、违法或危险内容。';
const storage = {
    get(key, fallback = '') {
        try { return localStorage.getItem(`avatar.ui.${key}`) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(`avatar.ui.${key}`, String(value)); } catch { /* private browsing */ }
    },
};

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
let avatarVoiceRef = null;

async function loadAvatarVoiceRef() {
    if (avatarVoiceRef?.base64) return avatarVoiceRef;
    const response = await fetch('/api/avatar_ref_audio', {
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
        throw new Error('默认声线参考加载失败');
    }
    const data = await response.json();
    if (!data?.base64) {
        throw new Error('默认声线参考为空');
    }
    avatarVoiceRef = data;
    return data;
}

function hint(text, error = false) {
    $('sessionHint').textContent = text;
    $('sessionHint').dataset.error = String(error);
}

function updateControls() {
    const busy = starting || Boolean(session?.running);
    $('btnStart').disabled = busy || !healthy;
    $('btnStart').lastChild.textContent = starting ? ' 正在连接…' : ' 开始对话';
    $('btnStop').disabled = !busy;
    $('btnMute').disabled = !session?.running;
    $('btnInterrupt').disabled = !session?.running;
    for (const id of ['systemPrompt', 'btnResetPrompt', 'micDevice', 'echoCancellation', 'btnRefreshDevices']) {
        $(id).disabled = busy;
    }
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
        const [avatarResponse, voiceRef] = await Promise.all([
            fetch('/avatar-live/api/avatar/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            }),
            loadAvatarVoiceRef(),
        ]);
        if (!avatarResponse.ok) {
            let message = '数字人形象准备失败';
            try {
                const detail = await avatarResponse.json();
                message = detail?.detail?.message || detail?.message || message;
            } catch { /* keep generic message */ }
            throw new Error(message);
        }
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
        const prompt = customPrompt.startsWith('Streaming')
            ? customPrompt
            : `Streaming Audio Conversation. ${customPrompt || DEFAULT_PROMPT}`;
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
    storage.set(PROMPT_STORAGE_KEY, $('systemPrompt').value);
}

const savedPrompt = storage.get(PROMPT_STORAGE_KEY, null);
// Migrate only the previous shipped default; keep custom prompts unchanged.
const previousDefaultPrompt = DEFAULT_PROMPT.replace('你叫阿萍，是一名', '你是一名');
const useCurrentDefault = savedPrompt === null || savedPrompt === previousDefaultPrompt;
$('systemPrompt').value = useCurrentDefault ? DEFAULT_PROMPT : savedPrompt;
if (useCurrentDefault) storage.set(PROMPT_STORAGE_KEY, DEFAULT_PROMPT);
$('systemPrompt').addEventListener('input', updatePrompt);
$('btnResetPrompt').addEventListener('click', () => {
    $('systemPrompt').value = DEFAULT_PROMPT;
    updatePrompt();
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
checkHealth();
setInterval(checkHealth, 10000);
