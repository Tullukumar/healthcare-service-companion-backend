const nodemailer = require("nodemailer");

// ==========================================
// EMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",

  port: Number(process.env.EMAIL_PORT) || 587,

  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==========================================
// VERIFY EMAIL CONNECTION
// ==========================================

const verifyEmailConnection = async () => {
  try {
    await transporter.verify();

    console.log("==========================================");
    console.log("✅ Email service connected successfully");
    console.log(`📧 Email: ${process.env.EMAIL_USER}`);
    console.log("==========================================");

    return true;
  } catch (error) {
    console.error("==========================================");
    console.error("❌ Email service connection failed");
    console.error("Error:", error.message);
    console.error("==========================================");

    return false;
  }
};

// ==========================================
// SEND EMAIL
// ==========================================

const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  try {
    // Check recipient
    if (!to) {
      console.error("❌ Email recipient is missing");

      return {
        success: false,
        error: "Email recipient is required",
      };
    }

    const info = await transporter.sendMail({
      from: `"HealthCompanion" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("==========================================");
    console.log("📧 Email sent successfully");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message ID: ${info.messageId}`);
    console.log("==========================================");

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("==========================================");
    console.error("❌ Email sending failed");
    console.error("Error:", error.message);
    console.error("==========================================");

    return {
      success: false,
      error: error.message,
    };
  }
};

// ==========================================
// TEST EMAIL
// ==========================================

const sendTestEmail = async (to) => {
  try {
    const info = await transporter.sendMail({
      from: `"HealthCompanion" <${process.env.EMAIL_USER}>`,
      to,

      subject: "HealthCompanion Email Test",

      html: `
        <!DOCTYPE html>
        <html>
          <body
            style="
              margin: 0;
              padding: 30px;
              background: #f8fafc;
              font-family: Arial, sans-serif;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: auto;
                padding: 30px;
                background: white;
                border-radius: 16px;
              "
            >

              <h1 style="color: #2563eb;">
                HealthCompanion
              </h1>

              <h2>
                Email Service Working ✅
              </h2>

              <p>
                This is a test email from your
                HealthCompanion application.
              </p>

              <p>
                Your Gmail SMTP configuration is working
                correctly.
              </p>

              <hr />

              <p style="color: #64748b; font-size: 13px;">
                This is an automated test email.
              </p>

            </div>
          </body>
        </html>
      `,
    });

    console.log("==========================================");
    console.log("✅ Test email sent successfully");
    console.log(`📧 To: ${to}`);
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log("==========================================");

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("==========================================");
    console.error("❌ Test email failed");
    console.error("Error:", error.message);
    console.error("==========================================");

    return {
      success: false,
      error: error.message,
    };
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  sendEmail,
  verifyEmailConnection,
  sendTestEmail,
};