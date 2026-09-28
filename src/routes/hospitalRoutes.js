const express = require("express");

const {
  getHospitals,
  getHospitalById,
} = require("../controllers/hospitalController");

const router = express.Router();

// ==========================================
// GET ALL ACTIVE HOSPITALS
// GET /api/hospitals
// ==========================================

router.get(
  "/",
  getHospitals
);

// ==========================================
// GET HOSPITAL BY ID
// GET /api/hospitals/:id
// ==========================================

router.get(
  "/:id",
  getHospitalById
);

module.exports = router;