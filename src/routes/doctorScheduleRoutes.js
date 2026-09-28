const express = require("express");

const router = express.Router();

// ==========================================
// AUTHENTICATION
// ==========================================

const protect = require("../middleware/authMiddleware");

// ==========================================
// ROLE AUTHORIZATION
// ==========================================

const authorizeRoles = require("../middleware/roleMiddleware");

// ==========================================
// CONTROLLER
// ==========================================

const {
  getMySchedule,
  updateMySchedule,
} = require("../controllers/doctorScheduleController");

// ==========================================
// GET MY SCHEDULE
// GET /api/doctors/schedule
// ==========================================
//
// Doctor only
// ==========================================

router.get(
  "/schedule",
  protect,
  authorizeRoles("doctor"),
  getMySchedule
);

// ==========================================
// UPDATE MY SCHEDULE
// PUT /api/doctors/schedule
// ==========================================
//
// Doctor only
// ==========================================

router.put(
  "/schedule",
  protect,
  authorizeRoles("doctor"),
  updateMySchedule
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;