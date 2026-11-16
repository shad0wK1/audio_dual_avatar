const els = {
  statusPill: document.getElementById("statusPill"),
  statusText: document.getElementById("statusText"),
  reloadBtn: document.getElementById("reloadBtn"),
  overlay: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayText: document.getElementById("overlayText"),
  enterBtn: document.getElementById("enterBtn"),
  spinner: document.getElementById("spinner"),
  liveBadge: document.getElementById("liveBadge"),
  canvas: document.getElementById("view"),
  currentSegment: document.getElementById("currentSegment"),
  progressFill: document.getElementById("progressFill"),
  currentTime: document.getElementById("currentTime"),
  segmentDuration: document.getElementById("segmentDuration"),
  muteBtn: document.getElementById("muteBtn"),
  interruptBtn: document.getElementById("interruptBtn"),
  interruptBanner: document.getElementById("interruptBanner"),
  interruptText: document.getElementById("interruptText"),
  receivedSegments: document.getElementById("receivedSegments"),
  queuedSegments: document.getElementById("queuedSegments"),
  bufferedSegments: document.getElementById("bufferedSegments"),
  lastAudioAge: document.getElementById("lastAudioAge"),
  hint: document.getElementById("hint"),
  audioDir: document.getElementById("audioDir"),
  idleInfo: document.getElementById("idleInfo"),
};

const ui = {
  server: null,
  ws: null,
  connected: false,
  ended: false,
  playbackStarted: false,
  audioCtx: null,
  gain: null,
  muted: false,
  fps: 24,
  prebuffer: 8,
  maxPrefetch: 4,
  idleTimeout: 30,
  inputMode: "file",
  segments: [],
  receiving: null,
  scheduleCursor: 0,
  currentIndex: 0,
  timelineEpoch: 0,
  audioScheduleEnd: 0,
  frames: new Map(),
  lastDrawnFrame: -1,
  lastAckFrame: -1,
  lastMediaAckFrame: -1,
  idleMode: false,
  interruptWait: 10,
  interruptResumeMode: "restart",
  interruptPending: false,
  interrupted: false,
  interruptAnswered: false,
  ignoreNormalUntilResume: false,
  ignoredSegmentIds: new Set(),
  interruptDeadline: 0,
  interruptTimer: null,
  interruptedLabel: "",
  raf: 0,
  statusTimer: null,
  lastMetricsUpdate: 0,
};

