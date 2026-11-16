import { AvatarSessionClient } from './avatar-session-client.js?v=interrupt-audio1';
import { SpeechInterruptor } from './speech-interruptor.js';


const $ = (id) => document.getElementById(id);
let API_PREFIX = new URL('../api/avatar', import.meta.url).pathname;
const MIC_STORAGE_KEY = 'avatar.ui.micDevice';

let client = null;
let starting = false;
let muted = false;
let responseElement = null;
let readyPreset = '';
let idleVideo = null;
const idleClips = new Set(['gril_v2', 'knowledge_host_720p_stable_v1', 'musetalk_test_avatar']);

function prepareIdleVideo(avatarId) {
    if (idleVideo?.dataset.avatar === avatarId) return;
    if (idleVideo) {
        idleVideo.pause();
        idleVideo.removeAttribute('src');
        idleVideo.load();
        idleVideo = null;
    }
    if (!idleClips.has(avatarId)) return;
    idleVideo = document.createElement('video');
    idleVideo.dataset.avatar = avatarId;
    idleVideo.muted = true;
    idleVideo.loop = true;
    idleVideo.playsInline = true;
    idleVideo.preload = 'auto';
    idleVideo.src = new URL('./idle/' + avatarId + '.mp4', import.meta.url).href;
}
let preparing = true;
let retryTimer;
let leaving = false;
let attemptGeneration = 0;

let canCustomize = false;
let binaryMicrophone = false;
let customizing = false;
let presetData = [];


function setStatus(text) {
    $('status').textContent = text;
}


function setHint(text) {
    $('hint').textContent = text;
}


function updateControls() {
    const running = Boolean(client);
    const selected = presetData.find((item) => item.id === $('preset').value);
    const ready = readyPreset && readyPreset === $('preset').value;
    $('start').disabled = starting || running || !ready || preparing || customizing;
    $('start').textContent = running ? (starting ? '正在连接…' : '会话进行中') : (ready ? '开始会话' : '等待形象就绪');
    $('interrupt').disabled = !running;
    $('mute').disabled = !running;
    $('stop').disabled = !running;
    $('preset').disabled = starting || running || preparing || customizing;
    $('micDevice').disabled = starting || running;
    $('refreshDevices').disabled = starting || running;
    $('retry').disabled = starting || running || preparing || customizing;
    $('mute').textContent = muted ? '取消静音' : '静音';
    $('deletePreset').hidden = !selected?.deletable;
    $('deletePreset').disabled = starting || running || customizing || preparing;
    $('createButton').disabled = !canCustomize || starting || running || customizing || preparing;
}


function clearTranscript() {
    responseElement = null;
    $('transcript').replaceChildren();
}

function appendTranscript(text) {
    if (!text) return;
    if (!responseElement) {
        responseElement = document.createElement('div');
        responseElement.className = 'message';
        $('transcript').append(responseElement);
    }
    responseElement.textContent += text;
    $('transcript').scrollTop = $('transcript').scrollHeight;
}


function showSelectedPortrait() {
    const option = $('preset').selectedOptions[0];
    if (!option) return;
    prepareIdleVideo(option.dataset.avatarId);
    const portrait = $('avatarPortrait');
    portrait.src = option.dataset.source === 'user'
        ? API_PREFIX + '/presets/' + encodeURIComponent(option.value) + '/portrait'
        : new URL('./portraits/' + encodeURIComponent(option.dataset.avatarId) + '.jpg', import.meta.url).href;
    portrait.alt = option.text + '形象预览';
    $('avatarStage').style.aspectRatio = option.dataset.aspectRatio;
    $('avatarStage').classList.remove('live');
}

async function prepareSelected() {
    clearTimeout(retryTimer);
    const option = $('preset').selectedOptions[0];
    if (!option || client || leaving) return;
    readyPreset = '';
    preparing = true;
    showSelectedPortrait();
    updateControls();
    setStatus('正在准备' + option.text + '…');
    setHint('正在检查语音服务并加载所选形象。');
    try {
        const result = await fetch(API_PREFIX + '/presets/' + encodeURIComponent(option.value) + '/prepare', {
            method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(95000),
        });
        const data = await result.json();
        if (result.status === 409) {
            setStatus('等待数字人服务');
            setHint(data.detail?.message || '正在等待形象就绪…');
            retryTimer = setTimeout(prepareSelected, 2000);
            return;
        }
        if (!result.ok || !data.ready || data.preset_id !== option.value || data.avatar_id !== option.dataset.avatarId) {
            throw new Error(data.detail?.message || '形象准备失败，请重试服务连接');
        }
        readyPreset = option.value;
        setStatus(option.text + '已就绪');
        setHint('点击开始会话，连接实时画面和麦克风。');
    } catch (error) {
        setStatus('形象未就绪');
        setHint(error.message || '请重试服务连接');
    } finally {
        preparing = false;
        updateControls();
    }
}

