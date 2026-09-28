const DoctorProfile = require("../models/DoctorProfile");

// ==========================================
// GET MY SCHEDULE
// GET /api/doctors/schedule
// ==========================================

const getMySchedule = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findOne({
      user: req.user.userId,
    });

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor schedule fetched successfully.",
      schedule: doctorProfile.schedule || [],
    });
  } catch (error) {
    console.error(
      "Get doctor schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch doctor schedule.",
    });
  }
};

// ==========================================
// UPDATE MY SCHEDULE
// PUT /api/doctors/schedule
// ==========================================

const updateMySchedule = async (req, res) => {
  try {
    const { schedule } = req.body;

    // ========================================
    // VALIDATE SCHEDULE
    // ========================================

    if (!Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        message: "Schedule must be an array.",
      });
    }

    // ========================================
    // ALLOWED DAYS
    // ========================================

    const allowedDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // ========================================
    // VALIDATE EACH DAY
    // ========================================

    for (const item of schedule) {
      if (!allowedDays.includes(item.day)) {
        return res.status(400).json({
          success: false,
          message: `Invalid day: ${item.day}`,
        });
      }

      if (
        typeof item.isAvailable !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `isAvailable must be true or false for ${item.day}.`,
        });
      }

      // ======================================
      // IF DAY IS AVAILABLE
      // ======================================

      if (item.isAvailable) {
        if (
          !item.startTime ||
          !item.endTime
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Start time and end time are required for ${item.day}.`,
          });
        }

        // ====================================
        // VALIDATE TIME FORMAT
        // HH:MM
        // ====================================

        const timeRegex =
          /^([01]\d|2[0-3]):([0-5]\d)$/;

        if (
          !timeRegex.test(item.startTime) ||
          !timeRegex.test(item.endTime)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Invalid time format for ${item.day}. Use HH:MM.`,
          });
        }

        // ====================================
        // CHECK START < END
        // ====================================

        if (
          item.startTime >= item.endTime
        ) {
          return res.status(400).json({
            success: false,
            message:
              `End time must be later than start time for ${item.day}.`,
          });
        }
      }

      // ======================================
      // VALIDATE SLOT DURATION
      // ======================================

      const slotDuration =
        Number(item.slotDuration);

      if (
        ![15, 30, 45, 60].includes(
          slotDuration
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid slot duration for ${item.day}.`,
        });
      }
    }

    // ========================================
    // CHECK DUPLICATE DAYS
    // ========================================

    const days = schedule.map(
      (item) => item.day
    );

    if (
      new Set(days).size !== days.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Each day can only appear once in the schedule.",
      });
    }

    // ========================================
    // FIND DOCTOR
    // ========================================

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      });

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found.",
      });
    }

    // ========================================
    // UPDATE SCHEDULE
    // ========================================

    doctorProfile.schedule =
      schedule.map((item) => ({
        day: item.day,

        isAvailable:
          item.isAvailable,

        startTime:
          item.isAvailable
            ? item.startTime
            : "",

        endTime:
          item.isAvailable
            ? item.endTime
            : "",

        slotDuration:
          Number(item.slotDuration) || 30,
      }));

    await doctorProfile.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message:
        "Doctor schedule updated successfully.",
      schedule:
        doctorProfile.schedule,
    });
  } catch (error) {
    console.error(
      "Update doctor schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update doctor schedule.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  getMySchedule,
  updateMySchedule,
};