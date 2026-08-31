// ============================================================
// DEVELOPMENT DATABASE SEED SCRIPT
// ============================================================
// This script is DEVELOPMENT-ONLY and must NEVER run in production.
// It populates the MongoDB database with realistic test data for
// testing the frontend, APIs, and admin dashboard.
//
// Usage:  npm run seed
// Safety: Aborts if NODE_ENV === "production"
//         Only deletes records created by previous seed runs
//         Safe to run repeatedly (idempotent)
//
// DO NOT import or require this file from any server/app code.
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Import existing models — DO NOT MODIFY THESE FILES
const User = require("../src/models/User");
const Bus = require("../src/models/Bus");
const Route = require("../src/models/Route");
const Trip = require("../src/models/Trip");
const TripSeat = require("../src/models/TripSeat");
const Booking = require("../src/models/Booking");
const Payment = require("../src/models/Payment");
const WaitingList = require("../src/models/WaitingList");

// ============================================================
// SEED IDENTIFIERS (used for idempotent cleanup)
// ============================================================

const SEED_EMAILS = [
  "admin@busbooking.dev",
  "rahul@busbooking.dev",
  "priya@busbooking.dev",
  "amit@busbooking.dev",
  "sneha@busbooking.dev",
  "vikram@busbooking.dev",
];

const SEED_BUS_NUMBERS = [
  "GJ-05-AB-1234",
  "GJ-06-CD-5678",
  "MH-04-EF-9012",
  "GJ-01-GH-3456",
  "GJ-05-IJ-7890",
  "MH-01-KL-2345",
];

const SEED_ROUTE_PAIRS = [
  { source: "Surat", destination: "Ahmedabad" },
  { source: "Ahmedabad", destination: "Vadodara" },
  { source: "Surat", destination: "Mumbai" },
  { source: "Vadodara", destination: "Ahmedabad" },
  { source: "Ahmedabad", destination: "Rajkot" },
  { source: "Mumbai", destination: "Surat" },
  { source: "Mumbai", destination: "Ahmedabad" },
];

// ============================================================
// DEVELOPMENT CREDENTIALS (plaintext — dev only)
// ============================================================

const DEV_CREDENTIALS = {
  admin: { email: "admin@busbooking.dev", password: "Admin@123" },
  users: [
    { email: "rahul@busbooking.dev", password: "User@123" },
    { email: "priya@busbooking.dev", password: "User@123" },
    { email: "amit@busbooking.dev", password: "User@123" },
    { email: "sneha@busbooking.dev", password: "User@123" },
    { email: "vikram@busbooking.dev", password: "User@123" },
  ],
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Returns a Date set to UTC midnight, `daysAhead` days from now.
 * This ensures the trip search API (which constructs UTC day boundaries
 * from a YYYY-MM-DD query param) can match these dates.
 */
function getFutureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
}

/**
 * Returns a Date that is `daysAgo` days before now.
 * Used for backdating bookings/payments for dashboard testing.
 */
function getPastDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/**
 * Formats a Date as YYYY-MM-DD for display and search queries.
 */
function formatDate(date) {
  return date.toISOString().split("T")[0];
}

// ============================================================
// CLEANUP — Remove previous seed data only
// ============================================================

