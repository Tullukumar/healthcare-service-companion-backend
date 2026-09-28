const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const Hospital = require("../models/Hospital");

// ==========================================
// REGISTER USER
// ==========================================

const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,

      // Hospital information
      hospitalName,
      city,
      address,
      hospitalPhone,
      hospitalEmail,
    } = req.body;

    // ==========================================
    // CHECK REQUIRED FIELDS
    // ==========================================

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and account type are required",
      });
    }

    // ==========================================
    // CHECK ROLE
    // ==========================================

    const allowedRoles = [
      "patient",
      "doctor",
      "hospital",
      "ambulance",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    // ==========================================
    // CHECK HOSPITAL FIELDS
    // ==========================================

    if (role === "hospital") {
      if (!hospitalName || !city) {
        return res.status(400).json({
          success: false,
          message:
            "Hospital name and city are required",
        });
      }
    }

    // ==========================================
    // NORMALIZE EMAIL
    // ==========================================

    const normalizedEmail =
      email.toLowerCase().trim();

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "User with this email already exists",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 12);

    // ==========================================
    // HOSPITAL BECOMES ADMIN
    // ==========================================

    const actualRole =
      role === "hospital"
        ? "admin"
        : role;

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: actualRole,
      phone: phone || "",
    });

    // ==========================================
    // CREATE HOSPITAL
    // ==========================================

    let hospital = null;

    if (role === "hospital") {
      hospital = await Hospital.create({
        name: hospitalName,
        city,
        address: address || "",
        phone:
          hospitalPhone ||
          phone ||
          "",
        email:
          hospitalEmail ||
          normalizedEmail,
        admin: user._id,
        isActive: true,
      });
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        role === "hospital"
          ? "Hospital admin account created successfully"
          : "User registered successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },

      hospital: hospital
        ? {
            id: hospital._id,
            name: hospital.name,
            city: hospital.city,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during registration",
    });
  }
};

// ==========================================
// REGISTER USER AFTER OTP VERIFICATION
// ==========================================

const registerUserAfterVerification = async (
  req,
  res
) => {
  try {
    const {
      name,
      identifier,
      type,
      password,
      role,
      verificationToken,
    } = req.body;

    // ==========================================
    // CHECK REQUIRED FIELDS
    // ==========================================

    if (
      !name ||
      !identifier ||
      !type ||
      !password ||
      !role ||
      !verificationToken
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, identifier, type, password, role and verification token are required.",
      });
    }

    // ==========================================
    // CHECK TYPE
    // ==========================================

    if (
      !["email", "phone"].includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Type must be email or phone.",
      });
    }

    // ==========================================
    // CHECK PUBLIC REGISTRATION ROLE
    // ==========================================

    const allowedRoles = [
      "patient",
      "doctor",
      "hospital",
      "ambulance",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type.",
      });
    }

    // ==========================================
    // CHECK PASSWORD
    // ==========================================

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters.",
      });
    }

    // ==========================================
    // NORMALIZE IDENTIFIER
    // ==========================================

    const normalizedIdentifier =
      type === "email"
        ? identifier.trim().toLowerCase()
        : identifier.trim();

    // ==========================================
    // FIND VERIFIED OTP
    // ==========================================

    const OTP = require("../models/OTP");

    const verification =
      await OTP.findOne({
        identifier:
          normalizedIdentifier,
        type,
        purpose: "register",
        verified: true,
        verificationToken,
      });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message:
          "Verification is invalid or has expired. Please verify again.",
      });
    }

    // ==========================================
    // CHECK OTP EXPIRATION
    // ==========================================

    if (
      verification.expiresAt < new Date()
    ) {
      await OTP.deleteOne({
        _id: verification._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "Verification has expired. Please request a new OTP.",
      });
    }

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const existingUser =
      await User.findOne(
        type === "email"
          ? {
              email:
                normalizedIdentifier,
            }
          : {
              phone:
                normalizedIdentifier,
            }
      );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          `An account already exists with this ${type}.`,
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 12);

    // ==========================================
    // HOSPITAL BECOMES ADMIN
    // ==========================================

    const actualRole =
      role === "hospital"
        ? "admin"
        : role;

    // ==========================================
    // CREATE USER DATA
    // ==========================================

    const userData = {
      name: name.trim(),
      password: hashedPassword,
      role: actualRole,
    };

    if (type === "email") {
      userData.email =
        normalizedIdentifier;
    } else {
      userData.phone =
        normalizedIdentifier;
    }

    // ==========================================
    // CREATE USER
    // ==========================================

    const user =
      await User.create(userData);

    // ==========================================
    // CREATE HOSPITAL FOR HOSPITAL REGISTRATION
    // ==========================================

    let hospital = null;

    if (role === "hospital") {
      hospital =
        await Hospital.create({
          name: `${name.trim()} Hospital`,
          city: "Ghaziabad",
          address: "",
          phone:
            user.phone || "",
          email:
            user.email || "",
          admin: user._id,
          isActive: true,
        });
    }

    // ==========================================
    // DELETE USED VERIFICATION
    // ==========================================

    await OTP.deleteOne({
      _id: verification._id,
    });

    // ==========================================
    // CREATE JWT
    // ==========================================

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,

        // JWT security version
        tokenVersion:
          user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email:
          user.email || "",
        phone:
          user.phone || "",
        role: user.role,
      },

      hospital: hospital
        ? {
            id: hospital._id,
            name: hospital.name,
            city: hospital.city,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Verified registration error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during account creation.",
    });
  }
};

