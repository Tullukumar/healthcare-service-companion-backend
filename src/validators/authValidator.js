const Joi = require("joi");

// ==========================================
// REGISTER
// ==========================================

const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required(),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),

  // Admin removed from public registration
  role: Joi.string()
    .valid(
      "patient",
      "doctor",
      "hospital",
      "ambulance"
    )
    .default("patient"),

  phone: Joi.string()
    .trim()
    .allow(""),

  hospitalName: Joi.string()
    .trim()
    .max(100)
    .allow(""),

  city: Joi.string()
    .trim()
    .max(100)
    .allow(""),

  address: Joi.string()
    .trim()
    .max(300)
    .allow(""),

  hospitalPhone: Joi.string()
    .trim()
    .allow(""),

  hospitalEmail: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .allow(""),
});

// ==========================================
// REGISTER AFTER OTP VERIFICATION
// ==========================================

const registerVerifiedSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required(),

  identifier: Joi.string()
    .trim()
    .required(),

  type: Joi.string()
    .valid("email", "phone")
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),

  // Admin removed from public registration
  role: Joi.string()
    .valid(
      "patient",
      "doctor",
      "hospital",
      "ambulance"
    )
    .required(),

  verificationToken: Joi.string()
    .trim()
    .required(),
});

// ==========================================
// LOGIN
// ==========================================

const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .required(),

  // Login allows existing passwords
  // with minimum 6 characters.
  password: Joi.string()
    .min(6)
    .max(128)
    .required(),

  // Admin is allowed here because admins
  // must be able to log in.
  role: Joi.string()
    .valid(
      "patient",
      "doctor",
      "hospital",
      "ambulance",
      "admin"
    )
    .required(),
});

// ==========================================
// LOGIN AFTER OTP VERIFICATION
// ==========================================

const loginVerifiedSchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .required(),

  type: Joi.string()
    .valid("email", "phone")
    .required(),

  verificationToken: Joi.string()
    .trim()
    .required(),

  // Admin is allowed here because admins
  // must be able to log in.
  role: Joi.string()
    .valid(
      "patient",
      "doctor",
      "hospital",
      "ambulance",
      "admin"
    )
    .required(),
});

// ==========================================
// FORGOT PASSWORD
// ==========================================

const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .required(),
});

// ==========================================
// RESET PASSWORD
// ==========================================

const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
});

// ==========================================
// RESET PASSWORD AFTER OTP VERIFICATION
// ==========================================

const resetPasswordVerifiedSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({
      tlds: {
        allow: false,
      },
    })
    .required(),

  verificationToken: Joi.string()
    .trim()
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
});

// ==========================================
// SEND OTP
// ==========================================

const sendOTPSchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .required(),

  type: Joi.string()
    .valid("email", "phone")
    .required(),

  purpose: Joi.string()
    .valid(
      "register",
      "login",
      "forgot-password"
    )
    .required(),
});

// ==========================================
// VERIFY OTP
// ==========================================

const verifyOTPSchema = Joi.object({
  identifier: Joi.string()
    .trim()
    .required(),

  type: Joi.string()
    .valid("email", "phone")
    .required(),

  purpose: Joi.string()
    .valid(
      "register",
      "login",
      "forgot-password"
    )
    .required(),

  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      "string.pattern.base":
        "OTP must be exactly 6 digits",
    }),
});

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  registerSchema,
  registerVerifiedSchema,
  loginSchema,
  loginVerifiedSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordVerifiedSchema,
  sendOTPSchema,
  verifyOTPSchema,
};