async function cleanup() {
  console.log("\n🧹 Cleaning up previous seed data...");

  // 1. Find existing seed entities by their deterministic identifiers
  const seedUsers = await User.find({ email: { $in: SEED_EMAILS } });
  const seedUserIds = seedUsers.map((u) => u._id);

  const seedBuses = await Bus.find({ busNumber: { $in: SEED_BUS_NUMBERS } });
  const seedBusIds = seedBuses.map((b) => b._id);

  const seedRoutes = await Route.find({ $or: SEED_ROUTE_PAIRS });
  const seedRouteIds = seedRoutes.map((r) => r._id);

  // 2. Find seed trips (referenced by seed buses or seed routes)
  const tripQuery = [];
  if (seedBusIds.length > 0) tripQuery.push({ busId: { $in: seedBusIds } });
  if (seedRouteIds.length > 0) tripQuery.push({ routeId: { $in: seedRouteIds } });

  let seedTripIds = [];
  if (tripQuery.length > 0) {
    const seedTrips = await Trip.find({ $or: tripQuery });
    seedTripIds = seedTrips.map((t) => t._id);
  }

  // 3. Find seed bookings (by seed users or on seed trips)
  const bookingQuery = [];
  if (seedUserIds.length > 0) bookingQuery.push({ userId: { $in: seedUserIds } });
  if (seedTripIds.length > 0) bookingQuery.push({ tripId: { $in: seedTripIds } });

  let seedBookingIds = [];
  if (bookingQuery.length > 0) {
    const seedBookings = await Booking.find({ $or: bookingQuery });
    seedBookingIds = seedBookings.map((b) => b._id);
  }

  // 4. Delete in reverse-dependency order
  const counts = {};

  // Waiting List
  const wlQuery = [];
  if (seedUserIds.length > 0) wlQuery.push({ userId: { $in: seedUserIds } });
  if (seedTripIds.length > 0) wlQuery.push({ tripId: { $in: seedTripIds } });
  if (wlQuery.length > 0) {
    const r = await WaitingList.deleteMany({ $or: wlQuery });
    counts.waitingList = r.deletedCount;
  } else {
    counts.waitingList = 0;
  }

  // Payments (by booking or by seed razorpay order prefix)
  const payQuery = [{ razorpayOrderId: { $regex: /^order_seed_/ } }];
  if (seedBookingIds.length > 0) payQuery.push({ bookingId: { $in: seedBookingIds } });
  const payR = await Payment.deleteMany({ $or: payQuery });
  counts.payments = payR.deletedCount;

  // Bookings
  if (seedBookingIds.length > 0) {
    const bookR = await Booking.deleteMany({ _id: { $in: seedBookingIds } });
    counts.bookings = bookR.deletedCount;
  } else {
    counts.bookings = 0;
  }

  // TripSeats
  if (seedTripIds.length > 0) {
    const tsR = await TripSeat.deleteMany({ tripId: { $in: seedTripIds } });
    counts.tripSeats = tsR.deletedCount;
  } else {
    counts.tripSeats = 0;
  }

  // Trips
  if (seedTripIds.length > 0) {
    const trR = await Trip.deleteMany({ _id: { $in: seedTripIds } });
    counts.trips = trR.deletedCount;
  } else {
    counts.trips = 0;
  }

  // Routes (NOTE: deletes any route matching these source/destination pairs)
  const rtR = await Route.deleteMany({ $or: SEED_ROUTE_PAIRS });
  counts.routes = rtR.deletedCount;

  // Buses
  const bsR = await Bus.deleteMany({ busNumber: { $in: SEED_BUS_NUMBERS } });
  counts.buses = bsR.deletedCount;

  // Users
  const usR = await User.deleteMany({ email: { $in: SEED_EMAILS } });
  counts.users = usR.deletedCount;

  console.log(
    `   Deleted: ${counts.users} users, ${counts.buses} buses, ${counts.routes} routes, ` +
      `${counts.trips} trips, ${counts.tripSeats} trip seats, ${counts.bookings} bookings, ` +
      `${counts.payments} payments, ${counts.waitingList} waiting list entries`
  );
}

// ============================================================
// CREATE USERS
// ============================================================

async function createUsers() {
  console.log("\n👤 Creating users...");

  // Hash passwords using the same bcrypt(10) salt rounds as authController.js
  const hashedAdmin = await bcrypt.hash("Admin@123", 10);
  const hashedUser = await bcrypt.hash("User@123", 10);

  const userData = [
    { name: "Admin User", email: "admin@busbooking.dev", password: hashedAdmin, role: "ADMIN", isActive: true },
    { name: "Rahul Sharma", email: "rahul@busbooking.dev", password: hashedUser, role: "USER", isActive: true },
    { name: "Priya Patel", email: "priya@busbooking.dev", password: hashedUser, role: "USER", isActive: true },
    { name: "Amit Singh", email: "amit@busbooking.dev", password: hashedUser, role: "USER", isActive: true },
    { name: "Sneha Desai", email: "sneha@busbooking.dev", password: hashedUser, role: "USER", isActive: true },
    { name: "Vikram Mehta", email: "vikram@busbooking.dev", password: hashedUser, role: "USER", isActive: true },
  ];

  const users = await User.insertMany(userData);
  console.log(`   ✅ Created ${users.length} users (1 ADMIN, 5 USER)`);
  return users;
}

