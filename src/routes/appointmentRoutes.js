const express = require("express");

const protect = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  approveAppointment,
  rejectAppointment,
  completeAppointment,
} = require("../controllers/appointmentController");

const router = express.Router();

// ==========================================
// GET MY APPOINTMENTS
// ==========================================

router.get(
  "/my",
  protect,
  authorizeRoles("patient"),
  getMyAppointments
);

// ==========================================
// GET DOCTOR APPOINTMENTS
// ==========================================

router.get(
  "/doctor",
  protect,
  authorizeRoles("doctor"),
  getDoctorAppointments
);

// ==========================================
// CREATE APPOINTMENT
// ==========================================

router.post(
  "/",
  protect,
  authorizeRoles("patient"),
  createAppointment
);

// ==========================================
// APPROVE APPOINTMENT
// ==========================================

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("doctor"),
  approveAppointment
);

// ==========================================
// REJECT APPOINTMENT
// ==========================================

router.patch(
  "/:id/reject",
  protect,
  authorizeRoles("doctor"),
  rejectAppointment
);

// ==========================================
// COMPLETE APPOINTMENT
// ==========================================

router.patch(
  "/:id/complete",
  protect,
  authorizeRoles("doctor"),
  completeAppointment
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;