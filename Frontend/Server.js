/**
 * LeedsAir Mock Backend
 * Pure Node.js — no dependencies needed.
 * Run: node server.js
 * Listens on http://localhost:8080
 */

import http from "http";
const PORT = 8080;

// ── In-memory data store ─────────────────────────────────

const db = {
  users: [
    {
      id: "u1",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      password: "password123",
      phone: "+44 7700 111111",
      loyaltyPoints: 1250,
      role: "member",
    },
    {
      id: "u2",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      password: "password123",
      phone: "+44 7700 222222",
      loyaltyPoints: 3400,
      role: "member",
    },
  ],

  admins: [
    { id: "a1", username: "admin", password: "admin123", name: "Admin User" },
  ],

  flights: [
    {
      id: "FL001",
      flightNumber: "LS101",
      airline: "LeedsAir",
      from: "LBA",
      to: "LHR",
      departureTime: "07:30",
      arrivalTime: "08:45",
      departureDate: "2026-04-15",
      duration: "1h 15m",
      stops: 0,
      price: 89,
      availableSeats: 45,
    },
    {
      id: "FL002",
      flightNumber: "LS205",
      airline: "LeedsAir",
      from: "LBA",
      to: "LHR",
      departureTime: "12:10",
      arrivalTime: "13:25",
      departureDate: "2026-04-15",
      duration: "1h 15m",
      stops: 0,
      price: 112,
      availableSeats: 12,
    },
    {
      id: "FL003",
      flightNumber: "LS310",
      airline: "LeedsAir",
      from: "LBA",
      to: "AMS",
      departureTime: "09:00",
      arrivalTime: "11:30",
      departureDate: "2026-04-15",
      duration: "2h 30m",
      stops: 0,
      price: 145,
      availableSeats: 30,
    },
    {
      id: "FL004",
      flightNumber: "LS412",
      airline: "LeedsAir",
      from: "LBA",
      to: "BCN",
      departureTime: "06:15",
      arrivalTime: "09:45",
      departureDate: "2026-04-16",
      duration: "3h 30m",
      stops: 0,
      price: 198,
      availableSeats: 28,
    },
    {
      id: "FL005",
      flightNumber: "LS501",
      airline: "LeedsAir",
      from: "LHR",
      to: "LBA",
      departureTime: "18:00",
      arrivalTime: "19:15",
      departureDate: "2026-04-20",
      duration: "1h 15m",
      stops: 0,
      price: 95,
      availableSeats: 60,
    },
    {
      id: "FL006",
      flightNumber: "LS607",
      airline: "LeedsAir",
      from: "LBA",
      to: "DXB",
      departureTime: "21:45",
      arrivalTime: "07:30",
      departureDate: "2026-04-18",
      duration: "7h 45m",
      stops: 1,
      price: 420,
      availableSeats: 14,
    },

    // Extra flights added for dynamic calendar/date-bar testing
    { id:"FL007", flightNumber:"LS102", airline:"LeedsAir", from:"LBA", to:"LHR", departureTime:"09:00", arrivalTime:"10:15", departureDate:"2026-04-16", duration:"1h 15m", stops:0, price:95,  availableSeats:30 },
    { id:"FL008", flightNumber:"LS103", airline:"LeedsAir", from:"LBA", to:"LHR", departureTime:"14:30", arrivalTime:"15:45", departureDate:"2026-04-17", duration:"1h 15m", stops:0, price:78,  availableSeats:22 },
    { id:"FL009", flightNumber:"LS104", airline:"LeedsAir", from:"LBA", to:"LHR", departureTime:"07:15", arrivalTime:"08:30", departureDate:"2026-04-18", duration:"1h 15m", stops:0, price:112, availableSeats:8  },
    { id:"FL010", flightNumber:"LS105", airline:"LeedsAir", from:"LBA", to:"LHR", departureTime:"11:00", arrivalTime:"12:15", departureDate:"2026-04-19", duration:"1h 15m", stops:0, price:69,  availableSeats:40 },
    { id:"FL011", flightNumber:"LS106", airline:"LeedsAir", from:"LBA", to:"LHR", departureTime:"16:45", arrivalTime:"18:00", departureDate:"2026-04-20", duration:"1h 15m", stops:0, price:88,  availableSeats:15 },
    { id:"FL012", flightNumber:"LS107", airline:"LeedsAir", from:"LBA", to:"LHR", departureTime:"08:00", arrivalTime:"09:15", departureDate:"2026-04-21", duration:"1h 15m", stops:0, price:74,  availableSeats:50 },
    { id:"FL013", flightNumber:"LS311", airline:"LeedsAir", from:"LBA", to:"AMS", departureTime:"10:30", arrivalTime:"13:00", departureDate:"2026-04-16", duration:"2h 30m", stops:0, price:155, availableSeats:18 },
    { id:"FL014", flightNumber:"LS312", airline:"LeedsAir", from:"LBA", to:"AMS", departureTime:"07:00", arrivalTime:"09:30", departureDate:"2026-04-17", duration:"2h 30m", stops:0, price:132, availableSeats:25 },
    { id:"FL015", flightNumber:"LS313", airline:"LeedsAir", from:"LBA", to:"AMS", departureTime:"13:15", arrivalTime:"15:45", departureDate:"2026-04-19", duration:"2h 30m", stops:0, price:118, availableSeats:32 },
    { id:"FL016", flightNumber:"LS413", airline:"LeedsAir", from:"LBA", to:"BCN", departureTime:"08:30", arrivalTime:"12:00", departureDate:"2026-04-17", duration:"3h 30m", stops:0, price:175, availableSeats:20 },
    { id:"FL017", flightNumber:"LS414", airline:"LeedsAir", from:"LBA", to:"BCN", departureTime:"14:00", arrivalTime:"17:30", departureDate:"2026-04-18", duration:"3h 30m", stops:0, price:210, availableSeats:14 },
    { id:"FL018", flightNumber:"LS415", airline:"LeedsAir", from:"LBA", to:"BCN", departureTime:"07:45", arrivalTime:"11:15", departureDate:"2026-04-20", duration:"3h 30m", stops:0, price:165, availableSeats:28 },
  ],

  bookings: [
    {
      id: "BK001",
      bookingReference: "LEEDS1A",
      userId: "u1",
      flightId: "FL001",
      status: "Confirmed",
      travelClass: "Economy",
      seat: "14A",
      totalPrice: 89,
      createdAt: "2026-03-01T10:00:00Z",
      flight: {
        flightNumber: "LS101",
        from: "LBA",
        to: "LHR",
        departureTime: "07:30",
        arrivalTime: "08:45",
        departureDate: "2026-04-15",
        duration: "1h 15m",
      },
      passenger: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "+44 7700 111111",
        dateOfBirth: "1990-05-12",
        passportNumber: "GB123456",
      },
    },
    {
      id: "BK002",
      bookingReference: "LEEDS2B",
      userId: "u1",
      flightId: "FL003",
      status: "Completed",
      travelClass: "Business",
      seat: "2C",
      totalPrice: 380,
      createdAt: "2026-01-15T14:30:00Z",
      flight: {
        flightNumber: "LS310",
        from: "LBA",
        to: "AMS",
        departureTime: "09:00",
        arrivalTime: "11:30",
        departureDate: "2026-02-10",
        duration: "2h 30m",
      },
      passenger: {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "+44 7700 111111",
        dateOfBirth: "1990-05-12",
        passportNumber: "GB123456",
      },
    },
    {
      id: "BK003",
      bookingReference: "LEEDS3C",
      userId: "u2",
      flightId: "FL004",
      status: "Cancelled",
      travelClass: "Economy",
      seat: null,
      totalPrice: 198,
      createdAt: "2026-02-20T09:00:00Z",
      flight: {
        flightNumber: "LS412",
        from: "LBA",
        to: "BCN",
        departureTime: "06:15",
        arrivalTime: "09:45",
        departureDate: "2026-04-16",
        duration: "3h 30m",
      },
      passenger: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+44 7700 222222",
        dateOfBirth: "1985-11-30",
        passportNumber: "GB654321",
      },
    },
  ],

  complaints: [],
  loyaltyTransactions: [],
};