// ============================================================
// CREATE BUSES
// ============================================================

async function createBuses() {
  console.log("\n🚌 Creating buses...");

  const busData = [
    {
      busNumber: "GJ-05-AB-1234",
      operator: "Gujarat Travels",
      busType: "AC",
      seatCapacity: 40,
      amenities: ["WiFi", "Charging Point", "Water Bottle"],
      isActive: true,
    },
    {
      busNumber: "GJ-06-CD-5678",
      operator: "Surat Express",
      busType: "NON_AC",
      seatCapacity: 50,
      amenities: ["Water Bottle"],
      isActive: true,
    },
    {
      busNumber: "MH-04-EF-9012",
      operator: "Mumbai Darshan",
      busType: "SLEEPER",
      seatCapacity: 30,
      amenities: ["Blanket", "Pillow", "Charging Point"],
      isActive: true,
    },
    {
      busNumber: "GJ-01-GH-3456",
      operator: "Ahmedabad Motors",
      busType: "SEMI_SLEEPER",
      seatCapacity: 36,
      amenities: ["Charging Point", "Reading Light"],
      isActive: true,
    },
    {
      busNumber: "GJ-05-IJ-7890",
      operator: "Royal Gujarat",
      busType: "AC",
      seatCapacity: 44,
      amenities: ["WiFi", "Charging Point", "Snacks", "Blanket"],
      isActive: true,
    },
    {
      busNumber: "MH-01-KL-2345",
      operator: "Express Connect",
      busType: "NON_AC",
      seatCapacity: 52,
      amenities: ["Water Bottle", "Fan"],
      isActive: true,
    },
  ];

  const buses = await Bus.insertMany(busData);
  console.log(`   ✅ Created ${buses.length} buses (AC, NON_AC, SLEEPER, SEMI_SLEEPER)`);
  return buses;
}

// ============================================================
// CREATE ROUTES
// ============================================================

async function createRoutes() {
  console.log("\n🛣️  Creating routes...");

  const routeData = [
    {
      source: "Surat",
      destination: "Ahmedabad",
      stops: [
        { name: "Bharuch", order: 1 },
        { name: "Anand", order: 2 },
        { name: "Nadiad", order: 3 },
      ],
      isActive: true,
    },
    {
      source: "Ahmedabad",
      destination: "Vadodara",
      stops: [
        { name: "Nadiad", order: 1 },
        { name: "Anand", order: 2 },
      ],
      isActive: true,
    },
    {
      source: "Surat",
      destination: "Mumbai",
      stops: [
        { name: "Vapi", order: 1 },
        { name: "Dahanu", order: 2 },
        { name: "Virar", order: 3 },
      ],
      isActive: true,
    },
    {
      source: "Vadodara",
      destination: "Ahmedabad",
      stops: [
        { name: "Anand", order: 1 },
        { name: "Nadiad", order: 2 },
      ],
      isActive: true,
    },
    {
      source: "Ahmedabad",
      destination: "Rajkot",
      stops: [
        { name: "Surendranagar", order: 1 },
        { name: "Wankaner", order: 2 },
      ],
      isActive: true,
    },
    {
      source: "Mumbai",
      destination: "Surat",
      stops: [
        { name: "Virar", order: 1 },
        { name: "Dahanu", order: 2 },
        { name: "Vapi", order: 3 },
      ],
      isActive: true,
    },
    {
      source: "Mumbai",
      destination: "Ahmedabad",
      stops: [
        { name: "Surat", order: 1 },
        { name: "Vadodara", order: 2 },
      ],
      isActive: true,
    },
  ];

  const routes = await Route.insertMany(routeData);
  console.log(`   ✅ Created ${routes.length} routes`);
  return routes;
}

// ============================================================
// CREATE TRIPS
// ============================================================

