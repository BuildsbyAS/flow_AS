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

// ArrowRight — matches Figma M-Icon/System-Icon/arrow-right (16×16 frame,
// vector inset ~21.87% all sides → arrow spans the center ~56% of the box).
export function ArrowRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3.5 8H12.5M8.5 4L12.5 8L8.5 12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// DirectionFilled — exact path data from /assets/M-Icon/System-Icon/direction-filled.svg
// Original fill="#0F7EFF" replaced with currentColor so the badge controls the color.
export function DirectionFilled({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.03528 13.1591C7.42934 13.1591 6.85767 12.9534 6.38226 12.5641C6.12121 12.3504 5.84851 12.1193 5.52403 11.8356C5.28559 11.6271 5.17767 11.3055 5.2433 10.9956C5.35121 10.4852 5.44746 9.97407 5.52913 9.47459C5.57507 9.19314 5.48611 8.91605 5.28413 8.7148C5.08288 8.51282 4.8058 8.42386 4.52434 8.4698C4.02486 8.55147 3.51371 8.64772 3.0033 8.75564C2.6934 8.82126 2.37111 8.71334 2.1633 8.47491C1.88111 8.15189 1.64996 7.87918 1.43559 7.61668C0.893818 6.95459 0.710069 6.10074 0.931736 5.27459C1.1534 4.44845 1.73892 3.80095 2.53882 3.49834C4.72048 2.67366 6.99403 2.06407 9.29673 1.68782C10.1411 1.55001 10.9716 1.81761 11.5768 2.42209C12.1813 3.02657 12.4497 3.85782 12.3111 4.7022C11.9349 7.00418 11.3253 9.27772 10.5006 11.4601C10.198 12.26 9.55049 12.8463 8.72434 13.0672C8.4983 13.1277 8.26642 13.1583 8.03601 13.1583L8.03528 13.1591Z"
        fill="currentColor"
      />
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

// ──────────────────────────────────────────────────────────────────────
// Design-system "IconButton" SVGs — 24×24, with the warm cream circle
// (#FBF9F8) baked into the artwork. Used as drop-in pseudo-buttons.
// All path data verbatim from /assets/*.svg (designer-uploaded).
// ──────────────────────────────────────────────────────────────────────

export function AddIconButton({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12Z" fill="#FBF9F8"/>
      <path d="M16.3333 11.5H12.5V7.66666C12.5 7.39082 12.2758 7.16666 12 7.16666C11.7242 7.16666 11.5 7.39082 11.5 7.66666V11.5H7.66666C7.39083 11.5 7.16666 11.7242 7.16666 12C7.16666 12.2758 7.39083 12.5 7.66666 12.5H11.5V16.3333C11.5 16.6092 11.7242 16.8333 12 16.8333C12.2758 16.8333 12.5 16.6092 12.5 16.3333V12.5H16.3333C16.6092 12.5 16.8333 12.2758 16.8333 12C16.8333 11.7242 16.6092 11.5 16.3333 11.5Z" fill="#3D1602"/>
    </svg>
  );
}

export function ArrowRightIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z" fill="#FBF9F8"/>
      <path d="M12.3132 7.64647C12.5084 7.45122 12.8249 7.45122 13.0202 7.64647L16.0777 10.7039C16.7938 11.42 16.7938 12.5808 16.0777 13.2969L13.0202 16.3544C12.8249 16.5496 12.5084 16.5496 12.3132 16.3544C12.1179 16.1591 12.1179 15.8425 12.3132 15.6473L15.3706 12.5898C15.3991 12.5613 15.4249 12.5313 15.4484 12.5H8C7.72386 12.5 7.5 12.2761 7.5 12C7.5 11.7238 7.72386 11.5 8 11.5H15.4477C15.4244 11.469 15.3988 11.4392 15.3706 11.411L12.3132 8.35351C12.1179 8.15824 12.1179 7.84174 12.3132 7.64647Z" fill="#1D2539"/>
    </svg>
  );
}

