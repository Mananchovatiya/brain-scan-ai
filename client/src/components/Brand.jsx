export function BrainMark({ className = "" }) {
  return <svg className={`size-6 ${className}`} aria-hidden="true" viewBox="0 0 32 32" fill="none">
    <path d="M15.9 7.3a5.1 5.1 0 0 0-9.7 1.9 4.4 4.4 0 0 0-.3 8.2 4.3 4.3 0 0 0 5.2 6.7 4.9 4.9 0 0 0 4.8 2.6V7.3Zm.2 0a5.1 5.1 0 0 1 9.7 1.9 4.4 4.4 0 0 1 .3 8.2 4.3 4.3 0 0 1-5.2 6.7 4.9 4.9 0 0 1-4.8 2.6V7.3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.4 11.2c2.4.1 3.7 1.6 3.7 3.6m-4.8 3c2 .1 3.6-.8 4.2-2.4m8.1-4.2c-2.4.1-3.7 1.6-3.7 3.6m4.8 3c-2 .1-3.6-.8-4.2-2.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>;
}

export function ArrowMark() {
  return <svg className="size-5" aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ShieldMark() {
  return <svg className="size-5 shrink-0" aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M10 2.5 16 5v4.2c0 3.5-2.5 6.5-6 8.3-3.5-1.8-6-4.8-6-8.3V5l6-2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="m7.3 9.8 1.8 1.8 3.7-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
