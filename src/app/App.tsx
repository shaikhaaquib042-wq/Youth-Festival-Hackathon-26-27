import { useEffect, useRef, useState } from 'react';
import PhoneFrame from '../components/PhoneFrame';
import WhatsappPanel from '../components/WhatsappPanel';
import SatyaPanel from '../components/SatyaPanel';
import QuickAction from '../components/QuickAction';
import { Accessibility, ArrowDown, ArrowRight, Check, ClipboardPaste, Info, MessageCircle, Minus, Plus, RotateCcw, ShieldCheck, Volume2, X } from 'lucide-react';
import { usePreferences, t } from './preferences';
import { speak } from '../services/speech';

const features = [
  { icon: '⌕', title: 'featureClaims', text: 'featureClaimsBody' },
  { icon: '◎', title: 'featureEvidence', text: 'featureEvidenceBody' },
  { icon: '文', title: 'featureLanguages', text: 'featureLanguagesBody' },
  { icon: '▤', title: 'featureReport', text: 'featureReportBody' },
  { icon: '⚑', title: 'featureWarnings', text: 'featureWarningsBody' },
  { icon: '↗', title: 'featurePause', text: 'featurePauseBody' },
];

const verdicts = ['VERIFIED', 'FALSE', 'MISLEADING', 'UNVERIFIED', 'CONFLICTING'];

