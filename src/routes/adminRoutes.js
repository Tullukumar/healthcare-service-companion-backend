const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getPendingDoctors,
  verifyDoctor,
  getAdminDashboard,
  getAllDoctors,
} = require("../controllers/adminController");

const router = express.Router();

// ==========================================
// ADMIN DASHBOARD
// ==========================================

router.get(
  "/dashboard",
  protect,
  authorizeRoles("admin"),
  getAdminDashboard
);

// ==========================================
// ALL DOCTORS
// ==========================================

router.get(
  "/doctors",
  protect,
  authorizeRoles("admin"),
  getAllDoctors
);

// ==========================================
// PENDING DOCTORS
// ==========================================

router.get(
  "/doctors/pending",
  protect,
  authorizeRoles("admin"),
  getPendingDoctors
);

// ==========================================
// APPROVE DOCTOR
// ==========================================

router.patch(
  "/doctors/:doctorId/verify",
  protect,
  authorizeRoles("admin"),
  verifyDoctor
);

module.exports = router;