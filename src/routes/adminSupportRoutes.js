const express = require("express");

const router = express.Router();

// ==========================================
// MIDDLEWARE
// ==========================================

const protect = require("../middleware/authMiddleware");

// ==========================================
// ADMIN MIDDLEWARE
// ==========================================

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
};

// ==========================================
// CONTROLLER
// ==========================================

const {
  getAllSupportTickets,
  getSupportTicketById,
  assignSupportTicket,
  sendAdminSupportMessage,
  resolveSupportTicket,
  closeAdminSupportTicket,
} = require("../controllers/adminSupportController");

// ==========================================
// PROTECT ALL ADMIN SUPPORT ROUTES
// ==========================================

router.use(protect);

router.use(adminOnly);

// ==========================================
// GET ALL SUPPORT TICKETS
//
// GET /api/admin/support/tickets
// ==========================================

router.get(
  "/tickets",
  getAllSupportTickets
);

// ==========================================
// GET SINGLE SUPPORT TICKET
//
// GET /api/admin/support/tickets/:id
// ==========================================

router.get(
  "/tickets/:id",
  getSupportTicketById
);

// ==========================================
// ASSIGN SUPPORT TICKET
//
// PUT /api/admin/support/tickets/:id/assign
// ==========================================

router.put(
  "/tickets/:id/assign",
  assignSupportTicket
);

// ==========================================
// SEND SUPPORT MESSAGE
//
// POST /api/admin/support/tickets/:id/messages
// ==========================================

router.post(
  "/tickets/:id/messages",
  sendAdminSupportMessage
);

// ==========================================
// RESOLVE SUPPORT TICKET
//
// PUT /api/admin/support/tickets/:id/resolve
// ==========================================

router.put(
  "/tickets/:id/resolve",
  resolveSupportTicket
);

// ==========================================
// CLOSE SUPPORT TICKET
//
// PUT /api/admin/support/tickets/:id/close
// ==========================================

router.put(
  "/tickets/:id/close",
  closeAdminSupportTicket
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;