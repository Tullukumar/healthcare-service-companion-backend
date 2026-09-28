const express = require("express");

const {
  sendTestEmail,
} = require("../utils/email");

const router = express.Router();

// ==========================================
// SEND TEST EMAIL
// GET /api/email/test
// ==========================================

router.get("/test", async (req, res) => {
  try {
    const email =
      process.env.EMAIL_USER;

    const result =
      await sendTestEmail(email);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Test email failed",
        error: result.error,
      });
    }

    res.status(200).json({
      success: true,
      message:
        "Test email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error(
      "Test email route error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error while sending test email",
    });
  }
});

module.exports = router;