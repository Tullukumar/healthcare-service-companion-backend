const MedicalRecord = require("../models/MedicalRecord");
const Appointment = require("../models/Appointment");
const DoctorProfile = require("../models/DoctorProfile");

// ======================================================
// CREATE MEDICAL RECORD
// Doctor creates a medical record for a patient
// ======================================================

const createMedicalRecord = async (req, res) => {
  try {
    // Only doctors can create medical records
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create medical records.",
      });
    }

    const {
      patient,
      appointment,
      diagnosis,
      symptoms,
      allergies,
      medications,
      medicalHistory,
      notes,
      followUpDate,
    } = req.body;

    if (!patient) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required.",
      });
    }

    // Find doctor profile belonging to logged-in user
const doctorProfile = await DoctorProfile.findOne({
  user: req.user.userId,
});

if (!doctorProfile) {
  return res.status(404).json({
    success: false,
    message: "Doctor profile not found.",
  });
}

// If appointment is provided, verify it
if (appointment) {
  const existingAppointment =
    await Appointment.findById(appointment);

  if (!existingAppointment) {
    return res.status(404).json({
      success: false,
      message: "Appointment not found.",
    });
  }

  if (
    String(existingAppointment.patient) !==
    String(patient)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Appointment does not belong to this patient.",
    });
  }

  if (
    String(existingAppointment.doctor) !==
    String(doctorProfile._id)
  ) {
    return res.status(403).json({
      success: false,
      message:
        "You are not authorized for this appointment.",
    });
  }
}



    const medicalRecord =
      await MedicalRecord.create({
        patient,
        doctor: doctorProfile._id,
        appointment: appointment || null,
        diagnosis: diagnosis || "",
        symptoms: symptoms || "",
        allergies: allergies || "",
        medications: medications || "",
        medicalHistory: medicalHistory || "",
        notes: notes || "",
        followUpDate: followUpDate || null,
      });

    const populatedRecord =
      await MedicalRecord.findById(
        medicalRecord._id
      )
        .populate("patient", "name email phone")
        .populate("doctor")
        .populate(
          "appointment",
          "date time reason status"
        );

    return res.status(201).json({
      success: true,
      message:
        "Medical record created successfully.",
      record: populatedRecord,
    });
  } catch (error) {
    console.error(
      "Create medical record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating medical record.",
    });
  }
};

// ======================================================
// GET MY MEDICAL RECORDS
// Patient gets their own records
// ======================================================

const getMyMedicalRecords = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message:
          "Only patients can access this endpoint.",
      });
    }

    const records = await MedicalRecord.find({
      patient: req.user.userId,
    })
      .populate("doctor")
      .populate(
        "appointment",
        "date time reason status"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error(
      "Get medical records error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching medical records.",
    });
  }
};

// ======================================================
// GET PATIENT MEDICAL RECORDS
// Doctor gets records of a patient
// ======================================================

const getPatientMedicalRecords = async (
  req,
  res
) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can access patient medical records.",
      });
    }

    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required.",
      });
    }

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

    // Check whether doctor has an appointment
    // with this patient.
    const appointment =
      await Appointment.findOne({
        doctor: doctorProfile._id,
        patient: patientId,
      });

    if (!appointment) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view this patient's records.",
      });
    }

    const records =
      await MedicalRecord.find({
        patient: patientId,
      })
        .populate("patient", "name email phone")
        .populate("doctor")
        .populate(
          "appointment",
          "date time reason status"
        )
        .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error(
      "Get patient medical records error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching patient records.",
    });
  }
};

// ======================================================
// UPDATE MEDICAL RECORD
// Doctor updates a record they created
// ======================================================

const updateMedicalRecord = async (
  req,
  res
) => {
  try {
    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can update medical records.",
      });
    }

    const { id } = req.params;

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

    const record =
      await MedicalRecord.findOne({
        _id: id,
        doctor: doctorProfile._id,
      });

    if (!record) {
      return res.status(404).json({
        success: false,
        message:
          "Medical record not found or unauthorized.",
      });
    }

    const allowedFields = [
      "diagnosis",
      "symptoms",
      "allergies",
      "medications",
      "medicalHistory",
      "notes",
      "followUpDate",
    ];

    allowedFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        record[field] = req.body[field];
      }
    });

    await record.save();

    const updatedRecord =
      await MedicalRecord.findById(
        record._id
      )
        .populate("patient", "name email phone")
        .populate("doctor")
        .populate(
          "appointment",
          "date time reason status"
        );

    return res.status(200).json({
      success: true,
      message:
        "Medical record updated successfully.",
      record: updatedRecord,
    });
  } catch (error) {
    console.error(
      "Update medical record error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating medical record.",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createMedicalRecord,
  getMyMedicalRecords,
  getPatientMedicalRecords,
  updateMedicalRecord,
};