let nextId = 100;
function uid(prefix = "") {
  return `${prefix}${++nextId}`;
}

// Simple JWT-like token (base64 of JSON payload — NOT secure, just for testing)
function makeToken(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
function parseToken(token) {
  try {
    return JSON.parse(Buffer.from(token, "base64").toString("utf8"));
  } catch {
    return null;
  }
}
function getUserFromReq(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const payload = parseToken(token);
  if (!payload) return null;
  return db.users.find((u) => u.id === payload.userId) || null;
}
function getAdminFromReq(req) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return null;
  const payload = parseToken(token);
  if (!payload || !payload.isAdmin) return null;
  return db.admins.find((a) => a.id === payload.adminId) || null;
}

// ── HTTP helpers ─────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  const json = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(json);
}

function ok(res, data) { send(res, 200, data); }
function created(res, data) { send(res, 201, data); }
function badRequest(res, message) { send(res, 400, { message }); }
function unauthorized(res, message = "Unauthorized") { send(res, 401, { message }); }
function notFound(res, message = "Not found") { send(res, 404, { message }); }

// ── Router ───────────────────────────────────────────────

async function router(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  console.log(`  ${method} ${path}`);

  // ── Auth ───────────────────────────────────────────────

  if (method === "POST" && path === "/api/auth/login") {
    const body = await readBody(req);
    const user = db.users.find(
      (u) => u.email === body.email && u.password === body.password
    );
    if (!user) return unauthorized(res, "Invalid email or password");
    const token = makeToken({ userId: user.id });
    const { password, ...safeUser } = user;
    return ok(res, { token, user: safeUser });
  }

  if (method === "POST" && path === "/api/auth/register") {
    const body = await readBody(req);
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return badRequest(res, "Missing required fields");
    }
    if (db.users.find((u) => u.email === body.email)) {
      return badRequest(res, "An account with this email already exists");
    }
    const newUser = {
      id: uid("u"),
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password,
      phone: body.phone || "",
      loyaltyPoints: 500, // welcome bonus
      role: "member",
    };
    db.users.push(newUser);
    const token = makeToken({ userId: newUser.id });
    const { password, ...safeUser } = newUser;
    return created(res, { token, user: safeUser });
  }

  if (method === "GET" && path === "/api/auth/profile") {
    const user = getUserFromReq(req);
    if (!user) return unauthorized(res);
    const { password, ...safeUser } = user;
    return ok(res, safeUser);
  }

  // ── Flights ────────────────────────────────────────────

  if (method === "GET" && path === "/api/flights") {
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const date = url.searchParams.get("departureDate") || "";

    let results = [...db.flights];
    if (from) results = results.filter((f) => f.from.toLowerCase().includes(from.toLowerCase()));
    if (to)   results = results.filter((f) => f.to.toLowerCase().includes(to.toLowerCase()));
    if (date) results = results.filter((f) => f.departureDate === date);

    // Simulate delay
    await new Promise((r) => setTimeout(r, 400));
    return ok(res, results);
  }

  // ── Bookings ───────────────────────────────────────────

  if (method === "GET" && path === "/api/bookings") {
    const user = getUserFromReq(req);
    // If logged in return their bookings, else return all (guest fallback)
    const bookings = user
      ? db.bookings.filter((b) => b.userId === user.id)
      : db.bookings;
    return ok(res, bookings);
  }

  if (method === "GET" && path === "/api/bookings/lookup") {
    const ref = url.searchParams.get("ref") || "";
    const lastName = url.searchParams.get("lastName") || "";
    const booking = db.bookings.find(
      (b) =>
        b.bookingReference.toLowerCase() === ref.toLowerCase() &&
        b.passenger.lastName.toLowerCase() === lastName.toLowerCase()
    );
    if (!booking) return notFound(res, "Booking not found. Check your reference and surname.");
    return ok(res, booking);
  }

  if (method === "POST" && path === "/api/bookings") {
    const body = await readBody(req);
    const user = getUserFromReq(req);
    const flight = db.flights.find((f) => f.id === body.flightId);
    if (!flight) return badRequest(res, "Flight not found");

    const ref = "LEEDS" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const booking = {
      id: uid("BK"),
      bookingReference: ref,
      userId: user?.id || null,
      flightId: flight.id,
      status: "Confirmed",
      travelClass: body.travelClass || "Economy",
      seat: body.seat || null,
      totalPrice: flight.price,
      createdAt: new Date().toISOString(),
      flight: {
        flightNumber: flight.flightNumber,
        from: flight.from,
        to: flight.to,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        departureDate: flight.departureDate,
        duration: flight.duration,
      },
      passenger: body.passenger,
    };
    db.bookings.push(booking);

    // Award loyalty points if logged in
    if (user) {
      const pts = body.travelClass === "Business"
        ? Math.round(flight.price * 2)
        : Math.round(flight.price);
      user.loyaltyPoints = (user.loyaltyPoints || 0) + pts;
    }

    return created(res, booking);
  }

  // PUT /api/bookings/:id
  const modifyMatch = path.match(/^\/api\/bookings\/([^/]+)$/);
  if (method === "PUT" && modifyMatch) {
    const id = modifyMatch[1];
    const booking = db.bookings.find((b) => b.id === id || b.bookingReference === id);
    if (!booking) return notFound(res, "Booking not found");
    const body = await readBody(req);
    Object.assign(booking, body);
    return ok(res, booking);
  }

  // POST /api/bookings/:id/cancel
  const cancelMatch = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    const id = cancelMatch[1];
    const booking = db.bookings.find((b) => b.id === id || b.bookingReference === id);
    if (!booking) return notFound(res, "Booking not found");
    booking.status = "Cancelled";
    return ok(res, { message: "Booking cancelled successfully", booking });
  }

  // POST /api/bookings/:id/checkin
  const checkinMatch = path.match(/^\/api\/bookings\/([^/]+)\/checkin$/);
  if (method === "POST" && checkinMatch) {
    const id = checkinMatch[1];
    const booking = db.bookings.find((b) => b.id === id || b.bookingReference === id);
    if (!booking) return notFound(res, "Booking not found");
    booking.checkedIn = true;
    const seat = booking.seat || `${Math.floor(Math.random() * 30) + 1}${["A","B","C","D","E","F"][Math.floor(Math.random()*6)]}`;
    booking.seat = seat;
    return ok(res, {
      message: "Check-in successful",
      seat,
      gate: `G${Math.floor(Math.random() * 20) + 1}`,
      boardingTime: "45 minutes before departure",
      bookingReference: booking.bookingReference,
    });
  }

  // ── Loyalty ────────────────────────────────────────────

  if (method === "GET" && path === "/api/loyalty") {
    const user = getUserFromReq(req);
    if (!user) return unauthorized(res);
    return ok(res, {
      points: user.loyaltyPoints,
      lifetimePoints: user.loyaltyPoints + 500,
      tier: user.loyaltyPoints >= 5000 ? "Gold" : user.loyaltyPoints >= 2000 ? "Silver" : "Bronze",
    });
  }

  if (method === "POST" && path === "/api/loyalty/redeem") {
    const user = getUserFromReq(req);
    if (!user) return unauthorized(res);
    const body = await readBody(req);
    if (!body.pointsCost) return badRequest(res, "pointsCost required");
    if (user.loyaltyPoints < body.pointsCost) {
      return badRequest(res, "Insufficient points");
    }
    user.loyaltyPoints -= body.pointsCost;
    return ok(res, {
      message: "Reward redeemed successfully! Check your email for your voucher.",
      remainingPoints: user.loyaltyPoints,
      rewardId: body.rewardId,
    });
  }

  // ── Complaints ─────────────────────────────────────────

  if (method === "POST" && path === "/api/complaints") {
    const body = await readBody(req);
    if (!body.bookingReference || !body.category || !body.description) {
      return badRequest(res, "bookingReference, category and description are required");
    }
    const complaint = {
      id: uid("COMP"),
      confirmationNumber: "CMP" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      ...body,
      status: "Received",
      createdAt: new Date().toISOString(),
    };
    db.complaints.push(complaint);
    return created(res, complaint);
  }

  // ── Admin Auth ─────────────────────────────────────────

  if (method === "POST" && path === "/api/admin/auth/login") {
    const body = await readBody(req);
    const admin = db.admins.find(
      (a) => a.username === body.username && a.password === body.password
    );
    if (!admin) return unauthorized(res, "Invalid admin credentials");
    const token = makeToken({ adminId: admin.id, isAdmin: true });
    return ok(res, { token, admin: { id: admin.id, name: admin.name } });
  }

  // ── Admin Bookings ─────────────────────────────────────

  if (method === "GET" && path === "/api/admin/bookings") {
    const admin = getAdminFromReq(req);
    if (!admin) return unauthorized(res, "Admin access required");

    const status = url.searchParams.get("status");
    const route = url.searchParams.get("route");
    let results = [...db.bookings];
    if (status) results = results.filter((b) => b.status === status);
    if (route)  results = results.filter((b) =>
      `${b.flight?.from}-${b.flight?.to}`.toLowerCase().includes(route.toLowerCase())
    );
    return ok(res, results);
  }

  // ── Admin Metrics ──────────────────────────────────────

  if (method === "GET" && path === "/api/admin/metrics") {
    const admin = getAdminFromReq(req);
    if (!admin) return unauthorized(res, "Admin access required");

    const cancelled = db.bookings.filter((b) => b.status === "Cancelled").length;
    const totalRevenue = db.bookings
      .filter((b) => b.status !== "Cancelled")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Most popular route
    const routeCounts = {};
    db.bookings.forEach((b) => {
      const r = `${b.flight?.from || "?"} → ${b.flight?.to || "?"}`;
      routeCounts[r] = (routeCounts[r] || 0) + 1;
    });
    const popularRoute = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return ok(res, {
      totalBookings: db.bookings.length,
      cancellations: cancelled,
      cancellationRate: Math.round((cancelled / db.bookings.length) * 100),
      totalRevenue,
      popularRoute,
      activeUsers: db.users.length,
    });
  }

  // ── Admin Reports ──────────────────────────────────────

  if (method === "GET" && path === "/api/admin/reports") {
    const admin = getAdminFromReq(req);
    if (!admin) return unauthorized(res, "Admin access required");

    // Bookings per flight
    const bpf = {};
    db.bookings.forEach((b) => {
      const fn = b.flight?.flightNumber || "Unknown";
      bpf[fn] = (bpf[fn] || 0) + 1;
    });

    // Revenue per route
    const rpr = {};
    db.bookings
      .filter((b) => b.status !== "Cancelled")
      .forEach((b) => {
        const r = `${b.flight?.from || "?"} → ${b.flight?.to || "?"}`;
        rpr[r] = (rpr[r] || 0) + (b.totalPrice || 0);
      });

    const cancelled = db.bookings.filter((b) => b.status === "Cancelled").length;

    return ok(res, {
      bookingsPerFlight: Object.entries(bpf).map(([flightNumber, count]) => ({ flightNumber, count })),
      popularRoutes: Object.entries(rpr)
        .map(([route, count]) => ({ route, count }))
        .sort((a, b) => b.count - a.count),
      revenuePerRoute: Object.entries(rpr)
        .map(([route, revenue]) => ({ route, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      cancellationRate: Math.round((cancelled / db.bookings.length) * 100),
      peakBookingHour: "14:00–15:00",
    });
  }

  // ── 404 ────────────────────────────────────────────────

  return notFound(res, `No route found for ${method} ${path}`);
}

// ── Start server ─────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (err) {
    console.error("Server error:", err);
    send(res, 500, { message: "Internal server error", detail: err.message });
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  ✈  LeedsAir Mock Backend");
  console.log(`  🟢 Running on http://localhost:${PORT}`);
  console.log("");
  console.log("  Test accounts:");
  console.log("    Email:    jane@example.com  |  Password: password123");
  console.log("    Email:    john@example.com  |  Password: password123");
  console.log("");
  console.log("  Admin login:");
  console.log("    Username: admin             |  Password: admin123");
  console.log("");
  console.log("  Endpoints:");
  console.log("    POST /api/auth/login");
  console.log("    POST /api/auth/register");
  console.log("    GET  /api/auth/profile");
  console.log("    GET  /api/flights");
  console.log("    GET  /api/bookings");
  console.log("    GET  /api/bookings/lookup?ref=&lastName=");
  console.log("    POST /api/bookings");
  console.log("    PUT  /api/bookings/:id");
  console.log("    POST /api/bookings/:id/cancel");
  console.log("    POST /api/bookings/:id/checkin");
  console.log("    GET  /api/loyalty");
  console.log("    POST /api/loyalty/redeem");
  console.log("    POST /api/complaints");
  console.log("    POST /api/admin/auth/login");
  console.log("    GET  /api/admin/bookings");
  console.log("    GET  /api/admin/metrics");
  console.log("    GET  /api/admin/reports");
  console.log("");
});

// NOTE: server.js already has full flight data.
// To make the dynamic calendar/date-bar work better in testing,
// add more flights to db.flights after server start.
// The patch below is auto-applied — paste it anywhere after db definition.