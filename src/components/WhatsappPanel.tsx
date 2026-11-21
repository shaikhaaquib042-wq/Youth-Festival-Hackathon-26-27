import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Copy, RotateCcw } from 'lucide-react';
import demos from '../data/demoMessages.json';
import type { Language } from '../app/types';
import { t } from '../app/preferences';

type Demo = { id: string; label: string; text: string; language: string };

function demoLanguage(language: string): Language {
  return language === 'Hindi' || language === 'Marathi' ? language : 'English';
}

export default function WhatsappPanel({ language }: { language: Language }) {
  const [selected, setSelected] = useState(demos[0] as Demo);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const sampleButton = useRef<HTMLButtonElement>(null);
  const label = (key: string) => t(key, language);

  useEffect(() => {
    const send = () => window.dispatchEvent(new CustomEvent('satya:paste', { detail: { text: selected.text } }));
    const openPicker = () => setOpen(true);
    window.addEventListener('satya:request-sample', send);
    window.addEventListener('satya:open-samples', openPicker);
    return () => {
      window.removeEventListener('satya:request-sample', send);
      window.removeEventListener('satya:open-samples', openPicker);
    };
  }, [selected]);

  useEffect(() => {
    const handleDemoReset = () => resetLocal();
    window.addEventListener('satya:reset', handleDemoReset);
    return () => window.removeEventListener('satya:reset', handleDemoReset);
  }, []);

  async function copy(andSend = false) {
    try {
      await navigator.clipboard.writeText(selected.text);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
    if (andSend) loadMessage();
    window.setTimeout(() => setCopied(false), 1800);
  }

  function loadMessage() {
    window.dispatchEvent(new CustomEvent('satya:paste', { detail: { text: selected.text } }));
  }

  function resetLocal() {
    setSelected(demos[0] as Demo);
    setOpen(false);
    setCopied(false);
    setCopyError(false);
  }

  function reset() {
    window.dispatchEvent(new CustomEvent('satya:reset'));
  }

  return <>
    <div className="chat-date">{label('today')}</div>
    <div className="chat-thread" aria-label={label('familyGroup')}>
      <div className="chat-bubble received"><div className="forwarded">↪ {label('forwarded')}</div>{selected.text}<span className="message-time">10:32 AM</span></div>
      <div className="chat-bubble sent">{label('conversationQuestion')}<span className="message-time">10:34 AM</span></div>
      <div className="chat-bubble received">{label('conversationReply')}<span className="message-time">10:35 AM</span></div>
    </div>
    <div className="demo-picker">
      <label className="picker-label" id="sample-picker-label">{label('selectMessageLabel')}</label>
      <button ref={sampleButton} className="sample-select" aria-labelledby="sample-picker-label" aria-expanded={open} aria-haspopup="listbox" onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(value => !value);
        } else if (event.key === 'Escape' && open) {
          setOpen(false);
          sampleButton.current?.focus();
        }
      }} onClick={() => setOpen(!open)}>
        <span>{selected.label} · {label(demoLanguage(selected.language).toLowerCase())}</span><ChevronDown size={20} aria-hidden="true" />
      </button>
      {open && <div className="sample-list" role="listbox" aria-label={label('selectMessageLabel')} onKeyDown={event => {
        const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
        const currentIndex = options.findIndex(option => option === document.activeElement);
        if (event.key === 'Escape') {
          setOpen(false);
          sampleButton.current?.focus();
          event.preventDefault();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = currentIndex < 0
            ? (direction > 0 ? 0 : options.length - 1)
            : (currentIndex + direction + options.length) % options.length;
          options[nextIndex]?.focus();
          event.preventDefault();
        }
      }}>
        {(demos as Demo[]).map(d => <button role="option" aria-selected={selected.id === d.id} key={d.id} onClick={() => { setSelected(d); setOpen(false); setCopied(false); setCopyError(false); sampleButton.current?.focus(); }}>
          {d.label} · {label(demoLanguage(d.language).toLowerCase())}
        </button>)}
      </div>}
    </div>
    <p className="phone-instruction">{label('transferHint')}</p>
    <div className="message-copy">
      <button className="secondary-button phone-action" onClick={loadMessage}><ArrowRight size={18} />{label('loadMessage')}</button>
      <button className="secondary-button phone-action" onClick={() => copy()}><Copy size={18} />{copied ? label('copied') : label('copyMessage')}</button>
      <button className="primary-button transfer-button" onClick={() => copy(true)}><Copy size={18} />{label('transfer')}</button>
      <button className="icon-button phone-action" aria-label={label('resetDemo')} title={label('resetDemo')} onClick={reset}><RotateCcw size={19} /></button>
    </div>
    {copyError && <p className="clipboard-error" role="status">{label('clipboardError')}</p>}
    {copied && <p className="clipboard-status" role="status">{label('copied')}</p>}
    <div className="demo-tag">{label('notConnected')}</div>
  </>;
}
