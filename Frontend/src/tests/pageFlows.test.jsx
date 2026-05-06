import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogin = vi.fn();
const mockAdminLogin = vi.fn();
const mockRegister = vi.fn();
const mockCreateBooking = vi.fn();
const mockLoginUser = vi.fn();
const mockLogoutUser = vi.fn();

let mockAuthState = {
  user: null,
  authLoading: false,
  loginUser: mockLoginUser,
  logoutUser: mockLogoutUser,
};

vi.mock("../services/api", () => ({
  login: (...args) => mockLogin(...args),
  adminLogin: (...args) => mockAdminLogin(...args),
  register: (...args) => mockRegister(...args),
  createBooking: (...args) => mockCreateBooking(...args),
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockAuthState,
  AuthProvider: ({ children }) => children,
}));

vi.mock("../components/RouteMap", () => ({
  RouteMap: () => <div data-testid="route-map">Route map</div>,
}));

import { LoginPage } from "../pages/LoginPage.jsx";
import { AdminLoginPage } from "../pages/AdminLoginPage.jsx";
import { BookingFlowPage } from "../pages/BookingFlowPage.jsx";

function buildFlight() {
  return {
    id: 321,
    from: "LBA",
    to: "AMS",
    departureTime: "08:10",
    arrivalTime: "10:20",
    departureDate: "2026-06-01",
    duration: "1h 10m",
    stops: 0,
    airline: "LeedsAir",
    flightNumber: "LS205",
    travelClass: "economy",
    totalPrice: 89,
    selectedFare: {
      label: "Saver",
      baggage: "1 cabin bag",
      changes: "Fee applies",
      refund: "Non-refundable",
    },
    searchParams: {
      adults: 1,
      children: 0,
      infants: 0,
    },
  };
}

beforeEach(() => {
  mockLogin.mockReset();
  mockAdminLogin.mockReset();
  mockRegister.mockReset();
  mockCreateBooking.mockReset();
  mockLoginUser.mockReset();
  mockLogoutUser.mockReset();
  mockAuthState = {
    user: null,
    authLoading: false,
    loginUser: mockLoginUser,
    logoutUser: mockLogoutUser,
  };
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("LoginPage", () => {
  it("logs the user in and navigates home after a successful sign-in", async () => {
    const onNavigate = vi.fn();
    mockLogin.mockResolvedValue({
      token: "token-123",
      user: { id: 4, firstName: "Jamie", lastName: "Lee", email: "jamie@test.com" },
    });

    render(<LoginPage onNavigate={onNavigate} />);

    await userEvent.type(screen.getByPlaceholderText(/your@email\.com/i), "jamie@test.com");
    await userEvent.type(screen.getByPlaceholderText(/••••••••/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("jamie@test.com", "password123");
      expect(mockLoginUser).toHaveBeenCalledWith(
        "token-123",
        expect.objectContaining({ email: "jamie@test.com" }),
      );
      expect(onNavigate).toHaveBeenCalledWith("home");
    });
  });
});

describe("AdminLoginPage", () => {
  it("stores the admin token and opens the admin dashboard after login", async () => {
    const onNavigate = vi.fn();
    mockAdminLogin.mockResolvedValueOnce({ token: "admin-test-token" });

    render(<AdminLoginPage onNavigate={onNavigate} />);

    await userEvent.type(screen.getByPlaceholderText(/admin username/i), "admin");
    await userEvent.type(screen.getByPlaceholderText(/••••••••/i), "admin12345");
    await userEvent.click(screen.getByRole("button", { name: /sign in to admin/i }));

    await waitFor(() => {
      expect(localStorage.getItem("adminToken")).toBe("admin-test-token");
      expect(onNavigate).toHaveBeenCalledWith("admin-dashboard");
    });
  });
});

describe("BookingFlowPage", () => {
  it("shows a payment validation error when card details are incomplete", async () => {
    mockAuthState = {
      user: { id: 8, firstName: "Alex", lastName: "Taylor", email: "alex@test.com" },
      authLoading: false,
      loginUser: mockLoginUser,
      logoutUser: mockLogoutUser,
    };

    render(<BookingFlowPage flight={buildFlight()} onNavigate={vi.fn()} onComplete={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.type(screen.getByPlaceholderText(/GB123456789/i), "123456789");
    await userEvent.click(screen.getByRole("button", { name: /continue to seats/i }));
    await userEvent.click(screen.getByRole("button", { name: /skip this passenger/i }));
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /i agree to the/i }));
    await userEvent.click(screen.getByRole("button", { name: /pay £89/i }));

    expect(await screen.findByText(/check your card number, expiry date, cardholder name, and cvv/i)).toBeInTheDocument();
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it("submits a booking and calls onComplete when payment details are valid", async () => {
    const onComplete = vi.fn();
    mockAuthState = {
      user: { id: 9, firstName: "Morgan", lastName: "Stone", email: "morgan@test.com" },
      authLoading: false,
      loginUser: mockLoginUser,
      logoutUser: mockLogoutUser,
    };
    mockCreateBooking.mockResolvedValue({
      bookingReference: "LEEDS9988",
      status: "Confirmed",
    });

    render(<BookingFlowPage flight={buildFlight()} onNavigate={vi.fn()} onComplete={onComplete} />);

    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.type(screen.getByPlaceholderText(/GB123456789/i), "AA1234567");
    await userEvent.click(screen.getByRole("button", { name: /continue to seats/i }));
    await userEvent.click(screen.getByRole("button", { name: /skip this passenger/i }));
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.type(screen.getByPlaceholderText(/1234 5678 9012 3456/i), "4111 1111 1111 1111");
    await userEvent.type(screen.getByPlaceholderText(/mm \/ yy/i), "12/30");
    await userEvent.type(screen.getByPlaceholderText(/^123$/i), "123");
    await userEvent.type(screen.getByPlaceholderText(/as it appears on your card/i), "Morgan Stone");
    await userEvent.click(screen.getByRole("checkbox", { name: /i agree to the/i }));
    await userEvent.click(screen.getByRole("button", { name: /pay £89/i }));

    await waitFor(() => {
      expect(mockCreateBooking).toHaveBeenCalledWith(expect.objectContaining({
        userId: 9,
        flightId: "321",
        totalPrice: 89,
      }));
      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        bookingReference: "LEEDS9988",
      }));
    });
  });
});
