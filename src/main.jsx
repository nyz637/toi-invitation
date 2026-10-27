import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { formsConfig } from './config/forms';
import { isConfigured, submitRsvp } from './lib/submitRsvp';
import './styles.css';
import InvitationIntro, { EnvelopeArt } from './components/InvitationIntro';
import EventDetails from './components/EventDetails';

function Ornament({ className = '' }) {
  return <svg className={`ornament ${className}`} viewBox="0 0 200 48" fill="none" aria-hidden="true"><path d="M0 24h48m104 0h48M58 24c-18-22 21-26 17-8-3 12-21 10-17 0m84 8c18-22-21-26-17-8 3 12 21 10 17 0M74 24l26-20 26 20-26 20-26-20Z"/><path d="m87 24 13-10 13 10-13 10-13-10Z"/><circle cx="100" cy="24" r="3"/></svg>;
}
function Arrow({ down = false }) { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={down ? 'arrow down' : 'arrow'}><path d="M4 12h15m-6-6 6 6-6 6"/></svg>; }
function Reveal({ children, className = '', ...props }) { return <div className={`reveal ${className}`} {...props}>{children}</div>; }

function Rsvp() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const feedback = useRef(null);
  const busy = status === 'sending';
  const configured = isConfigured(formsConfig);
  useEffect(() => { if (['success', 'demo', 'unverified', 'error'].includes(status)) feedback.current?.focus(); }, [status]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    if (!name) { setError('Аты-жөніңізді жазыңыз.'); event.currentTarget.elements.name.focus(); return; }
    setError(''); setStatus('sending');
    try { const result = await submitRsvp({ name, attendance: data.get('attendance'), wish: String(data.get('wish')).trim() }, formsConfig); setStatus(result.status); }
    catch { setStatus('error'); }
  }
  return <section className="rsvp section" id="rsvp" aria-labelledby="rsvp-title"><Reveal className="rsvp-layout"><div className="rsvp-intro"><span className="eyebrow">БІРГЕ ӨТКІЗЕР ҚУАНЫШ</span><h2 id="rsvp-title">Қатысуыңызды<br/><em>растаңыз</em></h2><div className="short-line"/><p>Мерейтойға келетіндігіңізді алдын ала білдіруіңізді сұраймыз.</p><Ornament/></div><div className="form-panel">{status === 'success' ? <div className="thank-you" role="status" tabIndex="-1" ref={feedback}><div className="success-ring"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="m12 25 8 8 17-19"/></svg></div><Ornament/><h3>Рақмет!</h3><p>Жауабыңыз қабылданды.</p></div> : <form onSubmit={submit}><div className="form-topline"><span>ҚОНАҚ ЖАУАБЫ</span><span>01 — 03</span></div><label htmlFor="guest-name">Аты-жөніңіз <span aria-hidden="true">*</span></label><input id="guest-name" name="name" required maxLength="120" autoComplete="name" placeholder="Есіміңіз бен тегіңіз" aria-describedby={error ? 'name-error' : undefined} aria-invalid={!!error}/>{error && <p id="name-error" className="field-error">{error}</p>}<fieldset><legend>Мерейтойға қатысасыз ба?</legend><div className="radio-row"><label className="radio-choice"><input type="radio" name="attendance" value="Қатысамын" required defaultChecked/><span className="radio-dot"/>Қатысамын</label><label className="radio-choice"><input type="radio" name="attendance" value="Қатыса алмаймын"/><span className="radio-dot"/>Қатыса алмаймын</label></div></fieldset><label htmlFor="guest-wish">Ізгі тілегіңіз <span className="optional">/ міндетті емес</span></label><textarea id="guest-wish" name="wish" maxLength="2000" rows="3" placeholder="Жүректен шыққан ақ тілегіңіз…"/><button className="gold-button submit-button" disabled={busy} type="submit">{busy ? 'Жіберілуде…' : 'Жауапты жіберу'}<Arrow/></button>{!configured && <p className="demo-note">Көрсетілім режимі · Жауаптарды қабылдау әлі қосылмаған. Деректер жіберілмейді.</p>}<div className={`form-feedback ${status === 'error' ? 'field-error' : ''}`} role="status" aria-live="polite" tabIndex="-1" ref={feedback}>{status === 'demo' && 'Бұл — көрсетілім режимі. Жауабыңыз жіберілген жоқ.'}{status === 'unverified' && 'Жіберу әрекеті орындалды, бірақ жауаптың сақталғанын растау мүмкін болмады.'}{status === 'error' && 'Жауаптың сақталғанын растау мүмкін болмады. Интернет байланысын тексеріп, кейінірек қайталап көріңіз.'}</div></form>}</div></Reveal></section>;
}