export function CalendarIconButton({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z" fill="#FBF9F8"/>
      <path d="M14.125 6.16667C14.4011 6.16667 14.625 6.39053 14.625 6.66667V8.66667C14.625 8.94281 14.4011 9.16667 14.125 9.16667C13.8489 9.16667 13.625 8.94281 13.625 8.66667V8.11744C12.5424 8.05953 11.4575 8.05935 10.375 8.11727V7.11597C11.4575 7.0599 12.5423 7.06006 13.625 7.11613V6.66667C13.625 6.39053 13.8489 6.16668 14.125 6.16667Z" fill="#3D1602"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.94417 15.2502C6.11401 16.3552 6.99627 17.2126 8.10465 17.3511C10.6917 17.6746 13.3097 17.6745 15.8975 17.351C17.0054 17.2115 17.8877 16.3545 18.0575 15.2502C18.337 13.436 18.3534 11.583 18.108 9.76392C18.0903 9.63098 18.0716 9.49809 18.0499 9.36573C17.8609 8.28634 16.9888 7.45376 15.8983 7.31641C15.8961 7.31614 15.8939 7.31608 15.8918 7.31584C15.8029 7.30474 15.7139 7.29403 15.625 7.2837V8.29061C15.6753 8.29666 15.7257 8.30315 15.7761 8.30892C16.4298 8.39249 16.9517 8.89203 17.0649 9.53842C17.0846 9.65776 17.101 9.77781 17.1169 9.89771C17.1833 10.3899 16.7951 10.8341 16.29 10.8342H7.71166C7.20658 10.8341 6.81837 10.3891 6.88476 9.8969C6.89945 9.78673 6.91479 9.67796 6.93155 9.57015L6.93172 9.56926C7.03362 8.90607 7.56301 8.39172 8.22786 8.3086C8.27689 8.30247 8.32594 8.2965 8.37499 8.29061V8.66667C8.37499 8.94281 8.59886 9.16667 8.875 9.16667C9.15114 9.16667 9.375 8.94281 9.375 8.66667V6.66667C9.375 6.39053 9.15114 6.16667 8.875 6.16667C8.59886 6.16668 8.37499 6.39053 8.37499 6.66667V7.2837C8.28455 7.2942 8.19412 7.30503 8.10375 7.31633C6.99561 7.45488 6.1135 8.31196 5.94344 9.41667C5.92527 9.53347 5.9089 9.64946 5.89363 9.76392C5.64773 11.5864 5.67329 13.4324 5.94417 15.2502ZM7.71166 11.8342C7.353 11.8341 7.0194 11.7314 6.7377 11.5548C6.68691 12.7378 6.75177 13.9245 6.93253 15.0979C7.03442 15.7612 7.5638 16.2756 8.22867 16.3588C10.655 16.6622 13.1092 16.6717 15.538 16.3873L15.773 16.3588C16.4382 16.2748 16.9674 15.7602 17.0692 15.0981C17.2499 13.9247 17.3146 12.7378 17.2638 11.5549C16.9822 11.7314 16.6486 11.8341 16.29 11.8342H7.71166Z" fill="#3D1602"/>
    </svg>
  );
}

export function DownChevronIconButton({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 12C0 5.37258 5.37258 0 12 0V0C18.6274 0 24 5.37258 24 12V12C24 18.6274 18.6274 24 12 24V24C5.37258 24 0 18.6274 0 12V12Z" fill="#FBF9F8"/>
      <path d="M12.0001 15.1668C11.8717 15.1668 11.7442 15.1176 11.6467 15.0201L7.64674 11.0201C7.45174 10.8251 7.45174 10.5084 7.64674 10.3126C7.84174 10.1176 8.1584 10.1176 8.35424 10.3126L12.0009 13.9593L15.6476 10.3126C15.8426 10.1176 16.1592 10.1176 16.3551 10.3126C16.5501 10.5076 16.5501 10.8243 16.3551 11.0201L12.3551 15.0201C12.2576 15.1176 12.1292 15.1668 12.0017 15.1668H12.0001Z" fill="#3D1602"/>
    </svg>
  );
}

export function ExternalLinkIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.9925 9.62768C13.67 9.62768 13.4078 9.88986 13.4078 10.2125C13.4078 11.193 13.326 12.1793 13.1652 13.1462C13.0424 13.886 12.4626 14.4649 11.7229 14.5887C9.7759 14.9133 7.80255 14.9133 5.85551 14.5887C5.11587 14.4659 4.53702 13.886 4.41326 13.1462C4.08875 11.1988 4.08875 9.22515 4.41326 7.27778C4.53605 6.53801 5.11587 5.95906 5.85551 5.83528C6.82221 5.67446 7.80937 5.59259 8.78874 5.59259C9.1113 5.59259 9.37344 5.33041 9.37344 5.0078C9.37344 4.68518 9.1113 4.423 8.78874 4.423C7.74506 4.423 6.6926 4.50975 5.66256 4.68129C4.4308 4.88694 3.46508 5.85283 3.25946 7.0848C2.91351 9.15887 2.91351 11.2632 3.25946 13.3372C3.46508 14.5692 4.4308 15.5351 5.66256 15.7407C6.69942 15.9133 7.74408 16 8.78874 16C9.8334 16 10.8771 15.9133 11.9149 15.7407C13.1467 15.5351 14.1124 14.5692 14.318 13.3372C14.4895 12.307 14.5763 11.2554 14.5763 10.2105C14.5763 9.88791 14.3141 9.62573 13.9916 9.62573L13.9925 9.62768Z" fill="currentColor"/>
      <path d="M13.8571 3H10.7387C10.4161 3 10.154 3.26218 10.154 3.5848C10.154 3.90741 10.4161 4.16959 10.7387 4.16959H13.8571C13.9039 4.16959 13.9487 4.17349 13.9935 4.18031L9.54495 8.62963C9.31692 8.8577 9.31692 9.22807 9.54495 9.45711C9.65896 9.57115 9.80904 9.62865 9.95813 9.62865C10.1072 9.62865 10.2573 9.57115 10.3713 9.45711L14.8199 5.0078C14.8267 5.05263 14.8306 5.09844 14.8306 5.14425V8.26316C14.8306 8.58577 15.0927 8.84795 15.4153 8.84795C15.7379 8.84795 16 8.58577 16 8.26316V5.14425C16 3.96199 15.0382 3 13.8561 3H13.8571Z" fill="currentColor"/>
    </svg>
  );
}