export default function App() {
  const { language, setLanguage, accessibility, updateAccessibility, resetAccessibility } = usePreferences();
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(() => localStorage.getItem('satya-welcome-dismissed') !== 'yes');
  const [welcomeAudioError, setWelcomeAudioError] = useState('');
  const accessibilityTrigger = useRef<HTMLButtonElement>(null);
  const welcomeStart = useRef<HTMLButtonElement>(null);
  const welcomeLanguage = useRef<HTMLSelectElement>(null);
  const accessibilityClose = useRef<HTMLButtonElement>(null);
  const text = (key: string) => t(key, language);

  useEffect(() => {
    if (welcomeOpen) welcomeLanguage.current?.focus();
    else if (accessibilityOpen) accessibilityClose.current?.focus();
  }, [welcomeOpen, accessibilityOpen]);

  useEffect(() => {
    if (!welcomeOpen && !accessibilityOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (welcomeOpen) dismissWelcome();
        else {
          setAccessibilityOpen(false);
          accessibilityTrigger.current?.focus();
        }
        return;
      }
      if (!welcomeOpen || event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('.welcome-card');
      const items = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select:not([disabled]), input:not([disabled])')) : [];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [welcomeOpen, accessibilityOpen]);

  function dismissWelcome(destination?: string) {
    localStorage.setItem('satya-welcome-dismissed', 'yes');
    setWelcomeOpen(false);
    if (destination) {
      window.setTimeout(() => document.getElementById(destination)?.scrollIntoView({ behavior: accessibility.reduceMotion ? 'instant' : 'smooth' }), 50);
    }
  }

  function reset() {
    window.dispatchEvent(new CustomEvent('satya:reset'));
    document.getElementById('try-demo')?.scrollIntoView({ behavior: accessibility.reduceMotion ? 'instant' : 'smooth', block: 'start' });
  }

  async function listenToIntro() {
    setWelcomeAudioError('');
    try {
      await speak(text('heroDescription'), language);
    } catch (error) {
      setWelcomeAudioError(error instanceof Error ? error.message : text('audioUnavailable'));
    }
  }

  function focusMessageInput() {
    document.getElementById('try-demo')?.scrollIntoView({ behavior: accessibility.reduceMotion ? 'instant' : 'smooth', block: 'start' });
    window.setTimeout(() => document.getElementById('message')?.focus(), accessibility.reduceMotion ? 0 : 450);
  }

  return <div className={`site-shell${accessibility.highContrast ? ' high-contrast' : ''}${accessibility.reduceMotion ? ' reduce-motion' : ''}${accessibility.simpleLanguage ? ' simple-language' : ''}`}>
    <header className="site-nav" inert={welcomeOpen}>
      <a className="site-brand" href="#home" aria-label={text('appName')}>
        <span className="site-logo">S</span>
        <span>SATYAM <b>AI</b></span>
      </a>
      <nav aria-label={text('menuLabel')}>
        <a href="#how">{text('how')}</a>
        <a href="#features">{text('features')}</a>
        <a href="#floating">{text('floating')}</a>
        <a href="#technology">{text('technology')}</a>
        <a className="nav-demo-link" href="#try-demo">{text('tryDemo')}</a>
      </nav>
      <div className="site-tools">
        <label className="site-language"><span className="sr-only">{text('language')}</span><select aria-label={text('language')} value={language} onChange={event => setLanguage(event.target.value as typeof language)}><option value="English">English</option><option value="Hindi">हिंदी</option><option value="Marathi">मराठी</option></select></label>
        <button ref={accessibilityTrigger} className="accessibility-trigger" aria-expanded={accessibilityOpen} aria-controls="accessibility-panel" onClick={() => setAccessibilityOpen(open => !open)}><Accessibility size={20} /><span>{text('accessibility')}</span></button>
      </div>
    </header>

    <main inert={welcomeOpen}>
      <section className="site-hero site-wrap" id="home">
        <div className="hero-copy">
          <div className="site-eyebrow">{text('heroEyebrow')}</div>
          <h1>{text('heroFirst')}<br /><span>{text('heroSecond')}</span></h1>
          <p>{text('heroDescription')}</p>
          <div className="hero-actions">
            <a className="site-button" href="#try-demo">{text('launchDemo')} <ArrowRight size={17} /></a>
            <a className="site-button secondary" href="#how">{text('explore')} <ArrowDown size={16} /></a>
          </div>
          <div className="quick-actions" role="group" aria-label={text('howTitle')}>
            <QuickAction icon={MessageCircle} title={text('actionWhatsApp')} description={text('actionWhatsAppHint')} onClick={() => document.getElementById('try-demo')?.scrollIntoView({ behavior: accessibility.reduceMotion ? 'instant' : 'smooth', block: 'start' })} />
            <QuickAction icon={ClipboardPaste} title={text('actionCopied')} description={text('actionCopiedHint')} onClick={focusMessageInput} />
            <QuickAction icon={Volume2} title={text('actionListen')} description={text('actionListenHint')} onClick={listenToIntro} />
          </div>
          {welcomeAudioError && <p className="inline-audio-error" role="status">{welcomeAudioError}</p>}
          <p className="hero-caption">SATYAM helps you pause and check · English · हिंदी · मराठी</p>
        </div>
        <div className="hero-showcase" aria-label="SATYAM AI product overview">
          <div className="showcase-top"><span>THE SATYAM APPROACH</span><span className="showcase-dot">● USER-LED CHECK</span></div>
          <div className="showcase-message">
            <span className="showcase-icon">↗</span>
            <div><small>A FORWARDED MESSAGE</small><strong>“Is this genuine? Has anyone checked?”</strong></div>
          </div>
          <div className="showcase-steps"><span>01&nbsp; Select a claim</span><i /><span>02&nbsp; Review evidence</span><i /><span>03&nbsp; Decide carefully</span></div>
          <div className="showcase-disclosure"><ShieldCheck size={18} /><span><b>Evidence before conclusions</b><small>No match? The claim remains UNVERIFIED.</small></span></div>
          <div className="showcase-categories">{verdicts.map(v => <span key={v}>{v}</span>)}</div>
        </div>
      </section>

      <section className="site-section" id="how">
        <div className="site-wrap">
          <div className="section-heading"><div className="site-eyebrow">{text('how')}</div><h2>{text('howTitle')}</h2><p>{text('howDescription')}</p></div>
          <div className="site-steps">
            <article className="site-card"><span className="site-number">01</span><h3>{text('stepChoose')}</h3><p>{text('stepChooseBody')}</p></article>
            <article className="site-card"><span className="site-number">02</span><h3>{text('stepLanguage')}</h3><p>{text('stepLanguageBody')}</p></article>
            <article className="site-card"><span className="site-number">03</span><h3>{text('stepCheck')}</h3><p>{text('stepCheckBody')}</p></article>
          </div>
        </div>
      </section>

      <section className="site-section" id="features">
        <div className="site-wrap">
          <div className="section-heading"><div className="site-eyebrow">{text('features')}</div><h2>{text('featureTitle')}</h2></div>
          <div className="site-feature-grid">{features.map(feature => <article className="site-card feature-card" key={feature.title}><div className="site-feature-icon">{feature.icon}</div><h3>{text(feature.title)}</h3><p>{text(feature.text)}</p></article>)}</div>
        </div>
      </section>

      <section className="site-section demo-section" id="try-demo">
        <div className="site-wrap">
          <div className="section-heading"><div className="site-eyebrow">{text('tryDemo')}</div><h2>{text('demoTitle')}</h2><p>{text('demoDescription')}</p></div>
          <div className="two-phones">
            <div className="frame-column">
              <div className="panel-heading"><div><h2>{text('phoneOne')}</h2><p>{text('chooseSample')}</p></div></div>
              <PhoneFrame title={`${text('familyTitle')} 👨‍👩‍👧‍👦`} subtitle={text('groupOnline')} className="whatsapp-phone" language={language}><WhatsappPanel language={language} /></PhoneFrame>
            </div>
            <div className="frame-column">
              <div className="panel-heading"><div><h2>{text('phoneTwo')}</h2><p>{text('stepCheckBody')}</p></div></div>
              <PhoneFrame title="SATYAM AI" subtitle={text('heroEyebrow')} className="satya-phone" language={language}><SatyaPanel language={language} onLanguageChange={setLanguage} /></PhoneFrame>
            </div>
          </div>
          <div className="demo-controls"><p><Info size={18} /><span>{text('demoDisclaimer')}</span></p><button className="site-button secondary" onClick={reset}><RotateCcw size={17} />{text('resetDemo')}</button></div>
        </div>
      </section>

      <section className="site-section" id="floating">
        <div className="site-wrap">
          <div className="concept-band">
            <div><div className="site-eyebrow">{text('floating')}</div><h2>{text('floatingTitle')}</h2><p>{text('floatingBody')}</p><p>{text('floatingBoundary')}</p></div>
            <div className="concept-browser"><div className="concept-browser-bar">● ● ● &nbsp; example-news-feed.com</div><div className="concept-browser-content"><b>{text('examplePost')}</b><h3>{text('examplePostTitle')}</h3><p>{text('examplePostBody')}</p><span className="concept-highlight">{text('futureAssistant')}</span><div className="concept-review"><ShieldCheck size={16} /> {text('userLedReview')}</div></div></div>
          </div>
          <div className="site-notice">{text('floatingBoundary')}</div>
        </div>
      </section>

      <section className="site-section" id="technology">
        <div className="site-wrap">
          <div className="section-heading"><div className="site-eyebrow">{text('technology')}</div><h2>{text('technologyTitle')}</h2><p>{text('technologyDescription')}</p></div>
          <div className="site-steps technology-steps">
            <article className="site-card"><span className="site-number">01</span><h3>{text('technologyInput')}</h3><p>{text('technologyInputBody')}</p></article>
            <article className="site-card"><span className="site-number">02</span><h3>{text('technologyUnderstand')}</h3><p>{text('technologyUnderstandBody')}</p></article>
            <article className="site-card"><span className="site-number">03</span><h3>{text('technologyMatch')}</h3><p>{text('technologyMatchBody')}</p></article>
            <article className="site-card"><span className="site-number">04</span><h3>{text('technologyResult')}</h3><p>{text('technologyResultBody')}</p></article>
          </div>
          <div className="verdict-legend" aria-label={text('verdictLegend')}>{verdicts.map(verdict => <span className={`legend-${verdict.toLowerCase()}`} key={verdict}>{verdict}</span>)}</div>
        </div>
      </section>

      <section className="site-section privacy-section" id="privacy">
        <div className="site-wrap">
          <div className="section-heading"><div className="site-eyebrow">{text('privacyTitle')}</div><h2>{text('privacyTitle')}</h2></div>
          <div className="privacy-grid">
            <article className="site-card"><h3>{text('privacyLocal')}</h3><p>{text('privacyLocalBody')}</p></article>
            <article className="site-card"><h3>{text('privacyWhatsApp')}</h3><p>{text('privacyWhatsAppBody')}</p></article>
            <article className="site-card"><h3>{text('privacyNoLive')}</h3><p>{text('privacyNoLiveBody')}</p></article>
            <article className="site-card"><h3>{text('privacyNoEvidence')}</h3><p>{text('privacyNoEvidenceBody')}</p></article>
          </div>
          <div className="site-notice">{text('privacyNote')}</div>
        </div>
      </section>
    </main>

    <footer className="site-footer" inert={welcomeOpen}><div className="site-wrap"><a className="site-brand" href="#home"><span className="site-logo">S</span><span>SATYAM <b>AI</b></span></a><span>{text('footerTag')}</span><a href="#try-demo">{text('tryDemo')} ↑</a></div></footer>

    {accessibilityOpen && <div className="accessibility-popover" id="accessibility-panel" role="dialog" aria-modal="false" aria-labelledby="accessibility-title">
      <div className="accessibility-heading"><h2 id="accessibility-title">{text('accessibility')}</h2><button ref={accessibilityClose} aria-label={text('close')} onClick={() => { setAccessibilityOpen(false); accessibilityTrigger.current?.focus(); }}><X size={20} /></button></div>
      <div className="text-size-control"><span>{text('textSize')}</span><div><button aria-label={text('accessDecrease')} disabled={accessibility.textScale <= 1} onClick={() => updateAccessibility({ textScale: Math.max(1, accessibility.textScale - 0.1) })}><Minus /></button><strong>{Math.round(accessibility.textScale * 100)}%</strong><button aria-label={text('accessIncrease')} disabled={accessibility.textScale >= 1.5} onClick={() => updateAccessibility({ textScale: Math.min(1.5, accessibility.textScale + 0.1) })}><Plus /></button></div></div>
      <label className="access-toggle"><input type="checkbox" checked={accessibility.highContrast} onChange={event => updateAccessibility({ highContrast: event.target.checked })} /><span>{text('highContrast')}</span></label>
      <label className="access-toggle"><input type="checkbox" checked={accessibility.reduceMotion} onChange={event => updateAccessibility({ reduceMotion: event.target.checked })} /><span>{text('reduceMotion')}</span></label>
      <label className="access-toggle"><input type="checkbox" checked={accessibility.simpleLanguage} onChange={event => updateAccessibility({ simpleLanguage: event.target.checked })} /><span>{text('simpleLanguage')}</span></label>
      <button className="access-reset" onClick={resetAccessibility}>{text('resetAccess')}</button>
    </div>}

    {welcomeOpen && <div className="welcome-overlay" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="welcome-card">
        <div className="welcome-icon"><ShieldCheck size={30} /></div>
        <h2 id="welcome-title">{text('welcome')}</h2>
        <label className="welcome-language">{text('language')}<select ref={welcomeLanguage} value={language} onChange={event => setLanguage(event.target.value as typeof language)}><option value="English">English</option><option value="Hindi">हिंदी</option><option value="Marathi">मराठी</option></select></label>
        <h3>{text('welcomeQuestion')}</h3>
        <p>{text('welcomeHelp')}</p>
        <div className="welcome-actions">
          <button ref={welcomeStart} className="site-button" onClick={() => dismissWelcome('try-demo')}>{text('startChecking')}</button>
          <button className="site-button secondary" onClick={() => dismissWelcome('how')}>{text('showHow')}</button>
        </div>
        <button className="welcome-skip" onClick={() => dismissWelcome()}>{text('skip')}</button>
      </div>
    </div>}
  </div>;
}
