const express = require("express");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getAvailableAmbulances,
  createAmbulance,
  createAmbulanceDriver,
  updateAmbulanceStatus,
  updateDriverOnlineStatus,
  getDriverStatus,
  assignDriverToAmbulance,
  getAmbulanceDrivers,
} = require("../controllers/ambulanceController");

const router = express.Router();

// ==========================================
// GET AVAILABLE AMBULANCES
// GET /api/ambulances/available
// ==========================================

router.get(
  "/available",
  protect,
  getAvailableAmbulances
);

// ==========================================
// GET AMBULANCE DRIVERS
// GET /api/ambulances/drivers
// ADMIN ONLY
// ==========================================

router.get(
  "/drivers",
  protect,
  authorizeRoles("admin"),
  getAmbulanceDrivers
);

// ==========================================
// CREATE AMBULANCE
// POST /api/ambulances
// ADMIN ONLY
// ==========================================

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  createAmbulance
);

// ==========================================
// GET DRIVER STATUS
// GET /api/ambulances/driver/status
// AMBULANCE DRIVER ONLY
// ==========================================

router.get(
  "/driver/status",
  protect,
  authorizeRoles("ambulance"),
  getDriverStatus
);

// ==========================================
// ASSIGN EXISTING DRIVER
// PATCH /api/ambulances/:id/driver
// ADMIN ONLY
// ==========================================

router.patch(
  "/:id/driver",
  protect,
  authorizeRoles("admin"),
  assignDriverToAmbulance
);

// ==========================================
// UPDATE AMBULANCE STATUS
// PATCH /api/ambulances/:id/status
// ADMIN ONLY
// ==========================================

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin"),
  updateAmbulanceStatus
);

// ==========================================
// CREATE AMBULANCE DRIVER
// POST /api/ambulances/driver
// ADMIN OR HOSPITAL
// ==========================================

router.post(
  "/driver",
  protect,
  authorizeRoles("admin", "hospital"),
  createAmbulanceDriver
);

// ==========================================
// DRIVER ONLINE / OFFLINE
// PATCH /api/ambulances/driver/online-status
// AMBULANCE DRIVER ONLY
// ==========================================

router.patch(
  "/driver/online-status",
  protect,
  authorizeRoles("ambulance"),
  updateDriverOnlineStatus
);

module.exports = router;