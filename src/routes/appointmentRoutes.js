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
// GET /api/appointments/my
// PATIENT ONLY
// ==========================================

router.get(
  "/my",
  protect,
  authorizeRoles("patient"),
  getMyAppointments
);

// ==========================================
// GET DOCTOR / ADMIN APPOINTMENTS
// GET /api/appointments/doctor
// DOCTOR + ADMIN
// ==========================================

router.get(
  "/doctor",
  protect,
  authorizeRoles("doctor", "admin"),
  getDoctorAppointments
);

// ==========================================
// CREATE APPOINTMENT
// POST /api/appointments
// PATIENT ONLY
// ==========================================

router.post(
  "/",
  protect,
  authorizeRoles("patient"),
  createAppointment
);

// ==========================================
// APPROVE APPOINTMENT
// PATCH /api/appointments/:id/approve
// DOCTOR + ADMIN
// ==========================================

router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("doctor", "admin"),
  approveAppointment
);

// ==========================================
// REJECT APPOINTMENT
// PATCH /api/appointments/:id/reject
// DOCTOR + ADMIN
// ==========================================

router.patch(
  "/:id/reject",
  protect,
  authorizeRoles("doctor", "admin"),
  rejectAppointment
);

// ==========================================
// COMPLETE APPOINTMENT
// PATCH /api/appointments/:id/complete
// DOCTOR + ADMIN
// ==========================================

router.patch(
  "/:id/complete",
  protect,
  authorizeRoles("doctor", "admin"),
  completeAppointment
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;