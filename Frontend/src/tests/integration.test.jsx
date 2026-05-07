import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminGetReports,
  buildApiUrl,
  createBooking,
  getProfile,
} from "../services/api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  localStorage.clear();
});

describe("Integration: API service layer", () => {
  it("builds frontend API URLs from the configured base URL", () => {
    expect(buildApiUrl("/flights")).toMatch(/\/api\/flights$/);
  });

  it("sends the user bearer token when loading the profile", async () => {
    localStorage.setItem("token", "user-token-123");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 7, email: "user@test.com" }),
    });

    await getProfile();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/profile"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer user-token-123",
        }),
      }),
    );
  });

  it("sends the admin bearer token for admin report requests", async () => {
    localStorage.setItem("adminToken", "admin-token-456");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ bookingsByStatus: [] }),
    });

    await adminGetReports();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/admin/reports"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer admin-token-456",
        }),
      }),
    );
  });

  it("posts booking payloads to the bookings endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ bookingReference: "LEEDS1234" }),
    });

    await createBooking({ flightId: "321", travelClass: "economy", totalPrice: 99 });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/bookings"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ flightId: "321", travelClass: "economy", totalPrice: 99 }),
      }),
    );
  });
});
