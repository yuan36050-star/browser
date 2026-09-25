export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path d="M38 32 A16 16 0 1 1 38 16" stroke="var(--accent)" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="27.5" cy="24" r="4.6" fill="var(--accent)" />
    </svg>
  );
}
