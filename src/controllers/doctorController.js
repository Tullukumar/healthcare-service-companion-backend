const DoctorProfile = require("../models/DoctorProfile");
const Hospital = require("../models/Hospital");
const uploadToCloudinary = require("../utils/cloudinaryUpload");

// ==========================================
// DEFAULT DOCTOR SCHEDULE
// ==========================================

const DEFAULT_SCHEDULE = [
  {
    day: "Monday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
  {
    day: "Tuesday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
  {
    day: "Wednesday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
  {
    day: "Thursday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
  {
    day: "Friday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
  {
    day: "Saturday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
  {
    day: "Sunday",
    isAvailable: false,
    startTime: "",
    endTime: "",
    slotDuration: 30,
  },
];

const ALLOWED_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const ALLOWED_SLOT_DURATIONS = [
  15,
  30,
  45,
  60,
];

// ==========================================
// CREATE DOCTOR PROFILE
// POST /api/doctors/profile
// ==========================================

const createDoctorProfile = async (req, res) => {
  try {
    // ------------------------------------------
    // CHECK ROLE
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can create a doctor profile.",
      });
    }

    // ------------------------------------------
    // GET BODY
    // ------------------------------------------

    const {
      specialization,
      qualification,
      experience,
      consultationFee,
      hospital,
      city,
      about,
    } = req.body;

    // ------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ------------------------------------------

    if (
      !specialization ||
      !qualification ||
      experience === undefined ||
      consultationFee === undefined ||
      !hospital
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Specialization, qualification, experience, consultation fee and hospital are required.",
      });
    }

    // ------------------------------------------
    // CHECK EXISTING PROFILE
    // ------------------------------------------

    const existingProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message:
          "Doctor profile already exists.",
      });
    }

    // ------------------------------------------
    // CHECK HOSPITAL
    // ------------------------------------------

    const selectedHospital =
      await Hospital.findOne({
        _id: hospital,
        isActive: true,
      });

    if (!selectedHospital) {
      return res.status(404).json({
        success: false,
        message:
          "Selected hospital not found or inactive.",
      });
    }

    // ------------------------------------------
    // UPLOAD PROFILE IMAGE
    // ------------------------------------------

    let profileImage = "";

    if (req.file) {
      const uploadResult =
        await uploadToCloudinary(
          req.file.buffer
        );

      profileImage =
        uploadResult.secure_url;
    }

    // ------------------------------------------
    // CREATE DOCTOR PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.create({
        // IMPORTANT:
        // authMiddleware provides req.user.userId
        user: req.user.userId,

        specialization,
        qualification,
        experience,
        consultationFee,

        hospital: selectedHospital._id,

        city: city || "",
        about: about || "",

        profileImage,

        status: "pending",
        rejectionReason: "",

        // Initialize complete weekly schedule
        schedule: DEFAULT_SCHEDULE,
      });

    // ------------------------------------------
    // POPULATE RESPONSE
    // ------------------------------------------

    const populatedDoctor =
      await DoctorProfile.findById(
        doctorProfile._id
      )
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        );

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Doctor profile created successfully. Waiting for hospital admin approval.",
      doctorProfile: populatedDoctor,
    });
  } catch (error) {
    console.error(
      "Create doctor profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating doctor profile.",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE DOCTOR PROFILE
// PUT /api/doctors/profile
// ==========================================

const updateDoctorProfile = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // CHECK ROLE
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can update a doctor profile.",
      });
    }

    // ------------------------------------------
    // FIND PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      });

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found.",
      });
    }

    // ------------------------------------------
    // GET BODY
    // ------------------------------------------

    const {
      specialization,
      qualification,
      experience,
      consultationFee,
      hospital,
      city,
      about,
    } = req.body;

    // ------------------------------------------
    // UPDATE TEXT / NUMBER FIELDS
    // ------------------------------------------

    if (specialization !== undefined) {
      doctorProfile.specialization =
        specialization;
    }

    if (qualification !== undefined) {
      doctorProfile.qualification =
        qualification;
    }

    if (experience !== undefined) {
      doctorProfile.experience =
        experience;
    }

    if (consultationFee !== undefined) {
      doctorProfile.consultationFee =
        consultationFee;
    }

    if (city !== undefined) {
      doctorProfile.city = city;
    }

    if (about !== undefined) {
      doctorProfile.about = about;
    }

    // ------------------------------------------
    // UPDATE HOSPITAL
    // ------------------------------------------

    if (hospital !== undefined) {
      const selectedHospital =
        await Hospital.findOne({
          _id: hospital,
          isActive: true,
        });

      if (!selectedHospital) {
        return res.status(404).json({
          success: false,
          message:
            "Selected hospital not found or inactive.",
        });
      }

      doctorProfile.hospital =
        selectedHospital._id;
    }

    // ------------------------------------------
    // UPDATE PROFILE IMAGE
    // ------------------------------------------

    if (req.file) {
      const uploadResult =
        await uploadToCloudinary(
          req.file.buffer
        );

      doctorProfile.profileImage =
        uploadResult.secure_url;
    }

    // ------------------------------------------
    // SAVE
    // ------------------------------------------

    await doctorProfile.save();

    // ------------------------------------------
    // POPULATE UPDATED PROFILE
    // ------------------------------------------

    const updatedDoctorProfile =
      await DoctorProfile.findById(
        doctorProfile._id
      )
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        );

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Doctor profile updated successfully.",
      doctorProfile:
        updatedDoctorProfile,
    });
  } catch (error) {
    console.error(
      "Update doctor profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating doctor profile.",
      error: error.message,
    });
  }
};

