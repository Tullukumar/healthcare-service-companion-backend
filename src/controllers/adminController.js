const DoctorProfile = require("../models/DoctorProfile");
const Hospital = require("../models/Hospital");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

// ==========================================
// GET PENDING DOCTORS FOR ADMIN'S HOSPITAL
// ==========================================
const getPendingDoctors = async (req, res) => {
  try {
    // Only admins can access this
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access this",
      });
    }

    // ==========================================
    // FIND ADMIN'S HOSPITAL
    // ==========================================

    const hospital = await Hospital.findOne({
      admin: req.user.userId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message:
          "No active hospital is assigned to this admin",
      });
    }

    // ==========================================
    // FIND PENDING DOCTORS
    // ==========================================

    const doctors = await DoctorProfile.find({
      hospital: hospital._id,
      status: "pending",
    })
      .populate(
        "user",
        "name email phone"
      )
      .populate(
        "hospital",
        "name city address phone email"
      );

    res.status(200).json({
      success: true,
      count: doctors.length,

      hospital: {
        id: hospital._id,
        name: hospital.name,
        city: hospital.city,
      },

      doctors,
    });
  } catch (error) {
    console.error(
      "Get pending doctors error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching pending doctors",
    });
  }
};

// ==========================================
// VERIFY / APPROVE DOCTOR
// ==========================================
const verifyDoctor = async (req, res) => {
  try {
    // Only admins can verify doctors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can verify doctors",
      });
    }

    const { doctorId } = req.params;

    // ==========================================
    // FIND ADMIN'S HOSPITAL
    // ==========================================

    const hospital = await Hospital.findOne({
      admin: req.user.userId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message:
          "No active hospital is assigned to this admin",
      });
    }

    // ==========================================
    // FIND PENDING DOCTOR
    // ==========================================

    const doctor = await DoctorProfile.findOne({
      _id: doctorId,
      hospital: hospital._id,
      status: "pending",
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Pending doctor not found in your hospital",
      });
    }

    // ==========================================
    // APPROVE DOCTOR
    // ==========================================

    doctor.status = "approved";
    doctor.rejectionReason = "";

    await doctor.save();

    // ==========================================
    // RETURN UPDATED DOCTOR
    // ==========================================

    const approvedDoctor =
      await DoctorProfile.findById(
        doctor._id
      )
        .populate(
          "user",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        );

    res.status(200).json({
      success: true,
      message:
        "Doctor approved successfully",
      doctor: approvedDoctor,
    });
  } catch (error) {
    console.error(
      "Doctor approval error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while approving doctor",
    });
  }
};

// ==========================================
// REJECT DOCTOR
// ==========================================
const rejectDoctor = async (req, res) => {
  try {
    // Only admins can reject doctors
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reject doctors",
      });
    }

    const { doctorId } = req.params;
    const { reason } = req.body;

    // ==========================================
    // FIND ADMIN'S HOSPITAL
    // ==========================================

    const hospital = await Hospital.findOne({
      admin: req.user.userId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message:
          "No active hospital is assigned to this admin",
      });
    }

    // ==========================================
    // FIND PENDING DOCTOR
    // ==========================================

    const doctor = await DoctorProfile.findOne({
      _id: doctorId,
      hospital: hospital._id,
      status: "pending",
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message:
          "Pending doctor not found in your hospital",
      });
    }

    // ==========================================
    // REJECT DOCTOR
    // ==========================================

    doctor.status = "rejected";
    doctor.rejectionReason =
      reason?.trim() || "No reason provided";

    await doctor.save();

    res.status(200).json({
      success: true,
      message:
        "Doctor rejected successfully",
      doctor,
    });
  } catch (error) {
    console.error(
      "Doctor rejection error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while rejecting doctor",
    });
  }
};

