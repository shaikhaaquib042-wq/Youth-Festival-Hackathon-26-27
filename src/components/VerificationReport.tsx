import type { Language, Verdict, VerificationReport as Report } from '../app/types';
import { AlertTriangle, CheckCircle2, GitBranch, Info, ShieldAlert } from 'lucide-react';
import { t } from '../app/preferences';
import AudioControls from './AudioControls';

const icons = {
  VERIFIED: CheckCircle2,
  FALSE: ShieldAlert,
  MISLEADING: AlertTriangle,
  UNVERIFIED: Info,
  CONFLICTING: GitBranch,
} satisfies Record<Verdict, typeof CheckCircle2>;

const explanations: Record<Verdict, string> = {
  VERIFIED: 'verifiedExplanation',
  FALSE: 'falseExplanation',
  MISLEADING: 'misleadingExplanation',
  UNVERIFIED: 'noEvidence',
  CONFLICTING: 'conflictingExplanation',
};

const warningTranslations: Record<string, string> = {
  'Urgent or pressure-based language': 'warningUrgent',
  'Encourages rapid forwarding': 'warningForward',
  'Link or click-through request': 'warningLink',
  'High-value offer or reward claim': 'warningReward',
  'No identifiable source included': 'warningNoSource',
};

const syntheticExplanations: Record<Verdict, string> = {
  VERIFIED: 'syntheticVerifiedDetail',
  FALSE: 'syntheticFalseDetail',
  MISLEADING: 'syntheticMisleadingDetail',
  CONFLICTING: 'syntheticConflictingDetail',
  UNVERIFIED: 'syntheticUnverifiedDetail',
};

export default function VerificationReport({
  report,
  language,
  onLanguage,
  onBack,
}: {
  report: Report;
  language: Language;
  onLanguage: (value: Language) => void;
  onBack: () => void;
}) {
  const label = (key: string) => t(key, language);
  const OverallIcon = icons[report.overall];
  const hasSyntheticEvidence = report.claims.some(claim => claim.evidence?.demoOnly);
  const claimExplanation = (claim: Report['claims'][number]) =>
    label(claim.evidence?.demoOnly ? syntheticExplanations[claim.verdict] : explanations[claim.verdict]);
  const overallExplanation = hasSyntheticEvidence
    ? syntheticExplanations[report.overall]
    : explanations[report.overall];

  return <div className="report-view" aria-live="polite">
    <div className="report-top">
      <div><span className="eyebrow">{label('resultTitle')}</span><h2>{label('resultTitle')}</h2></div>
      <button className="text-button" type="button" onClick={onBack}>← {label('tryAnother')}</button>
    </div>
    <div className={`overall verdict-${report.overall.toLowerCase()}`}>
      <OverallIcon size={28} aria-hidden="true" />
      <div><small>{label('resultExplanation')}</small><strong>{report.overall}</strong><p>{label(overallExplanation)}</p></div>
    </div>
    {hasSyntheticEvidence && <p className="synthetic-disclaimer" role="note">{label('syntheticResult')}</p>}
    <div className="meta-row">
      <span>{label('detectedLanguage')}: <b>{label(report.inputLanguage.toLowerCase())}</b></span>
      <span>{label('countClaims')}: <b>{report.claims.length}</b></span>
    </div>
    <h3 className="report-section-title">{label('whatChecked')}</h3>
    {report.claims.map((claim, index) => {
      const ClaimIcon = icons[claim.verdict];
      return <article className="claim-card" key={`${index}-${claim.text}`}>
        <div className="claim-head">
          <b>{label('claimNumber')} {index + 1}</b>
          <span className={`status status-${claim.verdict.toLowerCase()}`}><ClaimIcon size={16} aria-hidden="true" />{claim.verdict}</span>
        </div>
        <p className="claim-text">{claim.text}</p>
        <p>{claimExplanation(claim)}</p>
        {!claim.evidence?.demoOnly && <p className="claim-explanation">{claim.explanation}</p>}
        {claim.evidence ? <div className="evidence-box">
          <b>{label('whereFrom')}</b>
          <strong>{claim.evidence.sourceTitle}</strong>
          {claim.evidence.issuingAuthority && <span>{label('issuingAuthority')}: {claim.evidence.issuingAuthority}</span>}
          {claim.evidence.publicationDate && <span>{label('publicationDate')}: {claim.evidence.publicationDate}</span>}
          {claim.evidence.evidenceExcerpt && <p>{claim.evidence.evidenceExcerpt}</p>}
          {claim.evidence.demoOnly && <em>{label('synthetic')}</em>}
          {claim.evidence.sourceUrl && <a href={claim.evidence.sourceUrl} target="_blank" rel="noreferrer">{label('openSource')} ↗</a>}
        </div> : <div className="evidence-box no-evidence">
          <b>{label('whereFrom')}</b>
          <span>{label('sourceMissing')}</span>
        </div>}
      </article>;
    })}
    <div className="warning-box">
      <b><AlertTriangle size={17} aria-hidden="true" /> {label('warningIndicators')}</b>
      {report.warningSigns.length
        ? report.warningSigns.map(sign => <span key={sign}>• {label(warningTranslations[sign] ?? sign)}</span>)
        : <span>{label('noWarningSigns')}</span>}
    </div>
    <div className="recommendation"><b>{label('nextStep')}</b><p>{report.recommendation}</p><p>{label('suggestion')}</p></div>
    <AudioControls report={report} language={language} />
    <button className="primary-button full" type="button" onClick={onBack}>{label('tryAnother')}</button>
    <p className="footnote">{label('demoDisclaimer')}</p>
    <div className="report-language" aria-label={label('language')}>
      {(['English', 'Hindi', 'Marathi'] as Language[]).map(value =>
        <button key={value} type="button" aria-pressed={language === value} onClick={() => onLanguage(value)}>
          {value === 'Hindi' ? 'हिंदी' : value === 'Marathi' ? 'मराठी' : value}
        </button>)}
    </div>
  </div>;
}
