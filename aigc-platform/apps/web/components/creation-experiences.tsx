"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, RefreshCw } from "lucide-react";
import { liveInteraction, worldModel, type ExperienceStatus } from "@/lib/creation-experiences";
import { acquireForegroundMedia } from "@/lib/foreground-media";
import styles from "./creation-experiences.module.css";
import { LiveSampleVideos } from "./live-sample-videos";
import { WorldSceneVideos } from "./world-scene-videos";

function useAvailability(mode: "live" | "world") {
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<ExperienceStatus>({ available: false, message: "正在检查服务状态" });
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setStatus({ available: false, message: "正在检查服务状态" }); setError(false);
    void (mode === "live" ? liveInteraction : worldModel).status().then(value => { if (active) setStatus(value); })
      .catch(() => { if (active) { setStatus({ available: false, message: "暂时无法读取服务状态" }); setError(true); } });
    return () => { active = false; };
  }, [mode, revision]);
  return { ...status, error, retry: () => setRevision(value => value + 1) };
}

function Availability({ state }: { state: ReturnType<typeof useAvailability> }) {
  return <div className={styles.availability} role="status"><span className={styles.statusDot} data-available={state.available} />{state.message}{state.error && <button type="button" onClick={state.retry}><RefreshCw size={13} />重新检查</button>}</div>;
}

function LivePreviewHeading() {
  const state = useAvailability("live");
  return <header className={styles.sectionHeading}><div><span className={styles.eyebrow}>与灵感面对面</span><h2>让每一次对话，都有回应。</h2><p>观看实时交互样例，感受数字人的倾听与表达。</p></div><Availability state={state} /></header>;
}

function LiveExperience() {
  const embedUrl = process.env.NEXT_PUBLIC_AVATAR_EMBED_URL;
  return <>
    {embedUrl ? (
      <iframe className={styles.avatarFrame} src={embedUrl} title="实时数字人对话" allow="microphone; autoplay; fullscreen" />
    ) : <LivePreviewHeading />}
    <LiveSampleVideos />
    <p className={styles.note}>以上为录制的交互样例，点击视频即可播放。</p>
  </>;
}

function WorldExperience() {
  const state = useAvailability("world");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const release = useRef<(() => void) | null>(null);
  const stopForeground = () => { release.current?.(); release.current = null; };
  useEffect(() => {
    const current = video.current;
    const onVisibility = () => { if (document.hidden) current?.pause(); };
    document.addEventListener("visibilitychange", onVisibility);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) current?.pause(); });
    if (current) observer?.observe(current);
    return () => { document.removeEventListener("visibilitychange", onVisibility); observer?.disconnect(); current?.pause(); release.current?.(); release.current = null; };
  }, []);
  function play() {
    setError(false); setLoaded(true);
    const current = video.current;
    if (!current) return;
    if (!current.getAttribute("src") || current.error) { current.src = "/showcase/world-model.mp4"; current.load(); }
    void current.play().catch(() => { setError(true); stopForeground(); });
  }
  return <>
    <div className={styles.worldHero}>
      <div className={styles.worldCopy}><span className={styles.eyebrow}>探索世界模型</span><h2>让世界，成为<br />可以探索的画面。</h2><p>从自然的变化到城市的脉络，走进想象中的下一片天地。</p><Availability state={state} /><span className={styles.note}>当前展示为概念视频，非实时推演。</span></div>
      <div className={styles.film}>
        <video ref={video} aria-label="世界模型展示视频" poster="/showcase/world-poster.webp" controls={loaded} playsInline preload="none" onPlay={() => { if (!release.current) release.current = acquireForegroundMedia(); }} onPause={stopForeground} onEnded={stopForeground} onError={() => { setError(true); stopForeground(); }} />
        {(!loaded || error) && <div className={styles.filmOverlay}><button type="button" className={styles.play} onClick={play}>{error ? <RefreshCw size={22} /> : <Play size={24} fill="currentColor" />}<span>{error ? "重新加载展示视频" : "播放世界模型展示"}</span></button>{error && <p role="alert">视频暂时无法播放，请重试。</p>}</div>}
        <span className={styles.filmBadge}>展示视频</span>
      </div>
    </div>
    <div className={styles.sectionHeading}><div><h2>探索场景</h2><p>发现不同世界的视觉与叙事可能。</p></div></div>
    <WorldSceneVideos />
  </>;
}

export function CreationExperiencePanel({ mode, onBack }: { mode: "live" | "world"; onBack: () => void }) {
  useEffect(() => {
    document.body.dataset.creationShowcase = mode;
    return () => { delete document.body.dataset.creationShowcase; };
  }, [mode]);
  return <section className={styles.panel} id={`experience-${mode}`} role="tabpanel" aria-labelledby={`experience-tab-${mode}`}>
    {mode === "live" ? <LiveExperience /> : <WorldExperience />}
    <button type="button" className={styles.back} onClick={onBack}><ArrowLeft size={15} />返回创作</button>
  </section>;
}
