const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createMedicalRecord,
  getMyMedicalRecords,
  getPatientMedicalRecords,
  updateMedicalRecord,
} = require("../controllers/medicalRecordController");

const router = express.Router();

// ======================================================
// PATIENT — GET MY MEDICAL RECORDS
// GET /api/medical-records/my
// ======================================================

router.get(
  "/my",
  protect,
  authorizeRoles("patient"),
  getMyMedicalRecords
);

// ======================================================
// DOCTOR — GET PATIENT MEDICAL RECORDS
// GET /api/medical-records/patient/:patientId
// ======================================================

router.get(
  "/patient/:patientId",
  protect,
  authorizeRoles("doctor"),
  getPatientMedicalRecords
);

// ======================================================
// DOCTOR — CREATE MEDICAL RECORD
// POST /api/medical-records
// ======================================================

router.post(
  "/",
  protect,
  authorizeRoles("doctor"),
  createMedicalRecord
);

// ======================================================
// DOCTOR — UPDATE MEDICAL RECORD
// PATCH /api/medical-records/:id
// ======================================================

router.patch(
  "/:id",
  protect,
  authorizeRoles("doctor"),
  updateMedicalRecord
);

// ======================================================
// EXPORT
// ======================================================

module.exports = router;