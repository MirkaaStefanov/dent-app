export default function ClinicMark({ className = '', decorative = true }: { className?: string; decorative?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 120 140" fill="none" aria-hidden={decorative} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : 'Символ на дентална грижа'}>
      <path d="M60 24C42 10 17 16 17 42c0 23 11 35 15 56 3 16 5 27 13 27 9 0 6-35 15-35s6 35 15 35c8 0 10-11 13-27 4-21 15-33 15-56 0-26-25-32-43-18Z" fill="currentColor" />
      <path d="M44 27c9 8 19 11 30 10M40 57c11 12 29 12 40 0" stroke="var(--mark-line, #754593)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