async function createTrips(buses, routes) {
  console.log("\n🗓️  Creating trips...");

  // Future dates (UTC midnight) for seeding
  const date1 = getFutureDate(3); // +3 days
  const date2 = getFutureDate(5); // +5 days
  const date3 = getFutureDate(7); // +7 days
  const date4 = getFutureDate(10); // +10 days

  // Bus index reference:
  //   0: GJ-05-AB-1234  AC           40 seats
  //   1: GJ-06-CD-5678  NON_AC       50 seats
  //   2: MH-04-EF-9012  SLEEPER      30 seats
  //   3: GJ-01-GH-3456  SEMI_SLEEPER 36 seats
  //   4: GJ-05-IJ-7890  AC           44 seats
  //   5: MH-01-KL-2345  NON_AC       52 seats
  //
  // Route index reference:
  //   0: Surat → Ahmedabad
  //   1: Ahmedabad → Vadodara
  //   2: Surat → Mumbai
  //   3: Vadodara → Ahmedabad
  //   4: Ahmedabad → Rajkot
  //   5: Mumbai → Surat
  //   6: Mumbai → Ahmedabad
  //
  // All trips satisfy:
  //   - arrivalTime > departureTime (string comparison, as validated by tripController)
  //   - No bus overlaps on the same date

  const tripData = [
    // ── Date 1 (+3 days) ──────────────────────────────────────
    // [0] "Trip A" — Surat→Ahmedabad morning (BOOKED seat scenario)
    { busId: buses[0]._id, routeId: routes[0]._id, travelDate: date1, departureTime: "06:00", arrivalTime: "10:00", fare: 450, status: "SCHEDULED" },
    // [1] Surat→Ahmedabad afternoon
    { busId: buses[1]._id, routeId: routes[0]._id, travelDate: date1, departureTime: "13:00", arrivalTime: "17:00", fare: 350, status: "SCHEDULED" },
    // [2] Surat→Ahmedabad evening
    { busId: buses[4]._id, routeId: routes[0]._id, travelDate: date1, departureTime: "20:00", arrivalTime: "23:30", fare: 500, status: "SCHEDULED" },
    // [3] "Trip B" — Surat→Mumbai morning (all seats AVAILABLE)
    { busId: buses[2]._id, routeId: routes[2]._id, travelDate: date1, departureTime: "07:00", arrivalTime: "13:00", fare: 800, status: "SCHEDULED" },
    // [4] Surat→Mumbai evening
    { busId: buses[5]._id, routeId: routes[2]._id, travelDate: date1, departureTime: "18:00", arrivalTime: "23:59", fare: 750, status: "SCHEDULED" },

    // ── Date 2 (+5 days) ──────────────────────────────────────
    // [5] "Trip C" — Ahmedabad→Vadodara (BOOKED + CANCELLED scenario)
    { busId: buses[3]._id, routeId: routes[1]._id, travelDate: date2, departureTime: "08:00", arrivalTime: "10:30", fare: 200, status: "SCHEDULED" },
    // [6] Ahmedabad→Vadodara afternoon
    { busId: buses[0]._id, routeId: routes[1]._id, travelDate: date2, departureTime: "15:00", arrivalTime: "17:30", fare: 250, status: "SCHEDULED" },
    // [7] "Trip D" — Mumbai→Surat morning (LOCKED seat scenario)
    { busId: buses[2]._id, routeId: routes[5]._id, travelDate: date2, departureTime: "06:00", arrivalTime: "12:00", fare: 850, status: "SCHEDULED" },
    // [8] Mumbai→Surat evening
    { busId: buses[5]._id, routeId: routes[5]._id, travelDate: date2, departureTime: "19:00", arrivalTime: "23:59", fare: 700, status: "SCHEDULED" },

    // ── Date 3 (+7 days) ──────────────────────────────────────
    // [9] Vadodara→Ahmedabad morning
    { busId: buses[3]._id, routeId: routes[3]._id, travelDate: date3, departureTime: "09:00", arrivalTime: "11:30", fare: 200, status: "SCHEDULED" },
    // [10] Vadodara→Ahmedabad afternoon
    { busId: buses[1]._id, routeId: routes[3]._id, travelDate: date3, departureTime: "16:00", arrivalTime: "18:30", fare: 180, status: "SCHEDULED" },
    // [11] Ahmedabad→Rajkot morning
    { busId: buses[0]._id, routeId: routes[4]._id, travelDate: date3, departureTime: "07:00", arrivalTime: "12:00", fare: 550, status: "SCHEDULED" },
    // [12] Ahmedabad→Rajkot afternoon
    { busId: buses[4]._id, routeId: routes[4]._id, travelDate: date3, departureTime: "14:00", arrivalTime: "19:00", fare: 600, status: "SCHEDULED" },

    // ── Date 4 (+10 days) ─────────────────────────────────────
    // [13] Mumbai→Ahmedabad morning
    { busId: buses[2]._id, routeId: routes[6]._id, travelDate: date4, departureTime: "06:00", arrivalTime: "14:00", fare: 1100, status: "SCHEDULED" },
    // [14] Mumbai→Ahmedabad evening
    { busId: buses[5]._id, routeId: routes[6]._id, travelDate: date4, departureTime: "20:00", arrivalTime: "23:59", fare: 1200, status: "SCHEDULED" },
    // [15] Surat→Ahmedabad morning
    { busId: buses[0]._id, routeId: routes[0]._id, travelDate: date4, departureTime: "06:00", arrivalTime: "10:00", fare: 480, status: "SCHEDULED" },
    // [16] Surat→Mumbai morning
    { busId: buses[4]._id, routeId: routes[2]._id, travelDate: date4, departureTime: "07:00", arrivalTime: "13:00", fare: 850, status: "SCHEDULED" },
    // [17] Mumbai→Surat morning
    { busId: buses[1]._id, routeId: routes[5]._id, travelDate: date4, departureTime: "08:00", arrivalTime: "14:00", fare: 780, status: "SCHEDULED" },
  ];

  const trips = await Trip.insertMany(tripData);
  console.log(`   ✅ Created ${trips.length} trips across 4 future dates`);
  return trips;
}