// ==========================================
// LOGIN AFTER OTP VERIFICATION
// ==========================================

const loginUserAfterVerification =
  async (req, res) => {
    try {
      const {
        identifier,
        type,
        verificationToken,
        role,
      } = req.body;

      // ==========================================
      // CHECK REQUIRED FIELDS
      // ==========================================

      if (
        !identifier ||
        !type ||
        !verificationToken ||
        !role
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Identifier, type, verification token and role are required.",
        });
      }

      // ==========================================
      // CHECK TYPE
      // ==========================================

      if (
        !["email", "phone"].includes(type)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Type must be email or phone.",
        });
      }

      // ==========================================
      // NORMALIZE IDENTIFIER
      // ==========================================

      const normalizedIdentifier =
        type === "email"
          ? identifier
              .trim()
              .toLowerCase()
          : identifier.trim();

      // ==========================================
      // FIND VERIFIED OTP
      // ==========================================

      const OTP = require("../models/OTP");

      const verification =
        await OTP.findOne({
          identifier:
            normalizedIdentifier,
          type,
          purpose: "login",
          verified: true,
          verificationToken,
        });

      if (!verification) {
        return res.status(400).json({
          success: false,
          message:
            "Verification is invalid or has expired. Please try again.",
        });
      }

      // ==========================================
      // CHECK OTP EXPIRATION
      // ==========================================

      if (
        verification.expiresAt <
        new Date()
      ) {
        await OTP.deleteOne({
          _id: verification._id,
        });

        return res.status(400).json({
          success: false,
          message:
            "Login verification has expired. Please request a new OTP.",
        });
      }

      // ==========================================
      // FIND USER
      // ==========================================

      const user =
        await User.findOne(
          type === "email"
            ? {
                email:
                  normalizedIdentifier,
              }
            : {
                phone:
                  normalizedIdentifier,
              }
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid login information.",
        });
      }

      // ==========================================
      // NORMALIZE ROLE
      // ==========================================

      const actualUserRole =
        user.role === "hospital"
          ? "admin"
          : user.role;

      const requestedRole =
        role === "hospital"
          ? "admin"
          : role;

      // ==========================================
      // CHECK ROLE
      // ==========================================

      if (
        actualUserRole !==
        requestedRole
      ) {
        return res.status(401).json({
          success: false,
          message:
            "The selected account type does not match this account.",
        });
      }

      // ==========================================
      // RESET LOGIN LOCK
      // ==========================================

      if (
        user.loginAttempts > 0 ||
        user.lockUntil
      ) {
        user.loginAttempts = 0;
        user.lockUntil = null;

        await user.save();
      }

      // ==========================================
      // CREATE JWT
      // ==========================================

      const token = jwt.sign(
        {
          userId: user._id,
          role: actualUserRole,

          // JWT security version
          tokenVersion:
            user.tokenVersion || 0,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      // ==========================================
      // DELETE USED VERIFICATION
      // ==========================================

      await OTP.deleteOne({
        _id: verification._id,
      });

      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(200).json({
        success: true,
        message:
          "Login successful.",

        token,

        user: {
          id: user._id,
          name: user.name,
          email:
            user.email || "",
          phone:
            user.phone || "",
          role: actualUserRole,
        },
      });
    } catch (error) {
      console.error(
        "OTP login error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error during OTP login.",
      });
    }
  };

