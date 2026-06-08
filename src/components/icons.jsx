// All icons are inline SVGs — matches PM repo's no-icon-lib convention.
// Stroke icons use currentColor. Filled icons use currentColor for fill.

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// ExpandIcon — exact path data from /assets/ExpandIcon.svg
// Original fill="#475067" replaced with currentColor for theming.
export function ExpandIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.7501 3.5H14.5001C14.0864 3.5 13.7501 3.83625 13.7501 4.25C13.7501 4.66375 14.0864 5 14.5001 5H17.7501C17.8101 5 17.8676 5.00625 17.9251 5.01375L13.2189 9.72C12.9264 10.0125 12.9264 10.4875 13.2189 10.7812C13.3651 10.9275 13.5576 11.0013 13.7489 11.0013C13.9401 11.0013 14.1326 10.9275 14.2789 10.7812L18.9851 6.075C18.9939 6.1325 18.9989 6.19125 18.9989 6.25V9.5C18.9989 9.91375 19.3351 10.25 19.7489 10.25C20.1626 10.25 20.4989 9.91375 20.4989 9.5V6.25C20.4989 4.73375 19.2651 3.5 17.7489 3.5H17.7501Z"
        fill="currentColor"
      />
      <path
        d="M9.72 13.22L5.01375 17.9262C5.00625 17.8687 5 17.81 5 17.7512V14.5012C5 14.0875 4.66375 13.7512 4.25 13.7512C3.83625 13.7512 3.5 14.0875 3.5 14.5012V17.7512C3.5 19.2675 4.73375 20.5012 6.25 20.5012H9.5C9.91375 20.5012 10.25 20.165 10.25 19.7512C10.25 19.3375 9.91375 19.0012 9.5 19.0012H6.25C6.19 19.0012 6.1325 18.995 6.075 18.9875L10.7812 14.2812C11.0737 13.9887 11.0737 13.5137 10.7812 13.22C10.4888 12.9275 10.0138 12.9275 9.72 13.22Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ContractIcon — exact path data from /assets/ContractIcon.svg
// Original fill="#475067" replaced with currentColor for theming.
export function ContractIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.7483 11.0013H18.9983C19.412 11.0013 19.7483 10.665 19.7483 10.2512C19.7483 9.8375 19.412 9.50125 18.9983 9.50125H15.7483C15.6883 9.50125 15.6308 9.495 15.5733 9.4875L20.2795 4.78125C20.572 4.48875 20.572 4.01375 20.2795 3.72C20.1333 3.57375 19.9408 3.5 19.7495 3.5C19.5583 3.5 19.3658 3.57375 19.2195 3.72L14.5133 8.42625C14.5045 8.36875 14.4995 8.31 14.4995 8.25125L14.4995 5.00125C14.4995 4.5875 14.1633 4.25125 13.7495 4.25125C13.3358 4.25125 12.9995 4.5875 12.9995 5.00125L12.9995 8.25125C12.9995 9.7675 14.2333 11.0013 15.7495 11.0013H15.7483Z"
        fill="currentColor"
      />
      <path
        d="M4.78062 20.2819L9.48688 15.5756C9.49438 15.6331 9.50063 15.6919 9.50063 15.7506L9.50062 19.0006C9.50062 19.4144 9.83687 19.7506 10.2506 19.7506C10.6644 19.7506 11.0006 19.4144 11.0006 19.0006L11.0006 15.7506C11.0006 14.2344 9.76688 13.0006 8.25063 13.0006L5.00063 13.0006C4.58688 13.0006 4.25063 13.3369 4.25063 13.7506C4.25063 14.1644 4.58688 14.5006 5.00063 14.5006L8.25063 14.5006C8.31063 14.5006 8.36813 14.5069 8.42563 14.5144L3.71937 19.2206C3.42687 19.5131 3.42687 19.9881 3.71937 20.2819C4.01187 20.5744 4.48687 20.5744 4.78062 20.2819Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChevronRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

// ChevronDown — matches Figma M-Icon/System-Icon/chevron-down (18x18 frame).
// Vector sits in a 18x18 box with insets ~21.87% horizontal, ~38.54% top, ~30.21% bottom,
// so the visible chevron spans roughly the center 56% horizontally and ~31% vertically.
export function ChevronDown({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.5 7.3125L9 11.8125L13.5 7.3125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Slash({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M10 3L6 13" />
    </svg>
  );
}

export function BookmarkIcon({ size = 16, filled = false }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 18 18" fill="currentColor">
        <path d="M4 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13l-5-3-5 3V3z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" {...stroke}>
      <path d="M4 3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13l-5-3-5 3V3z" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function CloseIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function ArrowUpRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M5 11l6-6M6 5h5v5" />
    </svg>
  );
}

export function DirectionFilled({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <path d="M2 6l5-4v3h3v2H7v3z" />
    </svg>
  );
}

export function Refresh({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" {...stroke}>
      <path d="M12 6a5 5 0 1 0-1.6 3.6" />
      <path d="M12 3v3h-3" />
    </svg>
  );
}

export function Dot({ size = 4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 4 4" fill="currentColor">
      <circle cx="2" cy="2" r="1.5" />
    </svg>
  );
}

export function HeartIcon({ size = 14, filled = false }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 14s-5-3.2-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 3.8-5 7-5 7z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M8 14s-5-3.2-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 3.8-5 7-5 7z" />
    </svg>
  );
}

