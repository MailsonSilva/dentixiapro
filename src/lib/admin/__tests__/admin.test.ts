import { describe, it, expect, vi } from "vitest";
import { checkAdminAccessAction, toggleBlockClientAction } from "../actions";

vi.mock("@/lib/supabaseServer", () => ({
  createClient: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-admin-id" } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "usuarios") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { tipo: "admin" }, error: null }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    });
  }),
}));

describe("Admin Gatekeeper & Actions", () => {
  it("should permit access when user has tipo = admin", async () => {
    const res = await checkAdminAccessAction();
    expect(res.isAdmin).toBe(true);
    expect(res.error).toBeNull();
  });

  it("should execute toggleBlockClientAction without throwing runtime errors", async () => {
    const res = await toggleBlockClientAction("target-user-id", true);
    expect(res.success).toBe(true);
    expect(res.error).toBeNull();
  });
});
