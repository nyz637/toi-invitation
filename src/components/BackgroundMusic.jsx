import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './background-music.css';

const TARGET_VOLUME = 0.3;
const FADE_SECONDS = 1.8;

const BackgroundMusic = forwardRef(function BackgroundMusic({ introOpen }, ref) {
  const audio = useRef(null);
  const graph = useRef(null);
  const userMuted = useRef(false);
  const wanted = useRef(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const frame = useRef(null);
  const mounted = useRef(false);
  const [status, setStatus] = useState('idle');
  const [portal, setPortal] = useState(null);

  useLayoutEffect(() => {
    setPortal(introOpen ? document.querySelector('.invitation-intro') : document.body);
  }, [introOpen]);

  useEffect(() => {
    mounted.current = true;
    const element = audio.current;
    return () => {
      mounted.current = false;
      generation.current++;
      wanted.current = false;
      pending.current = false;
      cancelAnimationFrame(frame.current);
      element?.pause();
      // React immediately mounts effects again during StrictMode rehearsal.
      // Close resources only on a real unmount, without creating another graph.
      queueMicrotask(() => {
        if (mounted.current || !graph.current) return;
        graph.current.source.disconnect();
        graph.current.gain.disconnect();
        graph.current.context.close().catch(() => {});
        graph.current = null;
      });
    };
  }, []);

  function stop() {
    generation.current++;
    pending.current = false;
    wanted.current = false;
    cancelAnimationFrame(frame.current);
    if (graph.current) {
      const { context, gain } = graph.current;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
    }
    audio.current?.pause();
    setStatus('paused');
  }

  function fail(error) {
    stop();
    setStatus(error?.name === 'NotAllowedError' ? 'blocked' : 'unavailable');
  }

  function prepareAudio() {
    const element = audio.current;
    if (!graph.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        // Web Audio gain also works where iOS ignores HTMLMediaElement.volume.
        const context = new AudioContext();
        const gain = context.createGain();
        gain.gain.value = 0;
        const source = context.createMediaElementSource(element);
        source.connect(gain);
        gain.connect(context.destination);
        graph.current = { context, gain, source };
      }
    }
    if (graph.current) {
      const { context, gain } = graph.current;
      element.volume = 1;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      return context.resume();
    }
    element.volume = 0;
    return Promise.resolve();
  }

  function fadeIn() {
    if (!wanted.current || !audio.current || audio.current.paused) return;
    if (graph.current) {
      const { context, gain } = graph.current;
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(TARGET_VOLUME, context.currentTime + FADE_SECONDS);
    } else {
      const started = performance.now();
      const tick = now => {
        if (!wanted.current || !audio.current) return;
        const progress = Math.min(1, (now - started) / (FADE_SECONDS * 1000));
        audio.current.volume = TARGET_VOLUME * progress;
        if (progress < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    }
  }

  function startFromGesture() {
    if (userMuted.current || pending.current || (wanted.current && !audio.current?.paused)) return;
    const element = audio.current;
    if (!element) return;
    const attempt = ++generation.current;
    wanted.current = true;
    pending.current = true;
    setStatus('loading');
    try {
      // Both calls happen synchronously within the original click, before any
      // animation awaits: mobile browsers retain the user's audio permission.
      if (element.error) element.load();
      const resumed = prepareAudio();
      const played = element.play();
      Promise.all([resumed, played]).then(() => {
        if (attempt !== generation.current || !wanted.current) return;
        pending.current = false;
        setStatus('playing');
        fadeIn();
      }).catch(error => {
        if (attempt === generation.current) fail(error);
      });
    } catch (error) { fail(error); }
  }

  function startOnOpen() {
    userMuted.current = false;
    if (audio.current) audio.current.muted = false;
    startFromGesture();
  }

  useImperativeHandle(ref, () => ({ startOnOpen }));

  function toggle() {
    if (wanted.current) {
      userMuted.current = true;
      stop();
    } else {
      userMuted.current = false;
      startFromGesture();
    }
  }

  const enabled = status === 'playing' || status === 'loading';
  const message = status === 'blocked'
    ? 'Музыканы қосу үшін батырманы қайта басыңыз.'
    : status === 'unavailable' ? 'Музыка қолжетімсіз. Шақыруды музыкасыз көруге болады.' : '';
  const label = enabled ? 'Музыканы өшіру' : 'Музыканы қосу';
  const controls = <div className="music-control" data-state={status}>
    {message && <p className="music-message" id="music-message" role="status">{message}</p>}
    <button className="music-button" type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={enabled} aria-describedby={message ? 'music-message' : undefined} onKeyDown={event => {
      if (introOpen && event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); document.querySelector('.intro-open')?.focus(); }
    }}>
      <svg className="music-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 17V5l11-2v12M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>{!enabled && <path className="music-slash" d="m3 3 18 18"/>}</svg>
      <span className="music-waves" aria-hidden="true"><i/><i/><i/></span>
    </button>
  </div>;

  return <>
    <audio ref={audio} src={`${import.meta.env.BASE_URL}music.mp3`} preload="none" loop playsInline hidden
      onError={() => fail(audio.current?.error)}
      onPause={() => { if (!pending.current) { wanted.current = false; setStatus(current => ['unavailable', 'blocked'].includes(current) ? current : 'paused'); } }}
    />
    {portal && createPortal(controls, portal)}
  </>;
});

export default BackgroundMusic;
