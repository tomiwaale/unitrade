/**
 * KolejSwap brand mark — the same artwork as the app icon
 * (mobile/assets/icon/Asset 6.svg, served on the web as app/icon.svg).
 * Sizing lives in `.ut-logo-mark` so it stays in step with `.ut-logo`.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `ut-logo-mark ${className}` : "ut-logo-mark"}
      viewBox="0 0 46.06 46.06"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        width="46.06"
        height="46.06"
        rx="14.49"
        ry="14.49"
        fill="var(--ut-primary, #0F8A4F)"
      />
      <path d="M31.53,17.33l2.54-8.35-8.5,1.98.99,1.06-5.38,5.04-8.21-1.38-.96,5.75,4.21.71-.02.08c.54.15,1.05.31,1.52.49.45.17.87.36,1.24.56.34.18.64.38.88.57.21.17.41.36.58.56.16.19.3.41.42.63.12.23.21.47.29.73.07.26.13.53.16.81.03.29.03.58.01.88-.02.31-.07.62-.14.92-.05.22-.13.43-.2.64l-1.13-.66-.04,8.73,7.58-4.32-1.33-.78c.08-.18.19-.35.26-.53.23-.57.41-1.17.55-1.77.14-.6.23-1.22.27-1.83.04-.63.03-1.25-.03-1.86-.06-.63-.18-1.25-.35-1.85-.18-.62-.42-1.22-.71-1.79-.21-.4-.45-.78-.72-1.15l5.26-4.92.99,1.06Z" fill="#fff" />
    </svg>
  );
}
