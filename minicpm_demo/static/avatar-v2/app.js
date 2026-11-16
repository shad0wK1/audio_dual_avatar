import { SpeechInterruptor } from '../sdk/speech-interruptor.js';
import { AvatarSessionClient } from '../sdk/avatar-session-client.js?v=cloud1';


const $ = (id) => document.getElementById(id);
let client = null;
let starting = false;
let muted = false;
let currentResponse = null;
let customizing = false;
let presetData = [];
const MIC_DEVICE_KEY = 'avatar.ui.micDevice';
const OWNER_KEY = 'avatar.ownerId';
const ownerId = getOwnerId();


function getOwnerId() {
    const existing = localStorage.getItem(OWNER_KEY);
    if (existing) return existing;
    const value = crypto.randomUUID?.()
        || `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(OWNER_KEY, value);
    return value;
}


function setStatus(text) {
    $('status').textContent = text;
}


function setHint(text) {
    $('hint').textContent = text;
}


function updateControls() {
    const running = Boolean(client);
    const selected = presetData.find((item) => item.id === $('preset').value);
    $('start').disabled = starting || running || customizing;
    $('stop').disabled = !running;
    $('interrupt').disabled = !running;
    $('mute').disabled = !running;
    $('mute').textContent = muted ? '取消静音' : '静音';
    $('micDevice').disabled = starting || running;
    $('refreshDevices').disabled = starting || running;
    for (const id of [
        'customVideo',
        'customAudio',
        'customName',
        'customDescription',
        'customPrompt',
        'createButton',
    ]) {
        $(id).disabled = starting || running || customizing;
    }
    $('deletePreset').hidden = !selected?.deletable;
    $('deletePreset').disabled = starting || running || customizing;
}


function appendTranscript(text) {
    if (!text) return;
    if (!currentResponse) {
        currentResponse = document.createElement('div');
        currentResponse.className = 'message assistant';
        $('transcript').append(currentResponse);
    }
    currentResponse.textContent += text;
    $('transcript').scrollTop = $('transcript').scrollHeight;
}


async function loadPresets() {
    const data = await AvatarSessionClient.listPresets({
        baseUrl: location.origin,
        apiKey: $('apiKey').value.trim(),
        ownerId,
    });
    presetData = Array.isArray(data.presets) ? data.presets : [];
    $('preset').replaceChildren();
    for (const item of presetData) {
        if (!item.available) continue;
        $('preset').add(new Option(item.name, item.id));
    }
    if (data.default_preset_id) $('preset').value = data.default_preset_id;
    updateControls();
}


async function loadMicrophones({ requestPermission = false } = {}) {
    if (requestPermission) {
        const permissionStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });
        for (const track of permissionStream.getTracks()) track.stop();
    }
    const saved = localStorage.getItem(MIC_DEVICE_KEY) || '';
    const current = $('micDevice').value || saved;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const microphones = devices.filter((device) => device.kind === 'audioinput');
    $('micDevice').replaceChildren(new Option('系统默认麦克风', ''));
    let index = 0;
    for (const device of microphones) {
        if (!device.deviceId || device.deviceId === 'default') continue;
        index += 1;
        const label = device.label || `麦克风 ${index}`;
        $('micDevice').add(new Option(label, device.deviceId));
    }
    if (current && [...$('micDevice').options].some((option) => option.value === current)) {
        $('micDevice').value = current;
    } else if (current) {
        $('micDevice').add(new Option('已保存的麦克风（等待授权）', current));
        $('micDevice').value = current;
    }
}


async function createCustomAvatar(event) {
    event.preventDefault();
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
            apiKey: $('apiKey').value.trim(),
            ownerId,
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
                apiKey: $('apiKey').value.trim(),
                ownerId,
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
        await loadPresets();
        if (job.preset_id) $('preset').value = job.preset_id;
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
    let switchToDefault = Boolean(preset.active);
    if (
        switchToDefault
        && !window.confirm(
            `该形象当前处于活跃状态。删除后将自动切换为系统默认形象。`
            + `确认继续删除“${preset.name}”？`,
        )
    ) {
        return;
    }
    $('deletePreset').disabled = true;
    setHint(
        switchToDefault
            ? '正在切换默认形象并删除自建形象…'
            : '正在删除自建形象…',
    );
    try {
        try {
            await AvatarSessionClient.deletePreset({
                baseUrl: location.origin,
                apiKey: $('apiKey').value.trim(),
                ownerId,
                presetId: preset.id,
                switchToDefault,
            });
        } catch (error) {
            if (error?.code !== 'avatar_active' || switchToDefault) {
                throw error;
            }
            if (!window.confirm(
                `该形象当前处于活跃状态。删除后将自动切换为系统默认形象。`
                + `确认继续删除“${preset.name}”？`,
            )) {
                return;
            }
            switchToDefault = true;
            setHint('正在切换默认形象并删除自建形象…');
            await AvatarSessionClient.deletePreset({
                baseUrl: location.origin,
                apiKey: $('apiKey').value.trim(),
                ownerId,
                presetId: preset.id,
                switchToDefault: true,
            });
        }
        await loadPresets();
        setHint(`已删除自建形象：${preset.name}`);
    } catch (error) {
        console.error(error);
        setHint(error?.message || '删除形象失败');
    } finally {
        updateControls();
    }
}


async function start() {
    if (starting || client) return;
    starting = true;
    currentResponse = null;
    updateControls();
    setStatus('创建会话…');
    setHint('正在通过 /v1/avatar/sessions 创建服务端编排会话');
    try {
        const instance = new AvatarSessionClient({
            canvas: $('avatarCanvas'),
            speechInterruptor: new SpeechInterruptor(() => instance.interrupt()),
            presetId: $('preset').value,
            microphoneDeviceId: $('micDevice').value,
            apiKey: $('apiKey').value.trim(),
            ownerId,
        });
        client = instance;
        instance.on('ready', (message) => {
            setStatus(`已连接 · ${message.video_codec} · ${message.width}×${message.height}`);
            setHint('发送麦克风音频即可开始对话');
        });
        instance.on('microphoneReady', (info) => {
            const label = info?.label ? `（${info.label}）` : '';
            setHint(`麦克风已授权${label}，正在准备数字人会话…`);
            loadMicrophones().catch(() => {});
        });
        instance.on('microphoneStarted', () => {
            setStatus('麦克风已开启 · 正在聆听');
            setHint('请对着麦克风说话，绿色音量状态会在收到声音后更新');
        });
        instance.on('microphoneLevel', ({ rms, sourceRms }) => {
            if (sourceRms > 0.01) {
                setStatus('正在收音');
            } else if (rms === 0 && sourceRms > 0.001) {
                setStatus('麦克风有输入，但采集节点输出为静音');
            }
        });
        instance.on('microphoneTrackState', ({ muted: trackMuted }) => {
            setStatus(
                trackMuted
                    ? '麦克风被系统静音'
                    : '麦克风已恢复',
            );
        });
        instance.on('audioAccepted', ({ rms }) => {
            if (Number(rms) < 0.002) {
                setStatus('麦克风无信号，请检查设备和系统权限');
            } else {
                setStatus('服务器已收到音频');
            }
        });
        instance.on('transcript', ({ text }) => appendTranscript(text));
        instance.on('responseStarted', () => {
            currentResponse = null;
        });
        instance.on('responseEnded', () => {
            currentResponse = null;
        });
        instance.on('interrupted', () => {
            currentResponse = null;
            setStatus('已打断');
        });
        instance.on('closed', ({ reason } = {}) => {
            if (client !== instance) return;
            client = null;
            starting = false;
            setStatus('已断开');
            setHint(`会话结束：${reason || 'closed'}`);
            updateControls();
        });
        instance.on('error', (error) => {
            console.error(error);
            setStatus('会话异常');
            setHint(error?.message || '会话异常');
        });
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('当前浏览器不能采集麦克风，请使用 HTTPS');
        }
        await instance.prepareMicrophone();
        if ($('micDevice').value) {
            localStorage.setItem(MIC_DEVICE_KEY, $('micDevice').value);
        }
        await instance.connect();
        await instance.startMicrophone();
        starting = false;
        setStatus('会话已就绪');
        updateControls();
    } catch (error) {
        console.error(error);
        client?.close();
        client = null;
        starting = false;
        setStatus('启动失败');
        setHint(error?.message || '启动失败');
        updateControls();
    }
}


$('start').addEventListener('click', start);
$('interrupt').addEventListener('click', () => client?.interrupt());
$('mute').addEventListener('click', () => {
    if (!client) return;
    muted = !muted;
    client.mute(muted);
    updateControls();
});
$('stop').addEventListener('click', () => client?.close());
$('createForm').addEventListener('submit', createCustomAvatar);
$('deletePreset').addEventListener('click', deleteSelectedPreset);
$('preset').addEventListener('change', updateControls);
$('micDevice').addEventListener('change', () => {
    localStorage.setItem(MIC_DEVICE_KEY, $('micDevice').value);
});
$('refreshDevices').addEventListener('click', () => {
    loadMicrophones({ requestPermission: true }).catch((error) => {
        setHint(error?.message || '麦克风列表刷新失败');
    });
});
window.addEventListener('pagehide', () => client?.close());


updateControls();
$('apiKey').addEventListener('change', () => loadPresets().then(() => setStatus('可开始会话')).catch(() => setStatus('请检查 API Key')));
loadPresets().catch((error) => {
    setStatus('请输入会话 API Key');
    setHint(error?.message || '预设加载失败');
});
loadMicrophones().catch((error) => {
    setHint(error?.message || '麦克风列表加载失败');
});