// ==========================================
// LOGIN USER
// ==========================================

const loginUser = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
      role,
    } = req.body;

    // ==========================================
    // CHECK REQUIRED FIELDS
    // ==========================================

    if (
      !email ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, password and role are required",
      });
    }

    // ==========================================
    // NORMALIZE LOGIN ROLE
    // ==========================================

    const requestedRole =
      role === "hospital"
        ? "admin"
        : role;

    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      await User.findOne({
        email:
          email.toLowerCase().trim(),
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password",
      });
    }

    // ==========================================
    // CHECK ACCOUNT LOCK
    // ==========================================

    if (
      user.lockUntil &&
      user.lockUntil > new Date()
    ) {
      const remainingMinutes =
        Math.ceil(
          (user.lockUntil.getTime() -
            Date.now()) /
            (60 * 1000)
        );

      return res.status(429).json({
        success: false,
        message:
          `Too many failed login attempts. Please try again in ${remainingMinutes} minute${
            remainingMinutes === 1
              ? ""
              : "s"
          }.`,
      });
    }

    // ==========================================
    // CLEAR EXPIRED LOCK
    // ==========================================

    if (
      user.lockUntil &&
      user.lockUntil <= new Date()
    ) {
      user.loginAttempts = 0;
      user.lockUntil = null;

      await user.save();
    }

    // ==========================================
    // CHECK PASSWORD
    // ==========================================

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      // ==========================================
      // FAILED LOGIN ATTEMPT
      // ==========================================

      user.loginAttempts += 1;

      const MAX_LOGIN_ATTEMPTS = 5;
      const LOCK_TIME =
        15 * 60 * 1000;

      // ==========================================
      // LOCK ACCOUNT
      // ==========================================

      if (
        user.loginAttempts >=
        MAX_LOGIN_ATTEMPTS
      ) {
        user.lockUntil = new Date(
          Date.now() + LOCK_TIME
        );

        await user.save();

        return res.status(429).json({
          success: false,
          message:
            "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.",
        });
      }

      // ==========================================
      // SAVE FAILED ATTEMPT
      // ==========================================

      await user.save();

      const remainingAttempts =
        MAX_LOGIN_ATTEMPTS -
        user.loginAttempts;

      return res.status(401).json({
        success: false,
        message:
          `Invalid email or password. ${remainingAttempts} attempt${
            remainingAttempts === 1
              ? ""
              : "s"
          } remaining.`,
      });
    }

    // ==========================================
    // RESET LOGIN ATTEMPTS
    // ==========================================

    if (
      user.loginAttempts > 0 ||
      user.lockUntil
    ) {
      user.loginAttempts = 0;
      user.lockUntil = null;

      await user.save();
    }

    // ==========================================
    // CHECK ROLE
    // ==========================================

    const actualUserRole =
      user.role === "hospital"
        ? "admin"
        : user.role;

    if (
      actualUserRole !==
      requestedRole
    ) {
      return res.status(403).json({
        success: false,
        message:
          `This account is registered as ${actualUserRole}, not ${requestedRole}.`,
      });
    }

    // ==========================================
    // CREATE JWT
    // ==========================================

    const token = jwt.sign(
      {
        userId: user._id,
        role: actualUserRole,

        // JWT security version
        tokenVersion:
          user.tokenVersion || 0,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Login successful.",

      token,

      user: {
        id: user._id,
        name: user.name,
        email:
          user.email || "",
        phone:
          user.phone || "",
        role: actualUserRole,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during login.",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    // ==========================================
    // CHECK EMAIL
    // ==========================================

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    // ==========================================
    // GENERIC RESPONSE
    // ==========================================

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a password reset OTP has been sent.",
      });
    }

    // ==========================================
    // GENERATE OTP
    // ==========================================

    const otp = crypto
      .randomInt(
        100000,
        1000000
      )
      .toString();

    // ==========================================
    // HASH OTP
    // ==========================================

    const hashedOTP =
      crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    // ==========================================
    // OTP EXPIRATION
    // ==========================================

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // ==========================================
    // DELETE OLD OTP
    // ==========================================

    const OTP = require("../models/OTP");

    await OTP.deleteMany({
      identifier: normalizedEmail,
      type: "email",
      purpose: "forgot-password",
    });

    // ==========================================
    // SAVE HASHED OTP
    // ==========================================

    await OTP.create({
      identifier: normalizedEmail,
      otp: hashedOTP,
      type: "email",
      purpose: "forgot-password",
      expiresAt,
      attempts: 0,
    });

    // ==========================================
    // DEVELOPMENT MODE
    // ==========================================

    console.log(
      `Password reset OTP for ${normalizedEmail}: ${otp}`
    );

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset OTP has been sent.",

      ...(process.env.NODE_ENV !==
        "production" && {
        developmentOTP: otp,
      }),
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while processing password reset.",
    });
  }
};

