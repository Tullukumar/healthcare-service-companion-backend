const express = require("express");

const router = express.Router();

// ==========================================
// MIDDLEWARE
// ==========================================

const protect = require("../middleware/authMiddleware");

// ==========================================
// CONTROLLER
// ==========================================

const {
  createSevaRequest,
  getMySevaRequests,
  getMySevaRequestById,
  cancelSevaRequest,
} = require("../controllers/sevaController");

// ==========================================
// CREATE SEVACARE REQUEST
// POST /api/seva/requests
// ==========================================

router.post(
  "/requests",
  protect,
  createSevaRequest
);

// ==========================================
// GET MY SEVACARE REQUESTS
// GET /api/seva/requests/my
// ==========================================

router.get(
  "/requests/my",
  protect,
  getMySevaRequests
);

// ==========================================
// GET SINGLE SEVACARE REQUEST
// GET /api/seva/requests/:id
// ==========================================

router.get(
  "/requests/:id",
  protect,
  getMySevaRequestById
);

// ==========================================
// CANCEL SEVACARE REQUEST
// PUT /api/seva/requests/:id/cancel
// ==========================================

router.put(
  "/requests/:id/cancel",
  protect,
  cancelSevaRequest
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;