// ============================================================
// CREATE TRIP SEATS
// ============================================================

/**
 * Creates TripSeat records exactly matching the pattern in tripController.js:
 *   for seatNumber = 1 to bus.seatCapacity → status "AVAILABLE"
 * All seats start as AVAILABLE; specific seats are updated later
 * when bookings are created.
 */
async function createTripSeats(trips, buses) {
  console.log("\n💺 Creating trip seats...");

  const allSeats = [];

  for (const trip of trips) {
    const bus = buses.find((b) => b._id.toString() === trip.busId.toString());
    if (!bus) {
      console.error(`   ❌ Bus not found for trip ${trip._id}`);
      continue;
    }

    for (let seatNumber = 1; seatNumber <= bus.seatCapacity; seatNumber++) {
      allSeats.push({
        tripId: trip._id,
        seatNumber,
        status: "AVAILABLE",
      });
    }
  }

  // Insert in batches to handle large seat counts efficiently
  const BATCH_SIZE = 500;
  let totalInserted = 0;
  for (let i = 0; i < allSeats.length; i += BATCH_SIZE) {
    const batch = allSeats.slice(i, i + BATCH_SIZE);
    await TripSeat.insertMany(batch);
    totalInserted += batch.length;
  }

  console.log(`   ✅ Created ${totalInserted} trip seats across ${trips.length} trips`);
  return totalInserted;
}

// ============================================================
// CREATE BOOKINGS, PAYMENTS & UPDATE SEAT STATUSES
// ============================================================

/**
 * Creates 4 booking/payment scenarios:
 *   1. CONFIRMED (Rahul → Trip A seats [8,9])   + Payment SUCCESS
 *   2. CONFIRMED (Priya → Trip C seats [1,2])    + Payment SUCCESS
 *   3. CANCELLED (Amit  → Trip C seats [15,16])  + Payment REFUNDED
 *   4. PENDING   (Sneha → Trip D seats [5,6])    + Payment PENDING
 *
 * Updates corresponding TripSeat records to BOOKED or LOCKED.
 * Backdates confirmed/cancelled bookings so the dashboard revenue
 * trend (7-day) has meaningful data.
 */
