export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="sh-logo-mark">
      <rect width="40" height="40" rx="12" fill="#2D7341" />
      <path d="M12 32V15a8 8 0 0 1 16 0v17z" fill="#FFF8EE" />
      <circle cx="24" cy="24" r="1.7" fill="#E56420" />
      <path d="M4 36c7-4 12 0 18-2" fill="none" stroke="#FFB27A" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="0.1 5" />
    </svg>
  );
}
