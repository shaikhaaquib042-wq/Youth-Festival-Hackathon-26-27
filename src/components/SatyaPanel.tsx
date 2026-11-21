import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, LoaderCircle, PencilLine, ShieldCheck, Sparkles } from 'lucide-react';
import type { Language, VerificationReport } from '../app/types';
import { t, usePreferences } from '../app/preferences';
import { detectLanguage, verifyMessage } from '../core/verification';
import VerificationReportView from './VerificationReport';

const languages: Language[] = ['English', 'Hindi', 'Marathi'];

export default function SatyaPanel({ language, onLanguageChange }: { language: Language; onLanguageChange: (language: Language) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const verificationId = useRef(0);
  const { accessibility } = usePreferences();
  const label = (key: string) => t(key, language);
  const scrollBehavior = accessibility.reduceMotion ? 'instant' : 'smooth';

  useEffect(() => {
    const receive = (event: Event) => {
      const value = (event as CustomEvent<{ text: string }>).detail?.text;
      if (value) {
        verificationId.current += 1;
        setLoading(false);
        setText(value);
        setError('');
        setReport(null);
        setReady(true);
      }
    };
    const reset = () => {
      verificationId.current += 1;
      setText('');
      setError('');
      setReport(null);
      setLoading(false);
      setReady(false);
    };
    window.addEventListener('satya:paste', receive);
    window.addEventListener('satya:reset', reset);
    return () => {
      window.removeEventListener('satya:paste', receive);
      window.removeEventListener('satya:reset', reset);
    };
  }, []);

  useEffect(() => {
    setReport(current => current ? verifyMessage(current.input, language) : current);
  }, [language]);

  async function paste() {
    try {
      const value = await navigator.clipboard.readText();
      if (!value.trim()) {
        setError(label('emptyError'));
        return;
      }
      verificationId.current += 1;
      setLoading(false);
      setText(value);
      setReady(true);
      setError('');
      setReport(null);
    } catch {
      setError(label('pasteError'));
      inputRef.current?.focus();
    }
  }

  function chooseSample() {
    window.dispatchEvent(new CustomEvent('satya:open-samples'));
    document.querySelector<HTMLButtonElement>('.sample-select')?.scrollIntoView({
      behavior: scrollBehavior,
      block: 'center',
    });
  }

  function typeMessage() {
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
  }

  function clear() {
    verificationId.current += 1;
    setText('');
    setReport(null);
    setError('');
    setReady(false);
    setLoading(false);
    inputRef.current?.focus();
  }

  async function verify() {
    if (!text.trim()) {
      setError(label('emptyError'));
      inputRef.current?.focus();
      return;
    }
    if (text.trim().length < 12) {
      setError(label('shortError'));
      inputRef.current?.focus();
      return;
    }
    setError('');
    const runId = ++verificationId.current;
    setLoading(true);
    setReport(null);
    await new Promise(resolve => window.setTimeout(resolve, 750));
    if (verificationId.current !== runId) return;
    setReport(verifyMessage(text, language));
    setLoading(false);
  }

  function changeReportLanguage(value: Language) {
    onLanguageChange(value);
  }

  return <>
    {report ? <VerificationReportView report={report} language={language} onLanguage={changeReportLanguage} onBack={() => setReport(null)} /> :
      <div className="satya-home">
        <div className="satya-intro"><div className="satya-mark" aria-hidden="true">S</div><div><span className="mini-eyebrow">{label('appName')}</span><h2>{label('demoTitle')}</h2><p>{label('demoDescription')}</p></div></div>
        <section className="guided-step" aria-labelledby="message-step-title">
          <h3 id="message-step-title">{label('enterMessageStep')}</h3>
          <div className="guided-actions">
            <button type="button" className="guided-action" onClick={paste}><ClipboardPaste aria-hidden="true" /><span>{label('paste')}</span></button>
            <button type="button" className="guided-action" onClick={chooseSample}><Sparkles aria-hidden="true" /><span>{label('chooseSample')}</span></button>
            <button type="button" className="guided-action" onClick={typeMessage}><PencilLine aria-hidden="true" /><span>{label('type')}</span></button>
          </div>
          <p className="simple-help">{label('pasteMessage')} <button type="button" className="inline-button" onClick={typeMessage}>{label('typeMessage')}</button></p>
        </section>
        <label className="input-label" htmlFor="message"><span>{label('messageLabel')}</span><span>{text.length} {label('characters')}</span></label>
        <textarea ref={inputRef} id="message" value={text} onChange={event => { verificationId.current += 1; setLoading(false); setText(event.target.value); setError(''); setReady(false); setReport(null); }} placeholder={label('pastePlaceholder')} aria-describedby="message-language message-help" />
        <div className="input-actions"><button className="secondary-button phone-action" onClick={paste}><ClipboardPaste size={18} />{label('paste')}</button><button className="secondary-button phone-action" onClick={clear}>{label('clear')}</button></div>
        <p id="message-help" className="simple-help">{label('stepChooseBody')}</p>
        <section className="guided-step language-step" aria-labelledby="language-step-title">
          <h3 id="language-step-title">{label('chooseOutputLanguage')}</h3>
          <p>{label('selectLanguage')}</p>
          <div className="language-buttons" role="group" aria-label={label('language')}>
            {languages.map(value => <button key={value} type="button" aria-pressed={language === value} className={language === value ? 'selected' : ''} onClick={() => onLanguageChange(value)}>{value === 'Hindi' ? 'हिंदी' : value === 'Marathi' ? 'मराठी' : 'English'}</button>)}
          </div>
          <p id="message-language" className="detected-language">{label('detectedMessageLanguage')}: {text.trim() ? label(detectLanguage(text).toLowerCase()) : '—'}</p>
        </section>
        {ready && <p className="ready-message" role="status"><ShieldCheck size={20} />{label('readyMessage')}</p>}
        {error && <div className="error-box" role="alert">{error}</div>}
        <section className="guided-step check-step" aria-labelledby="check-step-title">
          <h3 id="check-step-title">{label('checkStepTitle')}</h3>
          <button type="button" className="primary-button verify-button" onClick={verify} disabled={loading}>
            {loading ? <><LoaderCircle className="spin" size={20} aria-hidden="true" />{label('checking')}</> : <><ShieldCheck size={21} aria-hidden="true" />{label('checkMessage')}</>}
          </button>
        </section>
        <div className="privacy-note">{label('demoLocal')}</div>
      </div>}
  </>;
}