async function createBookingsAndPayments(users, trips) {
  console.log("\n📋 Creating bookings and payments...");

  // User references: [0]=admin [1]=rahul [2]=priya [3]=amit [4]=sneha [5]=vikram
  // Trip references: [0]=TripA  [3]=TripB  [5]=TripC  [7]=TripD

  const bookings = [];
  const payments = [];

  // ── Booking 1: CONFIRMED — Rahul on Trip A, seats [8,9] ──
  const booking1 = await Booking.create({
    userId: users[1]._id,
    tripId: trips[0]._id,
    seatNumbers: [8, 9],
    totalAmount: trips[0].fare * 2, // 450 × 2 = ₹900
    status: "CONFIRMED",
    bookedAt: getPastDate(5),
    confirmationEmailSent: true,
    createdAt: getPastDate(5),
  });

  const payment1 = await Payment.create({
    bookingId: booking1._id,
    userId: users[1]._id,
    razorpayOrderId: "order_seed_001",
    razorpayPaymentId: "pay_seed_001",
    amount: booking1.totalAmount,
    currency: "INR",
    status: "SUCCESS",
    createdAt: getPastDate(5),
  });

  booking1.paymentId = payment1._id;
  await booking1.save();

  // Mark seats 8, 9 as BOOKED on Trip A
  await TripSeat.updateMany(
    { tripId: trips[0]._id, seatNumber: { $in: [8, 9] } },
    {
      $set: {
        status: "BOOKED",
        bookingId: booking1._id,
        lockedBy: null,
        lockExpiresAt: null,
      },
    }
  );

  bookings.push(booking1);
  payments.push(payment1);

  // ── Booking 2: CONFIRMED — Priya on Trip C, seats [1,2] ──
  const booking2 = await Booking.create({
    userId: users[2]._id,
    tripId: trips[5]._id,
    seatNumbers: [1, 2],
    totalAmount: trips[5].fare * 2, // 200 × 2 = ₹400
    status: "CONFIRMED",
    bookedAt: getPastDate(2),
    confirmationEmailSent: true,
    createdAt: getPastDate(2),
  });

  const payment2 = await Payment.create({
    bookingId: booking2._id,
    userId: users[2]._id,
    razorpayOrderId: "order_seed_002",
    razorpayPaymentId: "pay_seed_002",
    amount: booking2.totalAmount,
    currency: "INR",
    status: "SUCCESS",
    createdAt: getPastDate(2),
  });

  booking2.paymentId = payment2._id;
  await booking2.save();

  // Mark seats 1, 2 as BOOKED on Trip C
  await TripSeat.updateMany(
    { tripId: trips[5]._id, seatNumber: { $in: [1, 2] } },
    {
      $set: {
        status: "BOOKED",
        bookingId: booking2._id,
        lockedBy: null,
        lockExpiresAt: null,
      },
    }
  );

  bookings.push(booking2);
  payments.push(payment2);

  // ── Booking 3: CANCELLED — Amit on Trip C, seats [15,16] ──
  const booking3 = await Booking.create({
    userId: users[3]._id,
    tripId: trips[5]._id,
    seatNumbers: [15, 16],
    totalAmount: trips[5].fare * 2, // 200 × 2 = ₹400
    status: "CANCELLED",
    bookedAt: getPastDate(3),
    cancelledAt: getPastDate(1),
    confirmationEmailSent: true,
    createdAt: getPastDate(3),
  });

  const payment3 = await Payment.create({
    bookingId: booking3._id,
    userId: users[3]._id,
    razorpayOrderId: "order_seed_003",
    razorpayPaymentId: "pay_seed_003",
    amount: booking3.totalAmount,
    currency: "INR",
    status: "REFUNDED",
    createdAt: getPastDate(3),
  });

  booking3.paymentId = payment3._id;
  await booking3.save();

  // Seats 15, 16 on Trip C stay AVAILABLE (released on cancellation)
  // — they were already created as AVAILABLE, no update needed.

  bookings.push(booking3);
  payments.push(payment3);

  // ── Booking 4: PENDING — Sneha on Trip D, seats [5,6] ──
  const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now

  const booking4 = await Booking.create({
    userId: users[4]._id,
    tripId: trips[7]._id,
    seatNumbers: [5, 6],
    totalAmount: trips[7].fare * 2, // 850 × 2 = ₹1700
    status: "PENDING",
  });

  const payment4 = await Payment.create({
    bookingId: booking4._id,
    userId: users[4]._id,
    razorpayOrderId: "order_seed_004",
    amount: booking4.totalAmount,
    currency: "INR",
    status: "PENDING",
  });

  booking4.paymentId = payment4._id;
  await booking4.save();

  // Mark seats 5, 6 as LOCKED on Trip D
  await TripSeat.updateMany(
    { tripId: trips[7]._id, seatNumber: { $in: [5, 6] } },
    {
      $set: {
        status: "LOCKED",
        lockedBy: users[4]._id,
        lockExpiresAt,
        bookingId: booking4._id,
      },
    }
  );

  bookings.push(booking4);
  payments.push(payment4);

  console.log(`   ✅ Created ${bookings.length} bookings and ${payments.length} payments`);
  console.log("   📌 Trip A seats [8,9]   → BOOKED  (Rahul, CONFIRMED)");
  console.log("   📌 Trip C seats [1,2]   → BOOKED  (Priya, CONFIRMED)");
  console.log("   📌 Trip C seats [15,16] → AVAILABLE (Amit, CANCELLED — seats released)");
  console.log("   📌 Trip D seats [5,6]   → LOCKED  (Sneha, PENDING)");

  return { bookings, payments };
}

