// ==========================================
// USER ROUTES
// ==========================================

const express = require("express");

const User = require("../models/User");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// GET USER PROFILE
// GET /api/users/profile
// ==========================================

router.get(
  "/profile",
  protect,
  async (req, res) => {
    try {
      // ========================================
      // CHECK AUTHENTICATED USER
      // ========================================

      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user not found.",
        });
      }

      // ========================================
      // FIND USER
      // ========================================

      const user = await User.findById(
        req.user.userId
      ).select("-password");

      // ========================================
      // USER NOT FOUND
      // ========================================

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      // ========================================
      // RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,
        message:
          "Profile loaded successfully.",
        user,
      });
    } catch (error) {
      console.error(
        "Get profile error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while loading profile.",
      });
    }
  }
);

// ==========================================
// EXPORT
// ==========================================

module.exports = router;