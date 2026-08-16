/**
 * Central registry for all static Dentixia images.
 * Images are served directly from Next.js `/public` directory
 * to guarantee 100% uptime and 0 network latency.
 */

export const IMAGES = {
  /** DentixIA horizontal logo (used in headers, login, register pages) */
  logo: "/logo.png",

  /** DentixIA icon-only logo (used in collapsed sidebar and watermarks) */
  logoIcon: "/logo-icon.png",

  /** Tip card — wrong example photo */
  wrongTip: "/wrong_tip.png",

  /** Tip card — correct example photo */
  correctTip: "/correct_tip.png",
} as const;

