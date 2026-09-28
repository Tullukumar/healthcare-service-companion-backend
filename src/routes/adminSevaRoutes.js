// ==========================================
// ADMIN SEVACARE ROUTES
// ==========================================

const express = require("express");

const router = express.Router();

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

const protect = require("../middleware/authMiddleware");

// ==========================================
// ADMIN SEVACARE CONTROLLER
// ==========================================
const {
  getAllSevaRequests,
  getSevaRequestById,
  updateSevaRequestStatus,
} = require("../controllers/sevaAdminController");


// ==========================================
// ADMIN ONLY MIDDLEWARE
// ==========================================

const adminOnly = (req, res, next) => {
  // User must be authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  // User must have admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
};

// ==========================================
// PROTECT ALL ADMIN SEVACARE ROUTES
// ==========================================

router.use(protect);

router.use(adminOnly);

// ==========================================
// GET ALL SEVACARE REQUESTS
// GET /api/admin/seva/requests
// ==========================================

router.get(
  "/requests",
  getAllSevaRequests
);

// ==========================================
// GET SINGLE SEVACARE REQUEST
// GET /api/admin/seva/requests/:id
// ==========================================

router.get(
  "/requests/:id",
  getSevaRequestById
);

// ==========================================
// UPDATE SEVACARE REQUEST STATUS
// PUT /api/admin/seva/requests/:id/status
// ==========================================

router.put(
  "/requests/:id/status",
  updateSevaRequestStatus
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;