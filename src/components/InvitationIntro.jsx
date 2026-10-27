import { useEffect, useRef, useState } from 'react';
import './invitation-intro.css';

export function EnvelopeArt({ compact = false }) {
  return <div className={`lux-envelope ${compact ? 'lux-envelope--compact' : ''}`} aria-hidden="true">
    <div className="lux-envelope__aura" />
    <div className="lux-envelope__object">
      <div className="lux-envelope__back" />
      <div className="lux-envelope__hinge"><div className="lux-envelope__flap-front"/><div className="lux-envelope__flap-back"/></div>
      <div className="lux-envelope__paper"><span className="lux-paper__ornament">◇</span><span>Алтын мерейтой</span><strong>Құрметті<br/>қонақтар!</strong><i>Нұрман Нұғманұлы</i></div>
      <div className="lux-envelope__pocket"><svg viewBox="0 0 360 220" preserveAspectRatio="none"><defs><linearGradient id={compact ? 'pocket-small' : 'pocket-intro'} x2="0.8" y2="1"><stop stopColor="#24211b"/><stop offset=".5" stopColor="#100f0c"/><stop offset="1" stopColor="#1c1914"/></linearGradient></defs><path d="M0 0 180 123 360 0V220H0Z" fill={`url(#${compact ? 'pocket-small' : 'pocket-intro'})`} stroke="#b7974e" strokeOpacity=".65"/><path d="m0 220 148-110m212 110L212 110M9 18v192h342V18" fill="none" stroke="#b7974e" strokeOpacity=".3"/></svg></div>
      <div className="lux-envelope__seal"><span>50</span><small>МЕРЕЙТОЙ</small></div>
      <div className="lux-envelope__glint"/>
    </div>
    <div className="lux-envelope__shadow"/>
  </div>;
}

export default function InvitationIntro({ children, onComplete, onOpen, autoOpen = false }) {
  const [phase, setPhase] = useState('sealed');
  const stage = useRef(null);
  const button = useRef(null);
  const floating = useRef(null);
  const running = useRef(false);
  const animations = useRef([]);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    stage.current?.focus({ preventScroll: true });
    return () => {
      active.current = false;
      document.body.style.overflow = previousOverflow;
      animations.current.forEach(animation => animation.cancel());
    };
  }, []);

  useEffect(() => {
    // Only replay, explicitly requested by the user, may start on mounting.
    // A cancellable frame also survives React StrictMode's effect rehearsal.
    if (!autoOpen) return;
    const frame = requestAnimationFrame(() => open());
    return () => cancelAnimationFrame(frame);
  }, [autoOpen]);

  async function animate(node, frames, options) {
    const animation = node.animate(frames, { fill: 'forwards', ...options });
    animations.current.push(animation);
    await animation.finished;
    if (!active.current) throw new Error('unmounted');
  }

  async function open() {
    if (running.current) return;
    running.current = true;
    onOpen?.();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }
    setPhase('opening');
    const envelope = stage.current;
    try {
      // Seal releases, then the solid two-sided flap rotates around its top seam.
      await animate(envelope.querySelector('.lux-envelope__seal'), [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(12px) scale(.92)' },
      ], { duration: 240, easing: 'ease-in' });
      const hinge = envelope.querySelector('.lux-envelope__hinge');
      await animate(hinge, [{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(178deg)' }], { duration: 700, easing: 'cubic-bezier(.3,.05,.2,1)' });
      hinge.style.zIndex = '1';
      const paper = envelope.querySelector('.lux-envelope__paper');
      await animate(paper, [{ transform: 'translateY(0)' }, { transform: 'translateY(-64%)' }], { duration: 850, easing: 'cubic-bezier(.25,.1,.2,1)' });

      // Use the actual destination letter's dimensions, so the paper becomes
      // the existing invitation without a jump in size, typography or position.
      const source = paper.getBoundingClientRect();
      const target = document.querySelector('#invitation .letter');
      document.documentElement.classList.add('invitation-positioning');
      window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - Math.max(20, (window.innerHeight - target.offsetHeight) / 2)), behavior: 'instant' });
      const destination = target.getBoundingClientRect();
      const sheet = floating.current;
      Object.assign(sheet.style, { left: `${destination.left}px`, top: `${destination.top}px`, width: `${destination.width}px`, height: `${destination.height}px`, visibility: 'visible' });
      paper.style.visibility = 'hidden';
      setPhase('morphing');
      target.classList.add('visible');
      const morph = animate(sheet, [
        { transform: `translate(${source.left - destination.left}px, ${source.top - destination.top}px) scale(${source.width / destination.width}, ${source.height / destination.height})`, opacity: 1 },
        { transform: 'translate(0, 0) scale(1, 1)', opacity: 1 },
      ], { duration: 820, easing: 'cubic-bezier(.22,.65,.18,1)' });
      const fade = animate(stage.current.querySelector('.intro-atmosphere'), [{ opacity: 1 }, { opacity: 0 }], { duration: 650, delay: 100, easing: 'ease-in-out' });
      await Promise.all([morph, fade]);
      onComplete();
    } catch (error) {
      // Cancellation on unmount is expected. If animations are unavailable,
      // preserve access to the invitation after the user's explicit click.
      if (active.current) onComplete();
    }
  }

  return <div className={`invitation-intro intro-${phase}`} ref={stage} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="intro-title" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = [...stage.current.querySelectorAll('button:not([disabled])')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (document.activeElement === stage.current || (event.shiftKey && document.activeElement === first)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <div className="intro-atmosphere">
      <div className="intro-border" aria-hidden="true"/>
      <div className="intro-dust" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--dust-i': index, left: `${7 + (index * 31) % 87}%`, top: `${8 + (index * 23) % 82}%` }}/>)}</div>
      <div className="intro-heading"><span className="eyebrow">СІЗГЕ АРНАЛҒАН ЕРЕКШЕ ШАҚЫРУ</span><h2 id="intro-title">Алтын <em>мерейтой</em></h2><p>Нұрман Нұғманұлы</p></div>
      <button ref={button} className="intro-open" onClick={open} aria-label="Шақыруды ашу" aria-disabled={phase !== 'sealed'}>
        <EnvelopeArt/>
        <span className="intro-open__label">Шақыруды ашу <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></span>
        <span className="intro-open__hint">Алтын сәттің қадірлі қонағы болыңыз</span>
      </button>
      <span className="intro-date">05 · 12 · 2026</span>
    </div>
    <div className="intro-floating letter" ref={floating} aria-hidden="true">{children}</div>
    <span className="sr-only" role="status">{phase !== 'sealed' ? 'Шақыру ашылуда…' : ''}</span>
  </div>;
}
