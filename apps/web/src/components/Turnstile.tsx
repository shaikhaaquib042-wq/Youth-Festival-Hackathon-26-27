/** Cloudflare Turnstile widget. Rendered only when VITE_TURNSTILE_SITE_KEY is set at build time. */
export function Turnstile() {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!key) return null;
  return (
    <>
      <div className="cf-turnstile" data-sitekey={key} />
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
    </>
  );
}
