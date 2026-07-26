/**
 * Central registry for all static Dentixia images.
 * Images are served from the `dentixia` bucket in Supabase Storage.
 *
 * Bucket structure:
 *   dentixia/
 *   ├── logo.png
 *   ├── logo-icon.png
 *   ├── wrong_tip.png
 *   └── correct_tip.png
 *
 * Client logos (per-company) remain in the `logoEmpresa` bucket
 * and are resolved in `src/lib/perfil/actions.ts`.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DENTIXIA_BASE = `${supabaseUrl}/storage/v1/object/public/dentixia`;

export const IMAGES = {
  /** DentixIA horizontal logo (used in headers, login, register pages) */
  logo: `${DENTIXIA_BASE}/logo.png`,

  /** DentixIA icon-only logo (used in collapsed sidebar and watermarks) */
  logoIcon: `${DENTIXIA_BASE}/logo-icon.png`,

  /** Tip card — wrong example photo */
  wrongTip: `${DENTIXIA_BASE}/wrong_tip.png`,

  /** Tip card — correct example photo */
  correctTip: `${DENTIXIA_BASE}/correct_tip.png`,
} as const;