// ==========================================
// ADMIN DASHBOARD OVERVIEW
// GET /api/admin/dashboard
// ==========================================
const getAdminDashboard = async (req, res) => {
  try {
    // Only admins
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access the dashboard",
      });
    }

    // ==========================================
    // FIND ADMIN'S HOSPITAL
    // ==========================================

    const hospital = await Hospital.findOne({
      admin: req.user.userId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message:
          "No active hospital is assigned to this admin",
      });
    }

    // ==========================================
    // FIND DOCTORS
    // ==========================================

    const doctors =
      await DoctorProfile.find({
        hospital: hospital._id,
      });

    const totalDoctors = doctors.length;

    const pendingDoctors = doctors.filter(
      (doctor) =>
        doctor.status === "pending"
    ).length;

    const approvedDoctors = doctors.filter(
      (doctor) =>
        doctor.status === "approved"
    ).length;

    const rejectedDoctors = doctors.filter(
      (doctor) =>
        doctor.status === "rejected"
    ).length;

    // ==========================================
    // FIND PATIENTS
    // ==========================================

    const doctorIds = doctors.map(
      (doctor) => doctor._id
    );

    const appointments =
      await Appointment.find({
        doctor: { $in: doctorIds },
      })
        .populate(
          "patient",
          "name email phone"
        )
        .populate({
          path: "doctor",
          populate: {
            path: "user",
            select: "name email phone",
          },
        });

    // ==========================================
    // UNIQUE PATIENTS
    // ==========================================

    const patientIds = [
      ...new Set(
        appointments.map(
          (appointment) =>
            appointment.patient?._id?.toString()
        ).filter(Boolean)
      ),
    ];

    const totalPatients =
      patientIds.length;

    // ==========================================
    // APPOINTMENT STATISTICS
    // ==========================================

    const totalAppointments =
      appointments.length;

    const pendingAppointments =
      appointments.filter(
        (appointment) =>
          appointment.status === "pending"
      ).length;

    const confirmedAppointments =
      appointments.filter(
        (appointment) =>
          appointment.status === "confirmed"
      ).length;

    const completedAppointments =
      appointments.filter(
        (appointment) =>
          appointment.status === "completed"
      ).length;

    const cancelledAppointments =
      appointments.filter(
        (appointment) =>
          appointment.status === "cancelled"
      ).length;

    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(200).json({
      success: true,

      hospital: {
        id: hospital._id,
        name: hospital.name,
        city: hospital.city,
        address: hospital.address,
        phone: hospital.phone,
        email: hospital.email,
      },

      statistics: {
        doctors: {
          total: totalDoctors,
          pending: pendingDoctors,
          approved: approvedDoctors,
          rejected: rejectedDoctors,
        },

        patients: {
          total: totalPatients,
        },

        appointments: {
          total: totalAppointments,
          pending: pendingAppointments,
          confirmed: confirmedAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
        },
      },

      recentAppointments:
        appointments.slice(-10).reverse(),
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while loading admin dashboard",
    });
  }
};

// ==========================================
// GET ALL DOCTORS FOR ADMIN'S HOSPITAL
// GET /api/admin/doctors
// ==========================================
const getAllDoctors = async (req, res) => {
  try {
    // Only admins can access this
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can access this",
      });
    }

    // ==========================================
    // FIND ADMIN'S HOSPITAL
    // ==========================================

    const hospital = await Hospital.findOne({
      admin: req.user.userId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message:
          "No active hospital is assigned to this admin",
      });
    }

    // ==========================================
    // FIND ALL DOCTORS
    // ==========================================

    const doctors = await DoctorProfile.find({
      hospital: hospital._id,
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

    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(200).json({
      success: true,
      count: doctors.length,
      hospital: {
        id: hospital._id,
        name: hospital.name,
        city: hospital.city,
      },
      doctors,
    });
  } catch (error) {
    console.error(
      "Get all doctors error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching doctors",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================
module.exports = {
  getPendingDoctors,
  verifyDoctor,
  getAdminDashboard,
  getAllDoctors,
};