// DeleteIcon (bin) — exact path data from designer-supplied Delete.svg.
// Original fill="#3D1602" swapped for currentColor so the host controls colour.
export function DeleteIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.66659 7.83325C7.94274 7.83325 8.16659 8.05711 8.16659 8.33325V10.9999C8.16659 11.2761 7.94274 11.4999 7.66659 11.4999C7.39046 11.4999 7.16659 11.2761 7.16659 10.9999V8.33325C7.16659 8.05711 7.39046 7.83326 7.66659 7.83325Z" fill="currentColor"/>
      <path d="M10.3333 7.83325C10.6094 7.83325 10.8333 8.05711 10.8333 8.33325V10.9999C10.8333 11.2761 10.6094 11.4999 10.3333 11.4999C10.0571 11.4999 9.83326 11.2761 9.83326 10.9999V8.33325C9.83326 8.05711 10.0571 7.83326 10.3333 7.83325Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M9.95908 1.83325C10.8003 1.83325 11.5335 2.40622 11.7375 3.22201L12.1136 4.72656C12.8899 4.83515 13.6619 4.9844 14.4264 5.17456C14.658 5.21823 14.8333 5.42148 14.8333 5.66577C14.8333 5.9419 14.6094 6.16577 14.3333 6.16577H14.3299C14.2891 6.16577 14.2483 6.16071 14.2087 6.1508C13.9812 6.09394 13.753 6.041 13.5242 5.9917C13.6688 8.28895 13.5415 10.5938 13.1447 12.858L13.1034 13.0885C12.9186 14.095 12.1353 14.883 11.1353 15.0828L11.1353 15.0827C9.73361 15.3632 8.29137 15.3646 6.88925 15.0873C6.88016 15.086 6.87108 15.0846 6.86207 15.0828C5.87699 14.8862 5.10252 14.1196 4.90227 13.1356L4.89316 13.0885C4.46396 10.7505 4.32283 8.36735 4.47226 5.99227C4.24352 6.04161 4.01536 6.0947 3.78793 6.15161C3.52006 6.21862 3.2486 6.05579 3.18157 5.78792C3.11456 5.52005 3.27739 5.2486 3.54526 5.18156C4.31891 4.98796 5.10034 4.83624 5.88616 4.72632L6.26238 3.22201C6.46633 2.40622 7.19956 1.83326 8.04078 1.83325H9.95908ZM12.509 5.79834C10.1842 5.41335 7.81187 5.4134 5.48756 5.79875C5.31617 8.17733 5.44684 10.5662 5.87672 12.908L5.88811 12.9639C6.01545 13.5334 6.46777 13.9791 7.04575 14.0994C7.05096 14.1002 7.05619 14.1011 7.06137 14.1021C8.3416 14.3583 9.65907 14.3583 10.9393 14.1021H10.9395C11.5412 13.9819 12.0096 13.5082 12.1198 12.908L12.1598 12.6854C12.5577 10.4148 12.675 8.10175 12.509 5.79834ZM8.04078 2.83325C7.65869 2.83326 7.32523 3.09365 7.23251 3.46452L6.94776 4.60343C8.31294 4.4783 9.68683 4.4784 11.0521 4.6036L10.7673 3.46452C10.6746 3.09365 10.3412 2.83325 9.95908 2.83325H8.04078Z" fill="currentColor"/>
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

// FilePrototype — play triangle in a rounded frame. Violet reads as
// "interactive / clickable" and keeps prototypes distinct from PRDs.
export function FilePrototype({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16">
      <rect x="2" y="2.5" width="12" height="11" rx="2.4" fill="#8B5CF6" />
      <path d="M6.5 5.6 11 8 6.5 10.4Z" fill="#fff" />
    </svg>
  );
}

// CategoryFilled (cool variant) — 2×2 colored squares, matches Figma category-filled.
export function CategoryCool({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="#0F61FF" />
      <rect x="10" y="2" width="6" height="6" rx="1.5" fill="#00BF7C" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" fill="#EC4899" />
      <rect x="10" y="10" width="6" height="6" rx="1.5" fill="#F59E0B" />
    </svg>
  );
}

// CategoryFilled (warm variant) — orange-red palette.
export function CategoryWarm({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="#F97316" />
      <rect x="10" y="2" width="6" height="6" rx="1.5" fill="#EF4444" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" fill="#F59E0B" />
      <rect x="10" y="10" width="6" height="6" rx="1.5" fill="#FB923C" />
    </svg>
  );
}
