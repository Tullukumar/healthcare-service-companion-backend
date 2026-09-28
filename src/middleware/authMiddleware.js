// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ==========================================
// PROTECT ROUTES
// ==========================================

const protect = async (req, res, next) => {
  try {
    // ========================================
    // CHECK AUTHORIZATION HEADER
    // ========================================

    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ========================================
    // EXTRACT TOKEN
    // ========================================

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication token is missing",
      });
    }

    // ========================================
    // CHECK JWT SECRET
    // ========================================

    if (!process.env.JWT_SECRET) {
      console.error(
        "JWT_SECRET is missing from .env"
      );

      return res.status(500).json({
        success: false,
        message:
          "Server authentication configuration error.",
      });
    }

    // ========================================
    // VERIFY JWT
    // ========================================

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // ========================================
    // CHECK JWT PAYLOAD
    // ========================================

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authentication token.",
      });
    }

    // ========================================
    // FIND CURRENT USER
    // ========================================

    const user = await User.findById(
      decoded.userId
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "User account no longer exists.",
      });
    }

    // ========================================
    // CHECK ACCOUNT STATUS
    // ========================================

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been deactivated.",
      });
    }

    // ========================================
    // CHECK TOKEN VERSION
    // ========================================

    const currentTokenVersion =
      user.tokenVersion || 0;

    const tokenVersion =
      decoded.tokenVersion || 0;

    if (
      tokenVersion !==
      currentTokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Your session has expired. Please login again.",
      });
    }

    // ========================================
    // ATTACH USER TO REQUEST
    // ========================================

    req.user = {
      userId: user._id,
      role: user.role,
      tokenVersion: currentTokenVersion,
    };

    // ========================================
    // CONTINUE
    // ========================================

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = protect;