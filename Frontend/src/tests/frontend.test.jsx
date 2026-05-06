import "@testing-library/jest-dom"
import { describe, it, expect, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { getSeatPrice, formatPrice, paxLabel, stopsLabel } from "../Utils.js"
import { FlightCard } from "../components/FlightCard.jsx"
import { Navbar } from "../components/Navbar.jsx"
import { AuthProvider } from "../context/AuthContext.jsx"
import { getFlights, login, createBooking } from "../services/api.js"

const originalFetch = global.fetch

afterEach(() => {
  vi.restoreAllMocks()
  global.fetch = originalFetch
  localStorage.clear()
})

// ─── Utility tests ────────────────────────────────────────

describe("formatPrice", () => {
  it("formats a number as a pounds string", () => {
    expect(formatPrice(74)).toBe("£74")
  })
})

describe("stopsLabel", () => {
  it("returns Direct for 0 stops", () => {
    expect(stopsLabel(0)).toBe("Direct")
  })

  it("returns 1 Stop for 1 stop", () => {
    expect(stopsLabel(1)).toBe("1 Stop")
  })
})

describe("getSeatPrice", () => {
  it("charges more for a front economy window seat than a middle back seat", () => {
    const frontWindow = getSeatPrice(5, "A", false)
    const backMiddle  = getSeatPrice(25, "C", false)
    expect(frontWindow).toBeGreaterThan(backMiddle)
  })
})

describe("paxLabel", () => {
  it("returns the passenger type and name when name is provided", () => {
    expect(paxLabel({ type: "adult", firstName: "Jane", lastName: "Smith" }, 0))
      .toBe("Adult 1: Jane Smith")
  })

  it("returns a generic label when no name is filled in yet", () => {
    expect(paxLabel({ type: "child", firstName: "", lastName: "" }, 1))
      .toBe("Child 2")
  })
})

// ─── Component tests ──────────────────────────────────────

describe("FlightCard", () => {
  const flight = {
    id: "FL001", flightNumber: "LS101", airline: "LeedsAir",
    from: "LBA", to: "LHR", departureTime: "07:30", arrivalTime: "08:45",
    departureDate: "2026-04-20", duration: "1h 15m", stops: 0, price: 74,
  }

  it("renders the flight price", () => {
    render(<FlightCard flight={flight} onSelect={() => {}} />)
    expect(screen.getByText("£74")).toBeInTheDocument()
  })

  it("calls onSelect when Select button is clicked", async () => {
    const onSelect = vi.fn()
    render(<FlightCard flight={flight} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole("button", { name: /select/i }))
    expect(onSelect).toHaveBeenCalledWith(flight)
  })
})

describe("Navbar", () => {
  it("shows Login and Register when no user is logged in", () => {
    localStorage.clear()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => null })
    render(
      <AuthProvider>
        <Navbar activePage="home" onNavigate={() => {}} />
      </AuthProvider>
    )
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /register/i })).toBeInTheDocument()
  })
})

// ─── API tests ────────────────────────────────────────────

describe("getFlights", () => {
  it("fetches flights from the API and returns the results", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => [{ id: "FL001", flightNumber: "LS101" }],
    })
    const flights = await getFlights({ from: "LBA", to: "LHR" })
    expect(flights.length).toBe(1)
    expect(flights[0].flightNumber).toBe("LS101")
  })
})

describe("login", () => {
  it("throws an error when the backend returns 401", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ message: "Invalid email or password" }),
    })
    await expect(login("bad@email.com", "wrongpass"))
      .rejects.toThrow("Invalid email or password")
  })
})

describe("createBooking", () => {
  it("posts to /api/bookings and returns the new booking reference", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: async () => ({ bookingReference: "LEEDSABC1", status: "Confirmed" }),
    })
    const result = await createBooking({ flightId: "FL001", travelClass: "economy", totalPrice: 74 })
    expect(result.bookingReference).toBe("LEEDSABC1")
    expect(result.status).toBe("Confirmed")
  })
})