function fmtTime(value) {
  const total = Math.max(0, Math.floor(value || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function setStatus(text, tone = "") {
  els.statusText.textContent = text;
  els.statusPill.className = `status-pill ${tone}`.trim();
}

function showOverlay(title, text, action = null, actionLabel = "") {
  els.overlay.classList.remove("hidden");
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.spinner.classList.toggle("hidden", Boolean(action));
  els.enterBtn.hidden = !action;
  if (action) {
    els.enterBtn.textContent = actionLabel;
    els.enterBtn.onclick = action;
  } else {
    els.enterBtn.onclick = null;
  }
}

function hideOverlay() {
  els.overlay.classList.add("hidden");
}

function ageText(seconds) {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function updateMetrics() {
  const now = performance.now();
  if (now - ui.lastMetricsUpdate < 200) return;
  ui.lastMetricsUpdate = now;
  els.receivedSegments.textContent = String(ui.segments.length);
  els.bufferedSegments.textContent = String(
    Math.max(0, ui.segments.length - ui.currentIndex)
  );
  if (ui.server) {
    els.queuedSegments.textContent = String(
      ui.server.queued_segments === undefined ? 0 : ui.server.queued_segments
    );
    els.lastAudioAge.textContent = ageText(ui.server.last_audio_age);
  }
}

async function refreshStatus() {
  if (ui.ended) return;
  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    const data = await response.json();
    ui.server = data;
    if (data.audio_dir) els.audioDir.textContent = data.audio_dir;
    if (data.input_mode && data.input_mode !== "file") {
      ui.inputMode = data.input_mode;
      els.audioDir.textContent = "WebSocket PCM";
    }
    if (data.idle_timeout_seconds) {
      ui.idleTimeout = data.idle_timeout_seconds;
      els.idleInfo.textContent =
        `${Math.round(ui.idleTimeout)} 秒无新音频且播放空闲后，程序会自动退出。`;
    }
    updateMetrics();

    if (data.status === "error") {
      setStatus("服务异常", "error");
      showOverlay("启动失败", data.error || "未知错误");
      els.spinner.classList.add("hidden");
      ui.ended = true;
      els.reloadBtn.hidden = false;
      return;
    }
    if (data.status === "exiting" || data.exit_reason) {
      endLive(data.exit_reason || "直播已结束。");
      return;
    }
    if (data.status !== "ready") {
      const labels = {
        starting: "启动中",
        loading_models: "加载模型",
        loading_avatar: "加载数字人",
      };
      setStatus(labels[data.status] || data.status, "warn");
      showOverlay("准备中", "正在加载模型和数字人缓存，请稍候…");
      ui.statusTimer = setTimeout(refreshStatus, 1500);
      return;
    }

    setStatus(ui.playbackStarted ? "直播中" : "等待进入", ui.playbackStarted ? "live" : "warn");
    if (!ui.playbackStarted) {
      if (!ui.ws || ui.ws.readyState === WebSocket.CLOSED || ui.ws.readyState === WebSocket.CLOSING) {
        showOverlay("服务就绪", "正在连接直播通道…");
        connectLive();
      } else if (ui.ws.readyState === WebSocket.CONNECTING) {
        showOverlay("服务就绪", "正在连接直播通道…");
      }
    }
    ui.statusTimer = setTimeout(refreshStatus, 2000);
  } catch (error) {
    if (!ui.ended) {
      setStatus("后端未连接", "error");
      showOverlay("无法连接后端", "请确认 stream_server.py 已启动。");
      els.reloadBtn.hidden = false;
    }
  }
}

function connectLive() {
  if (ui.ws && ui.ws.readyState <= WebSocket.OPEN) return;
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/ws/live`);
  ui.ws = ws;
  ws.binaryType = "arraybuffer";
  const connectTimer = setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
      ws.close();
      setStatus("连接超时", "error");
      showOverlay("直播通道连接超时", "请检查网络或反向代理是否允许 WebSocket。");
      els.reloadBtn.hidden = false;
    }
  }, 8000);

  ws.onopen = () => {
    clearTimeout(connectTimer);
    ui.connected = true;
    els.hint.textContent = "已连接后端，点击“进入直播”解锁浏览器音频。";
    if (!ui.playbackStarted) {
      showOverlay(
        "准备就绪",
        "点击进入直播。之后 data/audio/ 中新增的语音段会自动连续播放。",
        enterLive,
        "进入直播"
      );
      setStatus("等待进入", "warn");
    }
  };
  ws.onmessage = (event) => {
    if (typeof event.data === "string") {
      handleControl(JSON.parse(event.data));
    } else {
      handleFrame(event.data);
    }
  };
  ws.onerror = () => {
    if (!ui.ended) {
      setStatus("连接异常", "error");
      els.hint.textContent = "WebSocket 连接异常。";
    }
  };
  ws.onclose = () => {
    clearTimeout(connectTimer);
    ui.connected = false;
    if (ui.ws === ws) ui.ws = null;
    if (!ui.ended) {
      setStatus("连接断开", "error");
      showOverlay("直播连接已断开", "后端可能已结束或重启，请刷新页面。");
      els.reloadBtn.hidden = false;
    }
  };
}

async function enterLive() {
  if (ui.playbackStarted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ui.audioCtx = new AudioCtx();
    ui.gain = ui.audioCtx.createGain();
    ui.gain.gain.value = ui.muted ? 0 : 1;
    ui.gain.connect(ui.audioCtx.destination);
    await ui.audioCtx.resume();
  } catch (error) {
    showOverlay("无法启动音频", "浏览器拒绝了音频上下文，请再点击一次。", enterLive, "进入直播");
    return;
  }

  ui.playbackStarted = true;
  ui.timelineEpoch = ui.audioCtx.currentTime + 0.12;
  ui.audioScheduleEnd = 0;
  ui.ended = false;
  els.muteBtn.disabled = false;
  els.liveBadge.hidden = false;
  els.enterBtn.hidden = true;
  setStatus("等待音频", "warn");
  els.hint.textContent = "已进入直播，等待 data/audio/ 中新增语音文件。";
  if (ui.ws && ui.ws.readyState === WebSocket.OPEN) {
    ui.ws.send(JSON.stringify({ type: "ready" }));
  }

  for (const segment of ui.segments) {
    if (segment.audioData) decodeSegment(segment);
  }
  tryScheduleNext();

  hideOverlay();
  if (!currentActiveSegment() && !ui.segments.length) {
    setStatus("待机播放", "warn");
    els.hint.textContent =
      "当前无语音，服务端按全局帧号输出待机原帧。";
  }
  if (!ui.raf) ui.raf = requestAnimationFrame(render);
}

function interruptLive() {
  if (
    !ui.playbackStarted ||
    ui.ended ||
    ui.interruptPending ||
    ui.interrupted
  ) {
    return;
  }
  const segment = currentActiveSegment();
  if (
    !segment ||
    !ui.audioCtx ||
    !ui.ws ||
    ui.ws.readyState !== WebSocket.OPEN
  ) {
    return;
  }

  const frameIndex = Math.max(ui.lastDrawnFrame, segment.startFrame);
  ui.interruptPending = true;
  ui.interruptAnswered = false;
  els.interruptBtn.disabled = true;
  setStatus("正在打断", "warn");
  els.hint.textContent = "正在打断数字人，等待新语音…";
  showInterruptBanner("正在打断…");
  ui.ws.send(
    JSON.stringify({
      type: "interrupt",
      segment_id: segment.id,
      frame_index: frameIndex,
    })
  );
}

function stopAndDropFromCurrent() {
  for (let index = ui.currentIndex; index < ui.segments.length; index += 1) {
    const segment = ui.segments[index];
    if (segment.sourceNode) {
      try {
        segment.sourceNode.stop();
      } catch (error) {
        // The source may already have ended.
      }
      segment.sourceNode = null;
    }
    for (const frameIndex of segment.receivedFrames) {
      const frame = ui.frames.get(frameIndex);
      if (frame) {
        frame.bitmap.close();
        ui.frames.delete(frameIndex);
      }
    }
    releaseSegment(segment);
  }
  ui.segments = ui.segments.slice(0, ui.currentIndex);
  ui.scheduleCursor = ui.segments.length;
  ui.currentIndex = ui.segments.length;
  ui.audioScheduleEnd = 0;
  ui.receiving = null;
  els.currentSegment.textContent = "已打断";
  els.progressFill.style.width = "0%";
  els.currentTime.textContent = "00:00";
  els.segmentDuration.textContent = "00:00";
  updateMetrics();
}

function showInterruptBanner(text) {
  els.interruptBanner.hidden = false;
  els.interruptText.textContent = text;
}

function stopInterruptCountdown() {
  if (ui.interruptTimer) {
    clearInterval(ui.interruptTimer);
    ui.interruptTimer = null;
  }
  ui.interruptDeadline = 0;
}

function hideInterruptBanner() {
  stopInterruptCountdown();
  els.interruptBanner.hidden = true;
}

function startInterruptCountdown(seconds) {
  stopInterruptCountdown();
  ui.interruptDeadline = performance.now() + seconds * 1000;
  const resumeWord = ui.interruptResumeMode === "continue" ? "继续" : "重新播放";
  const update = () => {
    if (!ui.interrupted) {
      hideInterruptBanner();
      return;
    }
    const remaining = Math.max(
      0,
      Math.ceil((ui.interruptDeadline - performance.now()) / 1000)
    );
    els.interruptText.textContent =
      remaining > 0
        ? `${remaining}s 内无新语音将${resumeWord}原语音`
        : `等待${resumeWord}原语音…`;
  };
  update();
  ui.interruptTimer = setInterval(update, 250);
}

function handleControl(message) {
  if (message.type === "meta") {
    ui.fps = message.fps || 24;
    ui.prebuffer = message.prebuffer || 8;
    ui.maxPrefetch = message.max_prefetch_seconds || 4;
    ui.idleTimeout = message.idle_timeout_seconds || 30;
    ui.interruptWait = message.interrupt_wait_seconds || 10;
    ui.interruptResumeMode = message.interrupt_resume_mode || "restart";
    ui.inputMode = message.input_mode || "file";
    els.canvas.width = message.width;
    els.canvas.height = message.height;
    els.canvas.style.aspectRatio = `${message.width} / ${message.height}`;
    els.audioDir.textContent =
      ui.inputMode === "file"
        ? message.audio_dir || "data/audio/"
        : "WebSocket PCM";
    return;
  }

  if (message.type === "segment") {
    const isPriority = Boolean(message.priority);
    const isResume = Boolean(message.resume);
    if (ui.ignoreNormalUntilResume && !isPriority && !isResume) {
      ui.ignoredSegmentIds.add(message.id);
      ui.receiving = null;
      return;
    }
    if (isResume) {
      ui.interruptAnswered = true;
      ui.ignoreNormalUntilResume = false;
      ui.interrupted = false;
      ui.interruptPending = false;
      hideInterruptBanner();
      setStatus("继续被打断的语音", "live");
      els.hint.textContent = "正在重新播放被打断的语音内容。";
    } else if (isPriority) {
      ui.interruptAnswered = true;
      ui.interruptPending = false;
      ui.interrupted = false;
      ui.ignoreNormalUntilResume = false;
      hideInterruptBanner();
      setStatus("回答中", "live");
      els.hint.textContent = "正在优先播放新语音；被打断的内容不再恢复。";
    }
    const segment = {
      id: message.id,
      duration: message.duration,
      totalFrames: message.total_frames,
      startFrame: Number(message.start_frame || 0),
      startPtsUs: Number(message.start_pts_us || 0),
      sampleCount: Number(message.sample_count || 0),
      sampleRate: Number(message.sample_rate || 16000),
      speechFrames: Number(message.speech_frames || 0),
      silentFrames: Number(message.silent_frames || 0),
      audioUrl: message.audio_url,
      source: message.source || `segment_${message.id}`,
      priority: isPriority,
      resume: isResume,
      originId: message.origin_id,
      audioData: null,
      audioBuffer: null,
      decoding: false,
      receivedFrames: new Set(),
      startAt: null,
      sourceNode: null,
      complete: false,
    };
    ui.segments.push(segment);
    ui.receiving = segment;
    updateMetrics();
    fetchSegmentAudio(segment);
    if (!ui.playbackStarted) {
      els.hint.textContent = `已收到第 ${ui.segments.length} 段语音，点击“进入直播”开始播放。`;
    } else if (!isPriority && !isResume) {
      if (!currentActiveSegment() && ui.scheduleCursor === 0) {
        setStatus("缓冲中", "warn");
        els.hint.textContent = `第 ${segment.id + 1} 段语音正在生成画面，服务端待机帧继续播放。`;
      }
    }
    return;
  }

  if (message.type === "flush") {
    // Upstream barge-in: drop the current answer now; nothing will resume.
    stopAndDropFromCurrent();
    if (ui.playbackStarted && !ui.ended) setStatus("直播中", "live");
    els.hint.textContent = "上游打断，已清空当前回答。";
    return;
  }

  if (message.type === "interrupt_ack") {
    if (!message.ok) {
      ui.interruptPending = false;
      hideInterruptBanner();
      setStatus("直播中", "live");
      els.hint.textContent = message.message || "打断失败";
      return;
    }
    ui.interruptPending = false;
    if (ui.interruptAnswered) {
      hideInterruptBanner();
      return;
    }
    ui.interrupted = true;
    ui.ignoreNormalUntilResume = true;
    stopAndDropFromCurrent();
    ui.interruptWait = message.wait_seconds || ui.interruptWait;
    setStatus("已打断", "warn");
    els.hint.textContent = "已打断数字人，等待新语音；超时将恢复被打断的内容。";
    showInterruptBanner("等待回答…");
    startInterruptCountdown(ui.interruptWait);
    return;
  }

  if (message.type === "segment_end") {
    if (ui.ignoredSegmentIds.has(message.segment_id)) {
      return;
    }
    const segment = ui.segments.find((item) => item.id === message.segment_id);
    if (segment) segment.complete = true;
    if (ui.receiving && ui.receiving.id === message.segment_id) {
      ui.receiving = null;
    }
    tryScheduleNext();
    return;
  }

  if (message.type === "live_end") {
    endLive(message.message || "音频目录长时间没有新增文件，直播已结束。");
    return;
  }

  if (message.type === "error") {
    setStatus("直播异常", "error");
    els.hint.textContent = message.detail || message.message || "";
    failLive(message.message || "后端返回错误。");
  }
}

function handleFrame(arrayBuffer) {
  if (ui.ended || arrayBuffer.byteLength <= 24) return;
  const view = new DataView(arrayBuffer);
  if (view.getUint32(0) !== 0x4d544631) return;
  const frameKind = view.getUint8(4);
  const segmentId = view.getUint32(8);
  const ptsUs = Number(view.getBigInt64(12));
  const frameIndex = view.getUint32(20);
  const payload = new Uint8Array(arrayBuffer, 24);
  const isWebp = payload[0] === 0x52 && payload[1] === 0x49
    && payload[8] === 0x57 && payload[9] === 0x45;
  if (segmentId !== 0xffffffff && ui.ignoredSegmentIds.has(segmentId)) {
    return;
  }

  createImageBitmap(new Blob([payload], { type: isWebp ? "image/webp" : "image/jpeg" }))
    .then((bitmap) => {
      if (ui.ended) {
        bitmap.close();
        return;
      }
      const old = ui.frames.get(frameIndex);
      if (old) old.bitmap.close();
      ui.frames.set(frameIndex, { bitmap, frameKind, segmentId, ptsUs });
      if (segmentId !== 0xffffffff) {
        const segment = ui.segments.find((item) => item.id === segmentId);
        if (segment) segment.receivedFrames.add(frameIndex);
      }
      if (ui.lastDrawnFrame >= 0) pruneFrames(ui.lastDrawnFrame);
      tryScheduleNext();
      updateMetrics();
    })
    .catch(() => {});
}

async function fetchSegmentAudio(segment) {
  try {
    const response = await fetch(segment.audioUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`audio HTTP ${response.status}`);
    segment.audioData = await response.arrayBuffer();
    if (ui.audioCtx) await decodeSegment(segment);
  } catch (error) {
    els.hint.textContent = `第 ${segment.id + 1} 段音频加载失败：${error.message}`;
  }
}

async function decodeSegment(segment) {
  if (
    !ui.audioCtx ||
    !segment.audioData ||
    segment.audioBuffer ||
    segment.decoding
  ) {
    return;
  }
  segment.decoding = true;
  const data = segment.audioData;
  segment.audioData = null;
  try {
    segment.audioBuffer = await ui.audioCtx.decodeAudioData(data);
    segment.decoding = false;
    tryScheduleNext();
  } catch (error) {
    segment.decoding = false;
    els.hint.textContent = `第 ${segment.id + 1} 段音频解码失败：${error.message}`;
  }
}

function hasPrebuffer(segment) {
  const needed = Math.min(segment.totalFrames, ui.prebuffer);
  for (let index = 0; index < needed; index += 1) {
    if (!segment.receivedFrames.has(segment.startFrame + index)) return false;
  }
  return true;
}

function tryScheduleNext() {
  if (!ui.playbackStarted || !ui.audioCtx) return;
  let scheduled = false;
  let scheduledKind = null;
  while (ui.scheduleCursor < ui.segments.length) {
    const segment = ui.segments[ui.scheduleCursor];
    if (!segment.audioBuffer || !hasPrebuffer(segment)) break;

    const when = Math.max(
      ui.audioCtx.currentTime + 0.08,
      ui.timelineEpoch + segment.startPtsUs / 1000000,
      ui.audioScheduleEnd
    );
    const source = ui.audioCtx.createBufferSource();
    source.buffer = segment.audioBuffer;
    source.connect(ui.gain);
    source.start(when);
    segment.sourceNode = source;
    segment.startAt = when;
    ui.audioScheduleEnd = when + segment.audioBuffer.duration;
    ui.scheduleCursor += 1;
    scheduled = true;
    if (segment.resume) {
      scheduledKind = "resume";
    } else if (segment.priority) {
      if (scheduledKind !== "resume") scheduledKind = "answer";
    } else if (scheduledKind === null) {
      scheduledKind = "normal";
    }
  }

  if (scheduled) {
    hideOverlay();
    if (scheduledKind === "resume") {
      hideInterruptBanner();
      setStatus("继续被打断的语音", "live");
      els.hint.textContent = "正在继续播放被打断的语音内容。";
    } else if (scheduledKind === "answer") {
      hideInterruptBanner();
      setStatus("回答中", "live");
      els.hint.textContent = "正在优先播放新语音；被打断的内容不再恢复。";
    } else {
      setStatus("直播中", "live");
      els.hint.textContent = "直播中。新语音段会自动排在前一段结束后播放。";
    }
  }
  updateMetrics();
}

function currentActiveSegment() {
  if (!ui.audioCtx || !ui.playbackStarted) return null;
  const now = ui.audioCtx.currentTime;
  for (let index = ui.currentIndex; index < ui.segments.length; index += 1) {
    const segment = ui.segments[index];
    if (segment.startAt === null) continue;
    if (now >= segment.startAt && now < segment.startAt + segment.duration) {
      return segment;
    }
  }
  return null;
}

function render() {
  if (ui.ended) return;
  ui.raf = requestAnimationFrame(render);
  if (!ui.playbackStarted || !ui.audioCtx) return;

  const active = currentActiveSegment();
  els.interruptBtn.disabled = !(
    active &&
    !ui.interrupted &&
    !ui.interruptPending &&
    ui.ws &&
    ui.ws.readyState === WebSocket.OPEN
  );

  const now = ui.audioCtx.currentTime;
  while (ui.currentIndex + 1 < ui.segments.length) {
    const next = ui.segments[ui.currentIndex + 1];
    if (next.startAt !== null && now >= next.startAt) {
      releaseSegment(ui.segments[ui.currentIndex]);
      ui.currentIndex += 1;
    } else {
      break;
    }
  }

  const elapsed = Math.max(0, now - ui.timelineEpoch);
  const targetFrame = Math.floor(elapsed * ui.fps);
  drawFrameAt(targetFrame);
  ackProgress(ui.lastDrawnFrame);

  const segment = ui.segments[ui.currentIndex];
  const segmentActive =
    segment &&
    segment.startAt !== null &&
    now >= segment.startAt &&
    now < segment.startAt + segment.duration;

  if (!segmentActive) {
    if (
      segment &&
      segment.startAt !== null &&
      now < segment.startAt
    ) {
      els.currentSegment.textContent = `第 ${segment.id + 1} 段 · ${segment.source}`;
      els.segmentDuration.textContent = fmtTime(segment.duration);
    } else {
      els.currentSegment.textContent = "待机播放";
      els.progressFill.style.width = "0%";
      els.currentTime.textContent = "00:00";
      els.segmentDuration.textContent = "00:00";
    }
    if (!ui.interruptPending && !ui.interrupted && !ui.idleMode) {
      ui.idleMode = true;
      setStatus("待机播放", "warn");
      els.hint.textContent =
        "当前无语音，服务端按全局帧号输出待机原帧。";
    }
    updateMetrics();
    return;
  }

  if (ui.idleMode) {
    ui.idleMode = false;
    if (segment.priority) {
      setStatus("回答中", "live");
    } else if (segment.resume) {
      setStatus("继续被打断的语音", "live");
    } else {
      setStatus("直播中", "live");
    }
  }

  const segmentElapsed = Math.max(0, now - segment.startAt);
  els.currentSegment.textContent = `第 ${segment.id + 1} 段 · ${segment.source}`;
  els.segmentDuration.textContent = fmtTime(segment.duration);
  updateTransport(
    Math.min(segmentElapsed, segment.duration),
    segment.duration
  );
  updateMetrics();
}

function drawFrameAt(targetFrame) {
  let selectedFrame = -1;
  let selected = null;
  for (const [frameIndex, frame] of ui.frames) {
    if (frameIndex <= targetFrame && frameIndex > selectedFrame) {
      selectedFrame = frameIndex;
      selected = frame;
    }
  }
  if (!selected || selectedFrame <= ui.lastDrawnFrame) return;
  const context = els.canvas.getContext("2d");
  context.drawImage(
    selected.bitmap,
    0,
    0,
    els.canvas.width,
    els.canvas.height
  );
  ui.lastDrawnFrame = selectedFrame;
  pruneFrames(selectedFrame);
}

function pruneFrames(anchorFrame) {
  const minFrame = Math.max(0, anchorFrame - 6);
  for (const [frameIndex, frame] of ui.frames) {
    if (frameIndex < minFrame) {
      frame.bitmap.close();
      ui.frames.delete(frameIndex);
    }
  }
  const limit = Math.max(120, Math.ceil(ui.fps * ui.maxPrefetch * 2));
  if (ui.frames.size <= limit) return;
  const ordered = [...ui.frames.keys()].sort((a, b) => a - b);
  for (const frameIndex of ordered.slice(0, ui.frames.size - limit)) {
    if (frameIndex <= ui.lastDrawnFrame) {
      ui.frames.get(frameIndex).bitmap.close();
      ui.frames.delete(frameIndex);
    }
  }
}

function ackProgress(frameIndex) {
  const frame = ui.frames.get(frameIndex);
  if (!frame) return;
  const segment =
    frame.segmentId === 0xffffffff
      ? null
      : ui.segments.find((item) => item.id === frame.segmentId);
  const finalMediaFrame =
    segment &&
    frame.frameKind !== 0 &&
    frameIndex >= segment.startFrame + segment.totalFrames - 1;
  let shouldAck = false;
  if (
    frame.frameKind !== 0 &&
    frameIndex > ui.lastMediaAckFrame &&
    (frameIndex - ui.lastMediaAckFrame >= 6 || finalMediaFrame)
  ) {
    ui.lastMediaAckFrame = frameIndex;
    shouldAck = true;
  }
  if (frameIndex - ui.lastAckFrame >= 6) {
    ui.lastAckFrame = frameIndex;
    shouldAck = true;
  }
  if (!shouldAck) return;
  const kind = frame.frameKind === 0
    ? "idle"
    : frame.frameKind === 2
      ? "silent"
      : "speech";
  if (ui.ws && ui.ws.readyState === WebSocket.OPEN) {
    ui.ws.send(
      JSON.stringify({
        type: "ack",
        frame_index: frameIndex,
        pts_us: frame.ptsUs,
        kind,
      })
    );
  }
}

function updateTransport(elapsed, duration) {
  const ratio = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  els.progressFill.style.width = `${(ratio * 100).toFixed(2)}%`;
  els.currentTime.textContent = fmtTime(elapsed);
  els.segmentDuration.textContent = fmtTime(duration);
}

function releaseSegment(segment) {
  segment.audioBuffer = null;
  segment.sourceNode = null;
}

function endLive(message) {
  if (ui.ended) return;
  ui.ended = true;
  ui.playbackStarted = false;
  cancelAnimationFrame(ui.raf);
  ui.raf = 0;
  if (ui.audioCtx) {
    ui.audioCtx.close().catch(() => {});
    ui.audioCtx = null;
  }
  if (ui.ws && ui.ws.readyState <= WebSocket.OPEN) ui.ws.close();
  for (const frame of ui.frames.values()) frame.bitmap.close();
  ui.frames.clear();
  hideInterruptBanner();
  els.liveBadge.hidden = true;
  els.muteBtn.disabled = true;
  els.interruptBtn.disabled = true;
  setStatus("直播结束", "");
  showOverlay("直播结束", message || "直播已结束。");
  els.spinner.classList.add("hidden");
  els.reloadBtn.hidden = false;
  els.hint.textContent = message || "直播已结束。";
}

function failLive(message) {
  if (ui.ended) return;
  ui.ended = true;
  ui.playbackStarted = false;
  cancelAnimationFrame(ui.raf);
  ui.raf = 0;
  if (ui.audioCtx) {
    ui.audioCtx.close().catch(() => {});
    ui.audioCtx = null;
  }
  if (ui.ws && ui.ws.readyState <= WebSocket.OPEN) ui.ws.close();
  for (const frame of ui.frames.values()) frame.bitmap.close();
  ui.frames.clear();
  hideInterruptBanner();
  els.liveBadge.hidden = true;
  els.muteBtn.disabled = true;
  els.interruptBtn.disabled = true;
  showOverlay("直播异常", message || "直播已停止。");
  els.spinner.classList.add("hidden");
  els.reloadBtn.hidden = false;
}

els.muteBtn.addEventListener("click", () => {
  if (!ui.gain) return;
  ui.muted = !ui.muted;
  ui.gain.gain.value = ui.muted ? 0 : 1;
  els.muteBtn.textContent = ui.muted ? "🔇" : "🔊";
});
els.interruptBtn.addEventListener("click", interruptLive);
els.reloadBtn.addEventListener("click", () => location.reload());
window.addEventListener("beforeunload", () => {
  if (ui.ws && ui.ws.readyState <= WebSocket.OPEN) ui.ws.close();
});

refreshStatus();