function InvitationLetter({ headingId }) {
  return <><div className="letter-border" aria-hidden="true"/><span className="eyebrow">АҚ НИЕТПЕН ШАҚЫРАМЫЗ</span><Ornament/><h2 id={headingId} tabIndex={headingId ? -1 : undefined}>Құрметті<br/><em>қонақтар!</em></h2><p>Сіз(дер)ді <strong>Нұрман Нұғманұлының</strong><br className="desktop-break"/> 50 жас мерейтойына арналған<br className="desktop-break"/> ақ дастарханымыздың қадірлі қонағы<br className="desktop-break"/> болуға шақырамыз!</p><Ornament/><span className="letter-signature">Ізгі ниетпен, отбасы</span></>;
}

function App() {
  const [opened, setOpened] = useState(false);
  const [replaying, setReplaying] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(node => observer.observe(node));
    return () => { observer.disconnect(); document.documentElement.classList.remove('invitation-positioning'); };
  }, []);
  useEffect(() => {
    if (!opened) return;
    const target = document.getElementById('letter-title');
    if (!document.documentElement.classList.contains('invitation-positioning')) {
      target.closest('section').scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    document.documentElement.classList.remove('invitation-positioning');
    target.focus({ preventScroll: true });
  }, [opened]);
  function replayInvitation() { setReplaying(true); setOpened(false); }
  return <>{!opened && <InvitationIntro autoOpen={replaying} onComplete={() => setOpened(true)}><InvitationLetter/></InvitationIntro>}<div className="invitation-site" inert={!opened ? true : undefined}><a className="skip-link" href="#invitation">Шақыру мәтініне өту</a><header className="site-header"><a className="brand" href="#home" aria-label="Алтын мерейтой — басты бет"><span className="brand-mark">Н</span><span>АЛТЫН МЕРЕЙТОЙ</span></a><a className="header-date" href="#date">05 <span>/</span> 12 <span>/</span> 2026</a></header><main><section className="hero" id="home" aria-labelledby="hero-title"><div className="hero-frame" aria-hidden="true"/><div className="particles" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} style={{ '--i': i, left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 13) % 95}%` }}/>)}</div><div className="hero-content"><div className="hero-kicker"><span/> ӨМІРДІҢ АЛТЫН БЕЛЕСІ <span/></div><h1 id="hero-title"><span className="hero-number">50<span className="years">ЖАС</span></span><span className="hero-title">МЕРЕЙТОЙ</span></h1><p className="hero-name">Нұрман Нұғманұлы</p><EnvelopeArt compact/><button onClick={replayInvitation} className="gold-button open-button" aria-controls="invitation">Қайта ашу<Arrow/></button><p className="hero-caption">Сізге арналған ерекше шақыру</p></div><a href="#invitation" className="scroll-cue"><span>ТӨМЕН ҚАРАЙ</span><Arrow down/></a><span className="hero-side" aria-hidden="true">АЛТЫН МЕРЕЙТОЙ · 2026</span></section><section className="letter-section section" id="invitation" aria-labelledby="letter-title"><Reveal className="letter"><InvitationLetter headingId="letter-title"/></Reveal></section><section className="honoree section" aria-labelledby="honoree-title"><Reveal><span className="eyebrow">ЕЛУ ЖАС — ЕРДІҢ АСҚАР БЕЛЕСІ</span><div className="anniversary-medallion" aria-hidden="true"><div className="medallion-ring"/><Ornament className="medallion-top"/><span>50</span><small>АЛТЫН ЖАС</small><Ornament className="medallion-bottom"/></div><h2 id="honoree-title">Нұрман<br/><em>Нұғманұлы</em></h2><p className="honoree-caption">50 жас</p><div className="gold-divider"><span/>✧<span/></div></Reveal></section><section className="date-section section" id="date" aria-labelledby="date-title"><Reveal className="date-layout"><div><span className="eyebrow">ҚУАНЫШТЫ КҮН</span><h2 id="date-title">Жүздесетін<br/><em>күніміз</em></h2></div><div className="date-card"><div className="date-main"><span className="date-day">05</span><div><span className="date-month">желтоқсан</span><span className="date-year">2026 ЖЫЛ</span></div></div><div className="date-details"><span>СЕНБІ</span><span className="date-details-line"/><time dateTime="2026-12-05T18:00:00+05:00">Сағат <strong>18:00</strong></time></div></div></Reveal></section><EventDetails/><Rsvp/><section className="closing section"><Reveal><Ornament/><span className="eyebrow">АҚ ДАСТАРХАН БАСЫНДА ЖҮЗДЕСКЕНШЕ</span><h2>Келуіңіз біз үшін<br/><em>үлкен қуаныш!</em></h2><div className="short-line"/><p>Ізгі ниетпен,<br/><span>Нұрман Нұғманұлының отбасы</span></p><a href="#home" className="closing-seal" aria-label="Басты бетке оралу">Н<span>50</span></a></Reveal></section></main><footer><span>АЛТЫН МЕРЕЙТОЙ</span><span>05.12.2026</span></footer></div></>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