export function ReplyIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M6 4L2 8l4 4" />
      <path d="M2 8h7a4 4 0 0 1 4 4v1" />
    </svg>
  );
}

export function SmileyAdd({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <circle cx="7" cy="8" r="5" />
      <path d="M5.5 9.5c.6.6 1.4 1 2.5 1s1.9-.4 2.5-1" />
      <circle cx="5.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7" r="0.5" fill="currentColor" stroke="none" />
      <path d="M12 3.5V6M10.5 4.5h3" />
    </svg>
  );
}

export function SendIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke}>
      <path d="M13 3L2 8l4 1.5L8 13l5-10z" />
    </svg>
  );
}

export function MoreHorizontal({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  );
}

// Watchlist icons — exact path data from /assets/WatchlistOff.svg and
// /assets/WatchlistOn.svg. The circle background (#FBF9F8) and stroke (#3D1602)
// are baked into the SVG so the button has no separate background.

export function WatchlistOff({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 18C0 8.05887 8.05887 0 18 0V0C27.9411 0 36 8.05887 36 18V18C36 27.9411 27.9411 36 18 36V36C8.05887 36 0 27.9411 0 18V18Z"
        fill="#FBF9F8"
      />
      <path
        d="M22.6611 10.7687C23.5783 10.8751 24.25 11.6658 24.25 12.5892V25.5L18 22.375L11.75 25.5V12.5892C11.75 11.6658 12.4217 10.8751 13.3389 10.7687C14.868 10.5912 16.4233 10.5 18 10.5C19.5767 10.5 21.132 10.5912 22.6611 10.7687Z"
        stroke="#3D1602"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WatchlistOn({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 18C0 8.05887 8.05887 0 18 0V0C27.9411 0 36 8.05887 36 18V18C36 27.9411 27.9411 36 18 36V36C8.05887 36 0 27.9411 0 18V18Z"
        fill="#FBF9F8"
      />
      <path
        d="M22.6611 10.7687C23.5783 10.8751 24.25 11.6658 24.25 12.5892V25.5L18 22.375L11.75 25.5V12.5892C11.75 11.6658 12.4217 10.8751 13.3389 10.7687C14.868 10.5912 16.4233 10.5 18 10.5C19.5767 10.5 21.132 10.5912 22.6611 10.7687Z"
        fill="#3D1602"
        stroke="#3D1602"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Resource type icons —————

export function FigmaLogo({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14">
      <path d="M5 1h2v3H5a1.5 1.5 0 0 1 0-3z" fill="#F24E1E" />
      <path d="M5 4h2v3H5a1.5 1.5 0 0 1 0-3z" fill="#A259FF" />
      <path d="M7 1h2a1.5 1.5 0 0 1 0 3H7V1z" fill="#FF7262" />
      <path d="M7 4h2a1.5 1.5 0 0 1 0 3H7V4z" fill="#1ABCFE" />
      <path d="M5 7h2v3a1.5 1.5 0 1 1-2-1.5V7z" fill="#0ACF83" />
    </svg>
  );
}

export function FilePdf({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path d="M3 2a1 1 0 0 1 1-1h6l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2z" fill="#EF4444" />
      <path d="M10 1v3h3" fill="none" stroke="#fff" strokeWidth="0.8" />
      <text x="8" y="11.5" fontSize="3.5" fill="#fff" textAnchor="middle" fontFamily="Geist" fontWeight="700">PDF</text>
    </svg>
  );
}

export function FileDeck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <rect x="2" y="3" width="12" height="10" rx="1.5" fill="#0F61FF" />
      <path d="M4.5 6.5h7M4.5 9h5M4.5 11h6" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function FileLink({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...stroke} stroke="#0F61FF">
      <path d="M7 9a3 3 0 0 0 4.2.2l2-2a3 3 0 0 0-4.2-4.2L7.6 4.4" />
      <path d="M9 7a3 3 0 0 0-4.2-.2l-2 2a3 3 0 0 0 4.2 4.2l1.4-1.4" />
    </svg>
  );
}

export function FileData({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <ellipse cx="8" cy="4" rx="5" ry="1.6" fill="#00BF7C" />
      <path d="M3 4v8c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6V4" fill="none" stroke="#00BF7C" strokeWidth="1.4" />
      <path d="M3 8c0 .9 2.2 1.6 5 1.6s5-.7 5-1.6" fill="none" stroke="#00BF7C" strokeWidth="1.4" />
    </svg>
  );
}