async function loadPresets(preferred) {
    clearTimeout(retryTimer);
    readyPreset = '';
    preparing = true;
    const previous = $('preset').value;
    updateControls();
    const configResponse = await fetch(new URL('../api/platform/config', import.meta.url), { cache: 'no-store' });
    if (!configResponse.ok) throw new Error('无法读取平台配置');
    const config = await configResponse.json();
    API_PREFIX = config.api_prefix;
    $('avatarCreation').hidden = config.creation_enabled !== true;
    canCustomize = config.can_customize;
    binaryMicrophone = config.binary_microphone === true;
    $('createButton').textContent = canCustomize ? '上传并生成' : '请先登录平台';
    const data = await AvatarSessionClient.listPresets({
        baseUrl: location.origin,
        apiPrefix: API_PREFIX,
    });
    presetData = Array.isArray(data.presets) ? data.presets : [];
    $('preset').replaceChildren();
    for (const preset of presetData) {
        if (!preset.available) continue;
        const option = new Option(preset.name, preset.id);
        option.dataset.avatarId = preset.avatar_id;
        option.dataset.source = preset.source;
        option.dataset.aspectRatio = preset.cache?.width && preset.cache?.height
            ? preset.cache.width + ' / ' + preset.cache.height : '9 / 16';
        $('preset').add(option);
    }
    const options = [...$('preset').options];
    if (!options.length) throw new Error('当前没有可用的数字人，请联系服务管理员');
    const selected = options.find(o => o.value === preferred) || options.find(o => o.value === previous) || options.find(o => o.value === data.default_preset_id);
    if (selected) $('preset').value = selected.value;
    if (previous && previous !== $('preset').value) clearTranscript();
    await prepareSelected();
}


async function loadMicrophones({ requestPermission = false } = {}) {
    if (requestPermission) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });
        for (const track of stream.getTracks()) track.stop();
    }
    const saved = localStorage.getItem(MIC_STORAGE_KEY) || '';
    const current = $('micDevice').value || saved;
    const devices = await navigator.mediaDevices.enumerateDevices();
    $('micDevice').replaceChildren(new Option('系统默认麦克风', ''));
    let index = 0;
    for (const device of devices) {
        if (device.kind !== 'audioinput' || !device.deviceId) continue;
        if (device.deviceId === 'default') continue;
        index += 1;
        $('micDevice').add(
            new Option(device.label || `麦克风 ${index}`, device.deviceId),
        );
    }
    if (
        current
        && [...$('micDevice').options].some(
            (option) => option.value === current,
        )
    ) {
        $('micDevice').value = current;
    } else if (current) {
        $('micDevice').add(
            new Option('已保存的麦克风（等待授权）', current),
        );
        $('micDevice').value = current;
    }
}


async function createCustomAvatar(event) {
    event.preventDefault();
    if (!canCustomize || client || starting || customizing || preparing) return;
    const video = $('customVideo').files[0];
    const audio = $('customAudio').files[0];
    const name = $('customName').value.trim();
    const description = $('customDescription').value.trim();
    const prompt = $('customPrompt').value.trim();
    if (!video || !audio || !name || !prompt) {
        setHint('请填写名称、提示词并选择视频和参考音频');
        return;
    }
    $('createButton').disabled = true;
    $('createProgress').hidden = false;
    $('createProgress').value = 0;
    $('createHint').textContent = '正在上传素材…';
    customizing = true;
    updateControls();
    try {
        let job = await AvatarSessionClient.createCustomization({
            baseUrl: location.origin,
            apiPrefix: API_PREFIX,
            video,
            audio,
            prompt,
            name,
            description,
            onProgress: (ratio) => {
                $('createProgress').value = Math.round(ratio * 12);
                $('createHint').textContent = `上传中 ${Math.round(ratio * 100)}%`;
            },
        });
        while (!['ready', 'failed', 'cancelled'].includes(job.status)) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            job = await AvatarSessionClient.getCustomization({
                baseUrl: location.origin,
                apiPrefix: API_PREFIX,
                jobId: job.job_id,
            });
            $('createProgress').value = job.progress || 0;
            $('createHint').textContent = `${job.stage || job.status} · ${job.progress || 0}%`;
        }
        if (job.status !== 'ready') {
            throw new Error(job.error || '形象生成失败');
        }
        $('createProgress').value = 100;
        $('createHint').textContent = '生成完成，正在刷新预设…';
        await loadPresets(job.preset_id);
        $('createForm').reset();
        $('createHint').textContent = '形象已生成，可以在上方选择';
    } catch (error) {
        console.error(error);
        $('createHint').textContent = error?.message || '形象生成失败';
    } finally {
        customizing = false;
        updateControls();
    }
}