// ============================================================
// CREATE WAITING LIST
// ============================================================

/**
 * Creates 3 waiting list entries on Trip C (Ahmedabad→Vadodara).
 * Satisfies both WaitingList unique partial indexes:
 *   - (tripId, userId, status) unique for WAITING/ELIGIBLE
 *   - (tripId, position) unique for WAITING/ELIGIBLE
 */
async function createWaitingList(users, trips) {
  console.log("\n⏳ Creating waiting list entries...");

  // WaitingList on Trip C (trips[5] — Ahmedabad→Vadodara, date2)
  const waitingListData = [
    { tripId: trips[5]._id, userId: users[3]._id, status: "WAITING", position: 1 }, // Amit
    { tripId: trips[5]._id, userId: users[4]._id, status: "WAITING", position: 2 }, // Sneha
    { tripId: trips[5]._id, userId: users[5]._id, status: "ELIGIBLE", position: 3 }, // Vikram
  ];

  const entries = await WaitingList.insertMany(waitingListData);
  console.log(`   ✅ Created ${entries.length} waiting list entries (Ahmedabad → Vadodara)`);
  return entries;
}

// ============================================================
// PRINT SUMMARY
// ============================================================

function printSummary(users, buses, routes, trips, tripSeatCount, bookings, payments, waitingListEntries) {
  const date1 = formatDate(getFutureDate(3));
  const date2 = formatDate(getFutureDate(5));
  const date3 = formatDate(getFutureDate(7));
  const date4 = formatDate(getFutureDate(10));

  console.log("\n" + "=".repeat(60));
  console.log("  ✅ SEED COMPLETED SUCCESSFULLY");
  console.log("=".repeat(60));

  // ── Record Counts ──
  console.log("\n📊 RECORD COUNTS:");
  console.log(`   Users created:           ${users.length} (1 ADMIN, ${users.length - 1} USER)`);
  console.log(`   Buses created:           ${buses.length}`);
  console.log(`   Routes created:          ${routes.length}`);
  console.log(`   Trips created:           ${trips.length}`);
  console.log(`   TripSeats created:       ${tripSeatCount}`);
  console.log(`   Bookings created:        ${bookings.length}`);
  console.log(`   Payments created:        ${payments.length}`);
  console.log(`   Waiting List entries:     ${waitingListEntries.length}`);

  // ── Credentials ──
  console.log("\n🔑 DEVELOPMENT CREDENTIALS:");
  console.log("   ┌──────────────────────────────────┬──────────────┬────────┐");
  console.log("   │ Email                            │ Password     │ Role   │");
  console.log("   ├──────────────────────────────────┼──────────────┼────────┤");
  console.log(
    `   │ ${DEV_CREDENTIALS.admin.email.padEnd(32)} │ ${DEV_CREDENTIALS.admin.password.padEnd(12)} │ ADMIN  │`
  );
  for (const user of DEV_CREDENTIALS.users) {
    console.log(`   │ ${user.email.padEnd(32)} │ ${user.password.padEnd(12)} │ USER   │`);
  }
  console.log("   └──────────────────────────────────┴──────────────┴────────┘");

  // ── Search Queries ──
  console.log("\n🔍 EXAMPLE SEARCH QUERIES (source → destination | travelDate):");
  console.log(`   Surat → Ahmedabad       | ${date1}  (3 trips: morning, afternoon, evening)`);
  console.log(`   Surat → Mumbai           | ${date1}  (2 trips: morning, evening)`);
  console.log(`   Ahmedabad → Vadodara     | ${date2}  (2 trips: morning, afternoon)`);
  console.log(`   Mumbai → Surat           | ${date2}  (2 trips: morning, evening)`);
  console.log(`   Vadodara → Ahmedabad     | ${date3}  (2 trips: morning, afternoon)`);
  console.log(`   Ahmedabad → Rajkot       | ${date3}  (2 trips: morning, afternoon)`);
  console.log(`   Mumbai → Ahmedabad       | ${date4}  (2 trips: morning, evening)`);
  console.log(`   Surat → Ahmedabad        | ${date4}  (1 trip: morning)`);
  console.log(`   Surat → Mumbai            | ${date4}  (1 trip: morning)`);
  console.log(`   Mumbai → Surat            | ${date4}  (1 trip: morning)`);

  // ── Seat Scenarios ──
  console.log("\n🧪 SEAT STATUS SCENARIOS:");
  console.log(`   Trip A (Surat→Ahmedabad, ${date1} 06:00):     Seats 8,9 BOOKED — rest AVAILABLE`);
  console.log(`   Trip B (Surat→Mumbai, ${date1} 07:00):        All seats AVAILABLE`);
  console.log(`   Trip C (Ahmedabad→Vadodara, ${date2} 08:00):  Seats 1,2 BOOKED — rest AVAILABLE`);
  console.log(`   Trip D (Mumbai→Surat, ${date2} 06:00):        Seats 5,6 LOCKED — rest AVAILABLE`);

  // ── Booking Scenarios ──
  console.log("\n💰 BOOKING / PAYMENT SCENARIOS:");
  console.log("   1. Rahul → Trip A seats [8,9]   ₹900  │ CONFIRMED + SUCCESS");
  console.log("   2. Priya → Trip C seats [1,2]   ₹400  │ CONFIRMED + SUCCESS");
  console.log("   3. Amit  → Trip C seats [15,16] ₹400  │ CANCELLED + REFUNDED");
  console.log("   4. Sneha → Trip D seats [5,6]   ₹1700 │ PENDING   + PENDING");

  // ── Waiting List ──
  console.log("\n⏳ WAITING LIST (Trip C — Ahmedabad → Vadodara):");
  console.log("   Position 1: Amit   → WAITING");
  console.log("   Position 2: Sneha  → WAITING");
  console.log("   Position 3: Vikram → ELIGIBLE");

  console.log("\n" + "=".repeat(60));
}

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function seed() {
  // ── Environment guard ──
  if (process.env.NODE_ENV === "production") {
    console.error("\n❌ SEED ABORTED: Cannot run seed in production environment!");
    console.error("   Set NODE_ENV to 'development' or leave it unset.\n");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("  BUS BOOKING SYSTEM — Development Database Seed");
  console.log("=".repeat(60));
  console.log(`  Environment: ${process.env.NODE_ENV || "development (default)"}`);
  console.log(`  Database:    ${process.env.MONGO_URI}`);

  // ── Connect to MongoDB ──
  await mongoose.connect(process.env.MONGO_URI);
  console.log("\n✅ Connected to MongoDB");

  try {
    // Step 1: Cleanup previous seed data
    await cleanup();

    // Step 2: Create foundation data
    const users = await createUsers();
    const buses = await createBuses();
    const routes = await createRoutes();

    // Step 3: Create trips (depends on buses + routes)
    const trips = await createTrips(buses, routes);

    // Step 4: Create trip seats — all AVAILABLE initially
    //         (mirrors tripController.js seat-generation logic)
    const tripSeatCount = await createTripSeats(trips, buses);

    // Step 5: Create bookings, payments & update specific seat statuses
    const { bookings, payments } = await createBookingsAndPayments(users, trips);

    // Step 6: Create waiting list entries
    const waitingListEntries = await createWaitingList(users, trips);

    // Step 7: Print full summary
    printSummary(users, buses, routes, trips, tripSeatCount, bookings, payments, waitingListEntries);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB\n");
  }
}

// ── Run ──
seed().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});
