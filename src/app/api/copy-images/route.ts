import { NextResponse } from "next/server";

/**
 * @deprecated
 * This route was used to copy tip images (wrong_tip.png, correct_tip.png)
 * from a local path into /public. These images are now served directly
 * from the `dentixia` Supabase Storage bucket via `src/lib/images.ts`.
 *
 * This endpoint is kept as a no-op to avoid 404 errors on any cached references.
 * Safe to delete after confirming no client calls this route.
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    message:
      "Deprecated. Images are now served from the `dentixia` Supabase Storage bucket. See src/lib/images.ts.",
  });
}
