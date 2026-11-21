import { useId } from 'react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../services/client';

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Button({
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
export function Select({
  label,
  values,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; values: readonly string[] }) {
  const id = useId();
  const { t } = useTranslation();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} {...props}>
        {values.map((value) => (
          <option key={value} value={value}>
            {t(`enum.${value}`, { defaultValue: value })}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="loading" role="status">
      <span className="loading-dot" />
      {t('ui.loading')}
    </div>
  );
}
export function ErrorPanel({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t, i18n } = useTranslation();
  const code = error instanceof ApiError ? error.code : 'generic';
  const key = `error.${code}`;
  return (
    <div className="feedback error" role="alert">
      <p>{t(i18n.exists(key) ? key : 'error.generic')}</p>
      {error instanceof ApiError && error.requestId && (
        <p className="small">
          {t('ui.requestId')}: <code>{error.requestId}</code>
        </p>
      )}
      {retry && <Button onClick={retry}>{t('ui.retry')}</Button>}
    </div>
  );
}
export function ModeBadge({ mode }: { mode: string }) {
  const { t } = useTranslation();
  return <span className={`badge mode-${mode.toLowerCase()}`}>{t(`mode.${mode}`)}</span>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
