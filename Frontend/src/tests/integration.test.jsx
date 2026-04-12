import { describe, it, expect } from "vitest"

// ─── REAL INTEGRATION TESTS ───────────────────────────────

describe("Integration: Backend API", () => {

  it("gets flights from the real backend", async () => {
    const res = await fetch("http://localhost:8080/api/flights")

    expect(res.ok).toBe(true)

    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it("creates a booking via the real backend", async () => {
    const res = await fetch("http://localhost:8080/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        flightId: "FL001",
        travelClass: "economy",
        totalPrice: 74
      })
    })

    expect(res.status).toBe(201)

    const data = await res.json()
    expect(data).toHaveProperty("bookingReference")
  })

})