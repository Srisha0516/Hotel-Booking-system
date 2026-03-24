const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// File paths
const ROOMS_FILE = path.join(__dirname, "data/rooms.json");
const BOOKINGS_FILE = path.join(__dirname, "data/bookings.json");

// Read JSON
const readData = (file) => JSON.parse(fs.readFileSync(file));

// Write JSON
const writeData = (file, data) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

// GET ALL ROOMS
app.get("/api/rooms", (req, res) => {
  res.json(readData(ROOMS_FILE));
});

// CHECK AVAILABLE ROOMS
app.get("/api/rooms/available", (req, res) => {
  const { checkin, checkout, guests } = req.query;

  const rooms = readData(ROOMS_FILE);
  const bookings = readData(BOOKINGS_FILE);

  const available = rooms.filter((room) => {
    if (room.maxGuests < guests) return false;

    const overlap = bookings.find((b) => {
      return (
        b.roomId === room.id &&
        b.status === "Confirmed" &&
        !(checkout <= b.checkin || checkin >= b.checkout)
      );
    });

    return !overlap;
  });

  res.json(available);
});

// CREATE BOOKING
app.post("/api/bookings", (req, res) => {
  const bookings = readData(BOOKINGS_FILE);
  const rooms = readData(ROOMS_FILE);

  const { roomId, name, email, phone, checkin, checkout } = req.body;

  const room = rooms.find((r) => r.id == roomId);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const nights =
    (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24);

  const newBooking = {
    id: "BKG-" + uuidv4().slice(0, 6),
    roomId,
    name,
    email,
    phone,
    checkin,
    checkout,
    total: nights * room.price,
    status: "Confirmed",
  };

  bookings.push(newBooking);
  writeData(BOOKINGS_FILE, bookings);

  res.json(newBooking);
});

// GET BOOKINGS BY EMAIL
app.get("/api/bookings/:email", (req, res) => {
  const bookings = readData(BOOKINGS_FILE);
  const userBookings = bookings.filter(
    (b) => b.email === req.params.email
  );
  res.json(userBookings);
});

// CANCEL BOOKING
app.patch("/api/bookings/:id/cancel", (req, res) => {
  const bookings = readData(BOOKINGS_FILE);
  const booking = bookings.find((b) => b.id === req.params.id);

  if (booking) {
    booking.status = "Cancelled";
    writeData(BOOKINGS_FILE, bookings);
    return res.json({ message: "Booking Cancelled" });
  }

  res.status(404).json({ error: "Booking not found" });
});

// ADMIN STATS
app.get("/api/stats", (req, res) => {
  const bookings = readData(BOOKINGS_FILE);

  const revenue = bookings
    .filter((b) => b.status === "Confirmed")
    .reduce((sum, b) => sum + b.total, 0);

  res.json({
    totalBookings: bookings.length,
    revenue,
  });
});

// START SERVER
app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});