// ==========================================
// RESET PASSWORD USING LEGACY TOKEN
// ==========================================

const resetPassword = async (
  req,
  res
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // ==========================================
    // CHECK REQUIRED FIELDS
    // ==========================================

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token and password are required.",
      });
    }

    // ==========================================
    // VERIFY TOKEN
    // ==========================================

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token.",
      });
    }

    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid password reset session.",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    user.password =
      await bcrypt.hash(
        password,
        12
      );

    // ==========================================
    // RESET LOGIN LOCK
    // ==========================================

    user.loginAttempts = 0;
    user.lockUntil = null;

    // ==========================================
    // INVALIDATE OLD JWT SESSIONS
    // ==========================================

    user.tokenVersion =
      (user.tokenVersion || 0) + 1;

    await user.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password.",
    });
  }
};

// ==========================================
// RESET PASSWORD AFTER OTP VERIFICATION
// ==========================================

const resetPasswordAfterVerification =
  async (req, res) => {
    try {
      const {
        email,
        verificationToken,
        password,
      } = req.body;

      // ==========================================
      // CHECK REQUIRED FIELDS
      // ==========================================

      if (
        !email ||
        !verificationToken ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email, verification token and password are required.",
        });
      }

      // ==========================================
      // NORMALIZE EMAIL
      // ==========================================

      const normalizedEmail =
        email.trim().toLowerCase();

      // ==========================================
      // FIND VERIFIED OTP
      // ==========================================

      const OTP = require("../models/OTP");

      const otpRecord =
        await OTP.findOne({
          identifier:
            normalizedEmail,
          type: "email",
          purpose: "forgot-password",
          verified: true,
          verificationToken,
        });

      // ==========================================
      // CHECK VERIFICATION
      // ==========================================

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message:
            "Password reset verification is invalid or expired.",
        });
      }

      // ==========================================
      // CHECK OTP EXPIRATION
      // ==========================================

      if (
        otpRecord.expiresAt <
        new Date()
      ) {
        await OTP.deleteOne({
          _id: otpRecord._id,
        });

        return res.status(400).json({
          success: false,
          message:
            "Password reset session has expired. Please request a new OTP.",
        });
      }

      // ==========================================
      // FIND USER
      // ==========================================

      const user =
        await User.findOne({
          email: normalizedEmail,
        });

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            "Password reset session is invalid.",
        });
      }

      // ==========================================
      // HASH NEW PASSWORD
      // ==========================================

      user.password =
        await bcrypt.hash(
          password,
          12
        );

      // ==========================================
      // RESET LOGIN SECURITY
      // ==========================================

      user.loginAttempts = 0;
      user.lockUntil = null;

      // ==========================================
      // INVALIDATE OLD JWT SESSIONS
      // ==========================================

      user.tokenVersion =
        (user.tokenVersion || 0) + 1;

      // ==========================================
      // SAVE USER
      // ==========================================

      await user.save();

      // ==========================================
      // DELETE USED OTP
      // ==========================================

      await OTP.deleteOne({
        _id: otpRecord._id,
      });

      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(200).json({
        success: true,
        message:
          "Password updated successfully. You can now login.",
      });
    } catch (error) {
      console.error(
        "Reset password after verification error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error while updating password.",
      });
    }
  };

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  registerUser,
  registerUserAfterVerification,
  loginUser,
  loginUserAfterVerification,
  forgotPassword,
  resetPassword,
  resetPasswordAfterVerification,
};