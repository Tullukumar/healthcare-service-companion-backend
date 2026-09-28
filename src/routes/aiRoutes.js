// ==========================================
// AI ROUTES
// ==========================================

const express = require("express");

const router = express.Router();

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

const protect = require("../middleware/authMiddleware");

// ==========================================
// AI CONTROLLER
// ==========================================

const {
  askAI,
} = require("../controllers/aiController");

// ==========================================
// AI CHAT
// POST /api/ai/chat
// ==========================================
//
// Existing endpoint
// Authentication required
// ==========================================

router.post(
  "/chat",
  protect,
  askAI
);

// ==========================================
// AI
// POST /api/ai
// ==========================================
//
// Frontend is currently calling:
// http://localhost:5000/api/ai
//
// Authentication required
// ==========================================

router.post(
  "/",
  protect,
  askAI
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;