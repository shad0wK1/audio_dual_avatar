import { AvatarSessionClient } from './avatar-session-client.js?v=avatar-delete2';


const $ = (id) => document.getElementById(id);
const API_PREFIX = '/api/avatar';
const MIC_STORAGE_KEY = 'avatar.ui.micDevice';

let client = null;
let starting = false;
let muted = false;
let responseElement = null;
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
    $('start').disabled = starting || running || customizing;
    $('interrupt').disabled = !running;
    $('mute').disabled = !running;
    $('stop').disabled = !running;
    $('preset').disabled = starting || running;
    $('micDevice').disabled = starting || running;
    $('refreshDevices').disabled = starting || running;
    $('mute').textContent = muted ? '取消静音' : '静音';
    $('deletePreset').hidden = !selected?.deletable;
    $('deletePreset').disabled = starting || running || customizing;
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


async function loadPresets() {
    const data = await AvatarSessionClient.listPresets({
        baseUrl: location.origin,
        apiPrefix: API_PREFIX,
    });
    presetData = Array.isArray(data.presets) ? data.presets : [];
    $('preset').replaceChildren();
    for (const preset of presetData) {
        if (!preset.available) continue;
        $('preset').add(new Option(preset.name, preset.id));
    }
    if (data.default_preset_id) $('preset').value = data.default_preset_id;
    updateControls();
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
    $('deletePreset').disabled = true;
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
        updateControls();
    }
}


async function start() {
    if (starting || client) return;
    starting = true;
    responseElement = null;
    updateControls();
    setStatus('创建会话…');
    setHint('正在通过平台 BFF 创建数字人会话');

    const instance = new AvatarSessionClient({
        canvas: $('avatarCanvas'),
        baseUrl: location.origin,
        apiPrefix: API_PREFIX,
        presetId: $('preset').value,
        microphoneDeviceId: $('micDevice').value,
    });
    client = instance;
    instance.on('ready', (message) => {
        setStatus(`已连接 · ${message.video_codec}`);
        setHint('麦克风已开启，可以开始对话');
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
    instance.on('transcript', ({ text }) => appendTranscript(text));
    instance.on('responseStarted', () => {
        responseElement = null;
    });
    instance.on('responseEnded', () => {
        responseElement = null;
    });
    instance.on('interrupted', () => {
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
        starting = false;
        setStatus('已断开');
        setHint(`会话结束：${reason || 'closed'}`);
        updateControls();
    });

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('当前页面不是安全上下文，无法访问麦克风');
        }
        const selectedMic = $('micDevice').value;
        if (selectedMic) localStorage.setItem(MIC_STORAGE_KEY, selectedMic);
        await instance.prepareMicrophone();
        await instance.connect();
        await instance.startMicrophone();
        starting = false;
        updateControls();
    } catch (error) {
        console.error(error);
        instance.close();
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
window.addEventListener('pagehide', () => client?.close());


updateControls();
Promise.all([
    loadPresets(),
    loadMicrophones(),
]).catch((error) => {
    console.error(error);
    setStatus('初始化失败');
    setHint(error?.message || '初始化失败');
});