// ==========================================
// GET MY DOCTOR PROFILE
// GET /api/doctors/profile/me
// ==========================================

const getMyDoctorProfile = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // CHECK ROLE
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can access this profile.",
      });
    }

    // ------------------------------------------
    // FIND PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      })
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        );

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found.",
      });
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      doctorProfile,
    });
  } catch (error) {
    console.error(
      "Get doctor profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching doctor profile.",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL APPROVED DOCTORS
// GET /api/doctors
// ==========================================

const getDoctors = async (
  req,
  res
) => {
  try {
    const doctors =
      await DoctorProfile.find({
        status: "approved",
      })
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error(
      "Get doctors error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching doctors.",
      error: error.message,
    });
  }
};

// ==========================================
// GET DOCTOR BY ID
// GET /api/doctors/:id
// ==========================================

const getDoctorById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const doctor =
      await DoctorProfile.findOne({
        _id: id,
        status: "approved",
      })
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    return res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error(
      "Get doctor by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching doctor.",
      error: error.message,
    });
  }
};

// ==========================================
// GET MY DOCTOR SCHEDULE
// GET /api/doctors/schedule
// ==========================================

const getDoctorSchedule = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // CHECK ROLE
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can access their schedule.",
      });
    }

    // ------------------------------------------
    // FIND DOCTOR PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      }).select("schedule");

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found.",
      });
    }

    // ------------------------------------------
    // MERGE SAVED SCHEDULE WITH DEFAULT
    // ------------------------------------------

    const savedSchedule =
      Array.isArray(
        doctorProfile.schedule
      )
        ? doctorProfile.schedule
        : [];

    const schedule =
      DEFAULT_SCHEDULE.map(
        (defaultDay) => {
          const savedDay =
            savedSchedule.find(
              (item) =>
                item.day ===
                defaultDay.day
            );

          if (!savedDay) {
            return {
              ...defaultDay,
            };
          }

          return {
            day: defaultDay.day,

            isAvailable:
              savedDay.isAvailable ===
              true,

            startTime:
              savedDay.startTime || "",

            endTime:
              savedDay.endTime || "",

            slotDuration:
              Number(
                savedDay.slotDuration
              ) || 30,
          };
        }
      );

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      schedule,
    });
  } catch (error) {
    console.error(
      "Get doctor schedule error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching doctor schedule.",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE MY DOCTOR SCHEDULE
// PUT /api/doctors/schedule
// ==========================================

const updateDoctorSchedule = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // CHECK ROLE
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can update their schedule.",
      });
    }

    // ------------------------------------------
    // FIND DOCTOR PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      });

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found.",
      });
    }

    // ------------------------------------------
    // GET SCHEDULE
    // ------------------------------------------

    const { schedule } = req.body;

    if (!Array.isArray(schedule)) {
      return res.status(400).json({
        success: false,
        message:
          "Schedule must be an array.",
      });
    }

    // ------------------------------------------
    // VALIDATE SCHEDULE
    // ------------------------------------------

    for (const item of schedule) {
      // Check day
      if (
        !ALLOWED_DAYS.includes(
          item.day
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid schedule day: ${item.day}`,
        });
      }

      // Check availability
      const isAvailable =
        item.isAvailable === true;

      // If available, start/end are required
      if (isAvailable) {
        if (
          !item.startTime ||
          !item.endTime
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${item.day}: start time and end time are required when the doctor is available.`,
          });
        }

        // Make sure end is after start
        if (
          item.startTime >=
          item.endTime
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${item.day}: end time must be later than start time.`,
          });
        }
      }

      // Validate duration
      const slotDuration =
        Number(
          item.slotDuration
        ) || 30;

      if (
        !ALLOWED_SLOT_DURATIONS.includes(
          slotDuration
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${item.day}: invalid slot duration.`,
        });
      }
    }

    // ------------------------------------------
    // BUILD COMPLETE WEEK
    // ------------------------------------------

    const cleanSchedule =
      ALLOWED_DAYS.map(
        (day) => {
          const item =
            schedule.find(
              (scheduleDay) =>
                scheduleDay.day === day
            );

          // Day not sent by frontend
          if (!item) {
            return {
              day,
              isAvailable: false,
              startTime: "",
              endTime: "",
              slotDuration: 30,
            };
          }

          const isAvailable =
            item.isAvailable === true;

          return {
            day,

            isAvailable,

            startTime:
              isAvailable
                ? item.startTime || ""
                : "",

            endTime:
              isAvailable
                ? item.endTime || ""
                : "",

            slotDuration:
              Number(
                item.slotDuration
              ) || 30,
          };
        }
      );

    // ------------------------------------------
    // SAVE SCHEDULE
    // ------------------------------------------

    doctorProfile.schedule =
      cleanSchedule;

    await doctorProfile.save();

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

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
        "Server error while updating doctor schedule.",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createDoctorProfile,
  updateDoctorProfile,
  getMyDoctorProfile,
  getDoctors,
  getDoctorById,

  // Schedule
  getDoctorSchedule,
  updateDoctorSchedule,
};