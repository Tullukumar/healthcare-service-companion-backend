const express = require("express");

const router = express.Router();

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

const protect = require("../middleware/authMiddleware");

// ==========================================
// UPLOAD MIDDLEWARE
// ==========================================

const uploadSupport = require("../middleware/uploadSupport");

// ==========================================
// CONTROLLER
// ==========================================

const {
  createSupportTicket,
  getMySupportTickets,
  getMySupportTicketById,
  sendSupportMessage,
  closeSupportTicket,
} = require("../controllers/supportController");

// ==========================================
// PROTECT ALL SUPPORT ROUTES
// ==========================================

router.use(protect);

// ==========================================
// CREATE SUPPORT TICKET
// POST /api/support/tickets
//
// Supports:
// - Text fields
// - One attachment
// ==========================================

router.post(
  "/tickets",
  uploadSupport.single("attachment"),
  createSupportTicket
);

// ==========================================
// GET MY SUPPORT TICKETS
// GET /api/support/tickets/my
// ==========================================

router.get(
  "/tickets/my",
  getMySupportTickets
);

// ==========================================
// GET SINGLE SUPPORT TICKET
// GET /api/support/tickets/:id
// ==========================================

router.get(
  "/tickets/:id",
  getMySupportTicketById
);

// ==========================================
// SEND SUPPORT MESSAGE
// POST /api/support/tickets/:id/messages
// ==========================================

router.post(
  "/tickets/:id/messages",
  sendSupportMessage
);

// ==========================================
// CLOSE SUPPORT TICKET
// PUT /api/support/tickets/:id/close
// ==========================================

router.put(
  "/tickets/:id/close",
  closeSupportTicket
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;