async function deleteSelectedPreset() {
    if (starting || client || customizing) return;
    const preset = presetData.find((item) => item.id === $('preset').value);
    if (!preset?.deletable) return;
    if (!window.confirm(`确认删除自建形象“${preset.name}”？该操作不可撤销。`)) {
        return;
    }
    const switchToDefault = readyPreset === preset.id || Boolean(preset.active);
    if (
        switchToDefault
        && !window.confirm(
            `该形象当前处于活跃状态。删除后将自动切换为系统默认形象。`
            + `确认继续删除“${preset.name}”？`,
        )
    ) {
        return;
    }
    customizing = true;
    updateControls();
    setHint(
        switchToDefault
            ? '正在切换默认形象并删除自建形象…'
            : '正在删除自建形象…',
    );
    try {
        await AvatarSessionClient.deletePreset({
            baseUrl: location.origin,
            apiPrefix: API_PREFIX,
            presetId: preset.id,
            switchToDefault,
        });
        await loadPresets();
        setHint(`已删除自建形象：${preset.name}`);
    } catch (error) {
        console.error(error);
        setHint(error?.message || '删除形象失败');
    } finally {
        customizing = false;
        updateControls();
    }
}


async function start() {
    if (starting || client || customizing || preparing || !readyPreset || readyPreset !== $('preset').value) return;
    starting = true;
    const attempt = ++attemptGeneration;
    muted = false;
    clearTranscript();
    updateControls();
    setStatus('创建会话…');
    setHint('正在通过平台 BFF 创建数字人会话');

    const instance = new AvatarSessionClient({
        canvas: $('avatarCanvas'),
        idleVideo,
        binaryMicrophone,
        baseUrl: location.origin,
        apiPrefix: API_PREFIX,
        presetId: $('preset').value,
        microphoneDeviceId: $('micDevice').value,
        speechInterruptor: new SpeechInterruptor(() => instance.interrupt()),
    });
    client = instance;
    instance.on('firstFrame', () => {
        if (client === instance) $('avatarStage').classList.add('live');
    });
    instance.on('ready', () => {
        setStatus('正在接收实时画面…');
        setHint('等待第一帧画面，麦克风尚未开始上传。');
    });
    instance.on('session.queued', ({ position }) => {
        setStatus(`排队中 · 第 ${position || 1} 位`);
    });
    instance.on('session.queue_update', ({ position }) => {
        setStatus(`排队中 · 第 ${position || 1} 位`);
    });
    instance.on('microphoneReady', (info) => {
        const label = info?.label ? `（${info.label}）` : '';
        setHint(`麦克风已授权${label}`);
        loadMicrophones().catch(() => {});
    });
    instance.on('microphoneLevel', ({ rms, sourceRms }) => {
        if (sourceRms > 0.01) setStatus('正在收音');
        else if (rms === 0 && sourceRms > 0.001) {
            setStatus('麦克风有输入，但采集节点输出为静音');
        }
    });
    instance.on('audioAccepted', ({ rms }) => {
        setStatus(
            Number(rms) < 0.002
                ? '服务器收到静音，请检查麦克风'
                : '服务器已收到音频',
        );
    });
    instance.on('transcript', ({ text }) => {
        if (client === instance) appendTranscript(text);
    });
    instance.on('responseStarted', () => {
        if (client !== instance) return;
        responseElement = null;
    });
    instance.on('responseEnded', () => {
        if (client !== instance) return;
        responseElement = null;
    });
    instance.on('interruptTimeout', () => {
        if (client === instance) setHint('正在等待清除旧音频；若长时间没有恢复，请结束并重新开始会话。');
    });
    instance.on('interrupted', () => {
        if (client !== instance) return;
        responseElement = null;
        setStatus('已打断');
    });
    instance.on('error', (error) => {
        console.error(error);
        setStatus('会话异常');
        setHint(error?.message || '会话异常');
    });
    instance.on('closed', ({ reason } = {}) => {
        if (client !== instance) return;
        client = null;
        ++attemptGeneration;
        $('avatarStage').classList.remove('live');
        starting = false;
        muted = false;
        instance.close();
        setStatus('已断开');
        setHint(`会话结束：${reason || 'closed'}`);
        void prepareSelected();
    });

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('当前页面不是安全上下文，无法访问麦克风');
        }
        const selectedMic = $('micDevice').value;
        if (selectedMic) localStorage.setItem(MIC_STORAGE_KEY, selectedMic);
        await instance.prepareMicrophone();
        if (client !== instance) return;
        await instance.connect();
        if (client !== instance) return;
        if (instance.lastDrawn < 0) {
            await new Promise((resolve, reject) => {
                const finish = (error) => {
                    clearTimeout(timer);
                    for (const off of listeners) off();
                    if (error) reject(error); else resolve();
                };
                const listeners = [
                    instance.on('firstFrame', () => finish()),
                    instance.on('error', error => finish(error)),
                    instance.on('closed', () => finish(new Error('会话已关闭'))),
                ];
                const timer = setTimeout(() => finish(new Error('等待实时视频超时，请重试服务连接')), 30000);
            });
        }
        if (client !== instance) return;
        await instance.startMicrophone();
        if (client !== instance) return;
        setStatus('已连接');
        setHint('实时画面和麦克风已就绪，可以说话。');
        starting = false;
        updateControls();
    } catch (error) {
        if (attempt !== attemptGeneration) return;
        console.error(error);
        client = null;
        instance.close();
        $('avatarStage').classList.remove('live');
        readyPreset = '';
        starting = false;
        setStatus('启动失败');
        setHint(error?.message || '启动失败');
        updateControls();
    }
}


