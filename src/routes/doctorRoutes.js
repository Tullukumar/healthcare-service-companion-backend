const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createDoctorProfile,
  updateDoctorProfile,
  getMyDoctorProfile,
  getDoctors,
  getDoctorById,

  // Schedule
  getDoctorSchedule,
  updateDoctorSchedule,
} = require("../controllers/doctorController");

const router = express.Router();

// ==========================================
// CREATE DOCTOR PROFILE
// POST /api/doctors/profile
// ==========================================

router.post(
  "/profile",
  protect,
  authorizeRoles("doctor"),
  upload.single("profileImage"),
  createDoctorProfile
);

// ==========================================
// UPDATE DOCTOR PROFILE
// PUT /api/doctors/profile
// ==========================================

router.put(
  "/profile",
  protect,
  authorizeRoles("doctor"),
  upload.single("profileImage"),
  updateDoctorProfile
);

// ==========================================
// GET MY DOCTOR PROFILE
// GET /api/doctors/profile/me
// ==========================================

router.get(
  "/profile/me",
  protect,
  authorizeRoles("doctor"),
  getMyDoctorProfile
);

// ==========================================
// GET MY APPOINTMENT SCHEDULE
// GET /api/doctors/schedule
// ==========================================

router.get(
  "/schedule",
  protect,
  authorizeRoles("doctor"),
  getDoctorSchedule
);

// ==========================================
// UPDATE MY APPOINTMENT SCHEDULE
// PUT /api/doctors/schedule
// ==========================================

router.put(
  "/schedule",
  protect,
  authorizeRoles("doctor"),
  updateDoctorSchedule
);

// ==========================================
// GET ALL APPROVED DOCTORS
// GET /api/doctors
// ==========================================

router.get(
  "/",
  getDoctors
);

// ==========================================
// GET DOCTOR BY ID
// GET /api/doctors/:id
// ==========================================

router.get(
  "/:id",
  getDoctorById
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;