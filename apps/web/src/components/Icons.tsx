// Small rounded icons, drawn to match the soft Ziklub style.
type P = { size?: number };
const base = (size = 20) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const });

export const IconPlay = ({ size }: P) => (
  <svg {...base(size)}><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" fill="currentColor" /></svg>
);
export const IconPause = ({ size }: P) => (
  <svg {...base(size)}><rect x="6" y="5" width="4.5" height="14" rx="2" fill="currentColor" /><rect x="13.5" y="5" width="4.5" height="14" rx="2" fill="currentColor" /></svg>
);
export const IconNext = ({ size }: P) => (
  <svg {...base(size)}><path d="M5 6.5v11a1 1 0 0 0 1.5.8l8-5.5a1 1 0 0 0 0-1.6l-8-5.5A1 1 0 0 0 5 6.5Z" fill="currentColor" /><rect x="16" y="5.5" width="3" height="13" rx="1.5" fill="currentColor" /></svg>
);
export const IconPrev = ({ size }: P) => (
  <svg {...base(size)}><path d="M19 6.5v11a1 1 0 0 1-1.5.8l-8-5.5a1 1 0 0 1 0-1.6l8-5.5A1 1 0 0 1 19 6.5Z" fill="currentColor" /><rect x="5" y="5.5" width="3" height="13" rx="1.5" fill="currentColor" /></svg>
);
export const IconQueue = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h11M4 12h11M4 17h7" /><circle cx="18" cy="17" r="2.5" /><path d="M20.5 17V8l-3 1" /></svg>
);
export const IconSend = ({ size }: P) => (
  <svg {...base(size)}><path d="M4.5 11.2 18.8 4.6c.9-.4 1.8.5 1.4 1.4l-6.6 14.3c-.4.9-1.7.8-1.9-.2l-1.3-5.2a1 1 0 0 0-.7-.7l-5.2-1.3c-1-.2-1.1-1.5-.2-1.9Z" fill="currentColor" /></svg>
);
export const IconBack = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
);
export const IconShare = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4M8 8l4-4 4 4" /><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" /></svg>
);
export const IconPlus = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
export const IconClose = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconTrash = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
);
export const IconSound = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4h4l5 4V6L8 10H4Z" fill="currentColor" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" /></svg>
);
export const IconUp = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l6-6 6 6" /></svg>
);
export const IconDown = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10l6 6 6-6" /></svg>
);
export const IconFx = ({ size }: P) => (
  <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></svg>
);
