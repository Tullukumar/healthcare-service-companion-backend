const User = require("../models/User");

// ==========================================
// GET MY PROFILE
// GET /api/users/profile
// ==========================================

const getMyProfile = async (req, res) => {
  try {
    // req.user.userId comes from authMiddleware
    const user = await User.findById(req.user.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get user profile error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};

module.exports = {
  getMyProfile,
};