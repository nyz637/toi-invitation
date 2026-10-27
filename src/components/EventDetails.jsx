import { useEffect, useState } from 'react';
import { eventConfig } from '../config/event';
import { getCountdown } from '../lib/countdown';
import './event-details.css';

function MapPin() {
  return <svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M34 18c0 11-14 24-14 24S6 29 6 18a14 14 0 1 1 28 0Z"/><circle cx="20" cy="18" r="5"/><path d="M12 43c-5 1-8 2-8 3h32c0-1-3-2-8-3"/></svg>;
}

function Countdown() {
  const [remaining, setRemaining] = useState(getCountdown);

  useEffect(() => {
    function update() { setRemaining(getCountdown()); }
    if (remaining.started) return;
    // Always derive from the absolute timestamp: delayed background ticks
    // and the visitor's local timezone cannot accumulate countdown drift.
    const interval = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, [remaining.started]);

  const units = [
    ['days', 'Күн'],
    ['hours', 'Сағат'],
    ['minutes', 'Минут'],
    ['seconds', 'Секунд'],
  ];

  return <section className="countdown-section section" id="countdown" aria-labelledby="countdown-title">
    <div className="countdown-content reveal">
      <span className="eyebrow">МЕРЕЙЛІ СӘТ ЖАҚЫНДАП КЕЛЕДІ</span>
      <h2 id="countdown-title">Мерейтойға <em>дейін</em></h2>
      {remaining.started
        ? <p className="countdown-started" role="status">Мерейтой басталды!</p>
        : <div className="countdown-grid" role="timer" aria-live="off" aria-label="Мерейтойға қалған уақыт">
          {units.map(([key, label]) => <div className="countdown-unit" key={key}>
            <span className="countdown-number" key={remaining[key]}>{String(remaining[key]).padStart(2, '0')}</span>
            <span className="countdown-label">{label}</span>
          </div>)}
        </div>}
      <p className="countdown-date"><time dateTime={eventConfig.startsAt}>5 желтоқсан 2026 · 18:00</time><span>Орал уақыты · UTC+5</span></p>
    </div>
  </section>;
}

export default function EventDetails() {
  return <>
    <section className="venue-section section" id="venue" aria-labelledby="venue-title">
      <div className="venue-layout reveal">
        <div className="venue-heading">
          <span className="eyebrow">АҚ ДАСТАРХАН БАСЫНДА</span>
          <h2 id="venue-title">Өтетін <em>орны</em></h2>
          <div className="short-line"/>
          <span className="venue-ornament" aria-hidden="true">◇</span>
        </div>
        <div className="venue-card">
          <div className="venue-card-top"><MapPin/><span>ОРАЛ ҚАЛАСЫ</span><span className="venue-card-line"/></div>
          <h3 className="venue-name">Symbat <span>мейрамханасы</span></h3>
          <address>{eventConfig.address}</address>
          <a className="gold-button venue-map" href={eventConfig.mapUrl} target="_blank" rel="noopener noreferrer">2ГИС арқылы жолды көру<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg><span className="sr-only"> — жаңа қойындыда ашылады</span></a>
        </div>
      </div>
    </section>
    <Countdown/>
  </>;
}