$('preset').addEventListener('change', () => {
    clearTranscript();
    void prepareSelected();
});
$('start').addEventListener('click', start);
$('interrupt').addEventListener('click', () => client?.interrupt());
$('mute').addEventListener('click', () => {
    if (!client) return;
    muted = !muted;
    client.mute(muted);
    updateControls();
});
$('stop').addEventListener('click', () => client?.close());
$('retry').addEventListener('click', () => loadPresets().catch(error => {
    preparing = false;
    updateControls();
    setStatus('服务暂不可用');
    setHint(error?.message || '请稍后重试');
}));
$('micDevice').addEventListener('change', () => {
    localStorage.setItem(MIC_STORAGE_KEY, $('micDevice').value);
});
$('refreshDevices').addEventListener('click', () => {
    loadMicrophones({ requestPermission: true }).catch((error) => {
        setHint(error?.message || '麦克风列表刷新失败');
    });
});
$('createForm').addEventListener('submit', createCustomAvatar);
$('deletePreset').addEventListener('click', deleteSelectedPreset);
$('preset').addEventListener('change', updateControls);
window.addEventListener('pagehide', () => {
    leaving = true;
    clearTimeout(retryTimer);
    client?.close();
});
window.addEventListener('pageshow', event => {
    leaving = false;
    if (event.persisted) void prepareSelected();
});


updateControls();
loadMicrophones().catch(() => {});
loadPresets().catch((error) => {
    console.error(error);
    preparing = false;
    updateControls();
    setStatus('服务暂不可用');
    setHint(error?.message || '初始化失败');
});

let account = localStorage.getItem('aigc_workspace_id');
function syncAccount() {
    const latest = localStorage.getItem('aigc_workspace_id');
    if (latest !== account) {
        account = latest;
        client?.close();
        location.reload();
    }
}
window.addEventListener('storage', syncAccount);
if (window.parent !== window && document.referrer && new URL(document.referrer).origin === location.origin) {
    window.parent.addEventListener('aigc:session-changed', syncAccount);
    window.addEventListener('pagehide', () => window.parent.removeEventListener('aigc:session-changed', syncAccount), { once: true });
}
