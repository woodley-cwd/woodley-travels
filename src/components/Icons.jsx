// Thin gold line icons. Every icon inherits stroke from currentColor and uses
// a 1.25 stroke — deliberately finer than a typical UI kit.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

export const Globe = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
    <path d="M3.5 9h17M3.5 15h17" />
  </svg>
)

export const Compass = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.6 8.4-2 5.2-5.2 2 2-5.2 5.2-2Z" />
  </svg>
)

export const Plus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const Pencil = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M14.5 7.5 16.5 9.5" />
  </svg>
)

export const Trash = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export const Back = (p) => (
  <svg {...base} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
)

export const Calendar = (p) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

export const Pin = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const Users = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3.2 3.2 0 0 1 0 5.9M17 14.2a5.5 5.5 0 0 1 3.5 4.8" />
  </svg>
)

export const Moon = (p) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
)

export const Camera = (p) => (
  <svg {...base} {...p}>
    <path d="M3.5 8.5h3L8 6h8l1.5 2.5h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.4" />
  </svg>
)

export const Bed = (p) => (
  <svg {...base} {...p}>
    <path d="M3 19v-9M3 14h18v5M21 19v-5a3 3 0 0 0-3-3H3" />
    <circle cx="7.5" cy="10" r="2.2" />
  </svg>
)

export const Fork = (p) => (
  <svg {...base} {...p}>
    <path d="M6 3v6a2.5 2.5 0 0 0 5 0V3M8.5 11v10" />
    <path d="M16.5 3c-1.4 1.2-2 3-2 5s.6 3 2 3.2V21" />
  </svg>
)

export const Mail = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
)

export const Wallet = (p) => (
  <svg {...base} {...p}>
    <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5H18v2" />
    <rect x="3.5" y="7.5" width="17" height="11" rx="2" />
    <circle cx="16.5" cy="13" r="1.1" />
  </svg>
)

export const Heart = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7-4.6-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.4 12 20 12 20Z" />
  </svg>
)

export const Stamp = (p) => (
  <svg {...base} {...p}>
    <path d="M9 10V7.5a3 3 0 1 1 6 0V10" />
    <path d="M4.5 14.5h15l-1 3.5h-13l-1-3.5Z" />
    <path d="M7 14.5V13a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.5" />
    <path d="M4.5 20.5h15" />
  </svg>
)

export const Search = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
)

export const Award = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="9.5" r="5.5" />
    <path d="M8.5 14.2 7 21l5-2.4L17 21l-1.5-6.8" />
  </svg>
)

export const Clock = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.4 2" />
  </svg>
)

export const Plane = (p) => (
  <svg {...base} {...p}>
    <path d="M10.5 3.5a1.5 1.5 0 0 1 3 0V9l7 4v2l-7-2v4l2.5 2v1.5L12 19.5 8 20.5V19l2.5-2v-4l-7 2v-2l7-4Z" />
  </svg>
)

export const Bell = (p) => (
  <svg {...base} {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </svg>
)

export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 5 5 9-10.5" />
  </svg>
)

export const Gear = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
  </svg>
)

export const Sparkle = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 13.9 9.3 19.7 11.2 13.9 13.1 12 18.9 10.1 13.1 4.3 11.2 10.1 9.3 Z" />
    <path d="M18 4.2v2.6M19.3 5.5h-2.6" />
  </svg>
)

export const Lock = (p) => (
  <svg {...base} {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
)
