const express = require("express");

const {
  createAmbulanceRequest,
  getPendingAmbulanceRequests,
  acceptAmbulanceRequest,
  updateAmbulanceRequestStatus,
  getActiveAmbulanceRequest,
} = require("../controllers/ambulanceRequestController");

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// PATIENT → CREATE AMBULANCE REQUEST
// ==========================================

router.post(
  "/",
  protect,
  authorizeRoles("patient"),
  createAmbulanceRequest
);

// ==========================================
// PATIENT + AMBULANCE → GET ACTIVE REQUEST
// ==========================================
//
// IMPORTANT:
// Do NOT put authorizeRoles("ambulance")
// here.
//
// Both patient and ambulance need this endpoint.
//
// Patient:
// sees their active ambulance request.
//
// Ambulance:
// sees their currently assigned request.
//

router.get(
  "/active",
  protect,
  getActiveAmbulanceRequest
);

// ==========================================
// AMBULANCE → VIEW PENDING REQUESTS
// ==========================================

router.get(
  "/pending",
  protect,
  authorizeRoles("ambulance"),
  getPendingAmbulanceRequests
);

// ==========================================
// AMBULANCE → ACCEPT REQUEST
// ==========================================

router.patch(
  "/:id/accept",
  protect,
  authorizeRoles("ambulance"),
  acceptAmbulanceRequest
);

// ==========================================
// AMBULANCE → UPDATE REQUEST STATUS
// ==========================================

router.patch(
  "/:id/status",
  protect,
  authorizeRoles("ambulance"),
  updateAmbulanceRequestStatus
);

module.exports = router;