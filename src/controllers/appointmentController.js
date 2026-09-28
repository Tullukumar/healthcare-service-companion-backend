const Appointment = require("../models/Appointment");
const DoctorProfile = require("../models/DoctorProfile");
const User = require("../models/User");

const {
  sendEmail,
} = require("../utils/email");

// ==========================================
// CREATE APPOINTMENT
// POST /api/appointments
// ==========================================

const createAppointment = async (req, res) => {
  try {
    // ------------------------------------------
    // ONLY PATIENTS CAN BOOK
    // ------------------------------------------

    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can book appointments",
      });
    }

    // ------------------------------------------
    // REQUEST DATA
    // ------------------------------------------

    const {
      doctor,
      date,
      time,
      reason,
    } = req.body;

    // ------------------------------------------
    // REQUIRED FIELDS
    // ------------------------------------------

    if (!doctor || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Doctor, date and time are required",
      });
    }

    // ------------------------------------------
    // FIND APPROVED DOCTOR
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        _id: doctor,
        status: "approved",
      }).populate(
        "user",
        "name email phone"
      );

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: "Verified doctor not found",
      });
    }

    // ------------------------------------------
    // CHECK SLOT AVAILABILITY
    // ------------------------------------------

    const existingAppointment =
      await Appointment.findOne({
        doctor,
        date,
        time,
        status: {
          $in: ["pending", "confirmed"],
        },
      });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "This appointment slot is already booked",
      });
    }

    // ------------------------------------------
    // CREATE APPOINTMENT
    // ------------------------------------------

    const appointment =
      await Appointment.create({
        patient: req.user.userId,
        doctor,
        date,
        time,
        reason,
        consultationFee:
          doctorProfile.consultationFee || 0,
        status: "pending",
      });

    // ------------------------------------------
    // POPULATE APPOINTMENT
    // ------------------------------------------

    const populatedAppointment =
      await Appointment.findById(
        appointment._id
      )
        .populate(
          "patient",
          "name email phone"
        )
        .populate(
          "doctor",
          "specialization qualification experience consultationFee hospital city profileImage user"
        );

    // ------------------------------------------
    // SEND EMAIL TO DOCTOR
    // ------------------------------------------

    try {
      const doctorEmail =
        doctorProfile.user?.email;

      const doctorName =
        doctorProfile.user?.name ||
        "Doctor";

      const patientName =
        populatedAppointment.patient?.name ||
        "Patient";

      if (doctorEmail) {
        await sendEmail({
          to: doctorEmail,

          subject:
            "New Appointment Request - HealthCompanion",

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
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                  "
                >
                  <h1
                    style="
                      color: #2563eb;
                      margin-bottom: 5px;
                    "
                  >
                    HealthCompanion
                  </h1>

                  <h2>
                    New Appointment Request
                  </h2>

                  <p>
                    Hello Dr. ${doctorName},
                  </p>

                  <p>
                    You have received a new appointment
                    request from a patient.
                  </p>

                  <div
                    style="
                      background: #f8fafc;
                      padding: 20px;
                      border-radius: 12px;
                      margin: 20px 0;
                    "
                  >
                    <p>
                      <strong>Patient:</strong>
                      ${patientName}
                    </p>

                    <p>
                      <strong>Date:</strong>
                      ${date}
                    </p>

                    <p>
                      <strong>Time:</strong>
                      ${time}
                    </p>

                    <p>
                      <strong>Reason:</strong>
                      ${
                        reason ||
                        "Not provided"
                      }
                    </p>

                    <p>
                      <strong>Consultation Fee:</strong>
                      ₹${
                        doctorProfile.consultationFee ||
                        0
                      }
                    </p>

                    <p>
                      <strong>Status:</strong>
                      Pending
                    </p>
                  </div>

                  <p>
                    Please log in to your HealthCompanion
                    doctor dashboard to review this
                    appointment.
                  </p>

                  <hr />

                  <p
                    style="
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    This is an automated email from
                    HealthCompanion.
                  </p>
                </div>
              </body>
            </html>
          `,
        });
      } else {
        console.log(
          "⚠️ Doctor email not found. Appointment email not sent."
        );
      }
    } catch (emailError) {
      console.error(
        "⚠️ Doctor notification email failed:",
        emailError.message
      );
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Appointment booked successfully",
      appointment: populatedAppointment,
    });
  } catch (error) {
    console.error(
      "Create appointment error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while booking appointment",
    });
  }
};

// ==========================================
// GET MY APPOINTMENTS
// GET /api/appointments/my
// ==========================================

const getMyAppointments = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // ONLY PATIENTS
    // ------------------------------------------

    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message:
          "Only patients can access their appointments",
      });
    }

    // ------------------------------------------
    // FIND PATIENT APPOINTMENTS
    // ------------------------------------------

    const appointments =
      await Appointment.find({
        patient: req.user.userId,
      })
        .populate(
          "doctor",
          "specialization qualification experience consultationFee hospital city profileImage"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error(
      "Get my appointments error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while loading appointments",
    });
  }
};

// ==========================================
// GET DOCTOR APPOINTMENTS
// GET /api/appointments/doctor
// ==========================================

const getDoctorAppointments = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // ONLY DOCTORS
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can access doctor appointments",
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
          "Doctor profile not found",
      });
    }

    // ------------------------------------------
    // FIND APPOINTMENTS
    // ------------------------------------------

    const appointments =
      await Appointment.find({
        doctor: doctorProfile._id,
      })
        .populate(
          "patient",
          "name email phone"
        )
        .populate(
          "doctor",
          "specialization qualification experience consultationFee hospital city profileImage"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    console.error(
      "Get doctor appointments error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while loading doctor appointments",
    });
  }
};

// ==========================================
// APPROVE APPOINTMENT
// PATCH /api/appointments/:id/approve
// ==========================================

const approveAppointment = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // ONLY DOCTORS
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can approve appointments",
      });
    }

    // ------------------------------------------
    // FIND DOCTOR PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      }).populate(
        "user",
        "name email"
      );

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found",
      });
    }

    // ------------------------------------------
    // FIND APPOINTMENT
    // ------------------------------------------

    const appointment =
      await Appointment.findOne({
        _id: req.params.id,
        doctor: doctorProfile._id,
      }).populate(
        "patient",
        "name email phone"
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "Appointment not found",
      });
    }

    // ------------------------------------------
    // CHECK STATUS
    // ------------------------------------------

    if (
      appointment.status !==
      "pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending appointments can be approved",
      });
    }

    // ------------------------------------------
    // APPROVE
    // ------------------------------------------

    appointment.status =
      "confirmed";

    await appointment.save();

    // ------------------------------------------
    // SEND EMAIL TO PATIENT
    // ------------------------------------------

    try {
      const patientEmail =
        appointment.patient?.email;

      const patientName =
        appointment.patient?.name ||
        "Patient";

      const doctorName =
        doctorProfile.user?.name ||
        "Doctor";

      if (patientEmail) {
        await sendEmail({
          to: patientEmail,

          subject:
            "Appointment Confirmed - HealthCompanion",

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
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                  "
                >
                  <h1
                    style="
                      color: #2563eb;
                    "
                  >
                    HealthCompanion
                  </h1>

                  <h2>
                    ✅ Appointment Confirmed
                  </h2>

                  <p>
                    Hello ${patientName},
                  </p>

                  <p>
                    Your appointment has been
                    confirmed by Dr. ${doctorName}.
                  </p>

                  <div
                    style="
                      background: #f0fdf4;
                      padding: 20px;
                      border-radius: 12px;
                      margin: 20px 0;
                    "
                  >
                    <p>
                      <strong>Doctor:</strong>
                      ${doctorName}
                    </p>

                    <p>
                      <strong>Date:</strong>
                      ${appointment.date}
                    </p>

                    <p>
                      <strong>Time:</strong>
                      ${appointment.time}
                    </p>

                    <p>
                      <strong>Status:</strong>
                      Confirmed
                    </p>
                  </div>

                  <p>
                    Please be available at the scheduled
                    appointment time.
                  </p>

                  <hr />

                  <p
                    style="
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    This is an automated email from
                    HealthCompanion.
                  </p>
                </div>
              </body>
            </html>
          `,
        });
      } else {
        console.log(
          "⚠️ Patient email not found. Confirmation email not sent."
        );
      }
    } catch (emailError) {
      console.error(
        "⚠️ Patient confirmation email failed:",
        emailError.message
      );
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Appointment approved successfully",
      appointment,
    });
  } catch (error) {
    console.error(
      "Approve appointment error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while approving appointment",
    });
  }
};

// ==========================================
// REJECT APPOINTMENT
// PATCH /api/appointments/:id/reject
// ==========================================

const rejectAppointment = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // ONLY DOCTORS
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can reject appointments",
      });
    }

    // ------------------------------------------
    // FIND DOCTOR PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      }).populate(
        "user",
        "name email"
      );

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found",
      });
    }

    // ------------------------------------------
    // FIND APPOINTMENT
    // ------------------------------------------

    const appointment =
      await Appointment.findOne({
        _id: req.params.id,
        doctor: doctorProfile._id,
      }).populate(
        "patient",
        "name email phone"
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "Appointment not found",
      });
    }

    // ------------------------------------------
    // CHECK STATUS
    // ------------------------------------------

    if (
      appointment.status !==
      "pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only pending appointments can be rejected",
      });
    }

    // ------------------------------------------
    // REJECT
    // ------------------------------------------

    appointment.status =
      "cancelled";

    await appointment.save();

    // ------------------------------------------
    // SEND EMAIL TO PATIENT
    // ------------------------------------------

    try {
      const patientEmail =
        appointment.patient?.email;

      const patientName =
        appointment.patient?.name ||
        "Patient";

      const doctorName =
        doctorProfile.user?.name ||
        "Doctor";

      if (patientEmail) {
        await sendEmail({
          to: patientEmail,

          subject:
            "Appointment Request Rejected - HealthCompanion",

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
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                  "
                >
                  <h1
                    style="
                      color: #2563eb;
                    "
                  >
                    HealthCompanion
                  </h1>

                  <h2>
                    Appointment Request Update
                  </h2>

                  <p>
                    Hello ${patientName},
                  </p>

                  <p>
                    Your appointment request with
                    Dr. ${doctorName} could not be
                    accepted.
                  </p>

                  <div
                    style="
                      background: #fef2f2;
                      padding: 20px;
                      border-radius: 12px;
                      margin: 20px 0;
                    "
                  >
                    <p>
                      <strong>Doctor:</strong>
                      ${doctorName}
                    </p>

                    <p>
                      <strong>Date:</strong>
                      ${appointment.date}
                    </p>

                    <p>
                      <strong>Time:</strong>
                      ${appointment.time}
                    </p>

                    <p>
                      <strong>Status:</strong>
                      Rejected
                    </p>
                  </div>

                  <p>
                    You can choose another available
                    appointment slot or doctor through
                    HealthCompanion.
                  </p>

                  <hr />

                  <p
                    style="
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    This is an automated email from
                    HealthCompanion.
                  </p>
                </div>
              </body>
            </html>
          `,
        });
      } else {
        console.log(
          "⚠️ Patient email not found. Rejection email not sent."
        );
      }
    } catch (emailError) {
      console.error(
        "⚠️ Patient rejection email failed:",
        emailError.message
      );
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Appointment rejected successfully",
      appointment,
    });
  } catch (error) {
    console.error(
      "Reject appointment error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while rejecting appointment",
    });
  }
};

// ==========================================
// COMPLETE APPOINTMENT
// PATCH /api/appointments/:id/complete
// ==========================================

const completeAppointment = async (
  req,
  res
) => {
  try {
    // ------------------------------------------
    // ONLY DOCTORS
    // ------------------------------------------

    if (req.user.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Only doctors can complete appointments",
      });
    }

    // ------------------------------------------
    // FIND DOCTOR PROFILE
    // ------------------------------------------

    const doctorProfile =
      await DoctorProfile.findOne({
        user: req.user.userId,
      }).populate(
        "user",
        "name email"
      );

    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message:
          "Doctor profile not found",
      });
    }

    // ------------------------------------------
    // FIND APPOINTMENT
    // ------------------------------------------

    const appointment =
      await Appointment.findOne({
        _id: req.params.id,
        doctor: doctorProfile._id,
      }).populate(
        "patient",
        "name email phone"
      );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message:
          "Appointment not found",
      });
    }

    // ------------------------------------------
    // CHECK STATUS
    // ------------------------------------------

    if (
      appointment.status !==
      "confirmed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only confirmed appointments can be completed",
      });
    }

    // ------------------------------------------
    // COMPLETE
    // ------------------------------------------

    appointment.status =
      "completed";

    await appointment.save();

    // ------------------------------------------
    // SEND EMAIL TO PATIENT
    // ------------------------------------------

    try {
      const patientEmail =
        appointment.patient?.email;

      const patientName =
        appointment.patient?.name ||
        "Patient";

      const doctorName =
        doctorProfile.user?.name ||
        "Doctor";

      if (patientEmail) {
        await sendEmail({
          to: patientEmail,

          subject:
            "Appointment Completed - HealthCompanion",

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
                    background: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                  "
                >
                  <h1
                    style="
                      color: #2563eb;
                    "
                  >
                    HealthCompanion
                  </h1>

                  <h2>
                    ✅ Appointment Completed
                  </h2>

                  <p>
                    Hello ${patientName},
                  </p>

                  <p>
                    Your appointment with
                    Dr. ${doctorName} has been
                    marked as completed.
                  </p>

                  <div
                    style="
                      background: #f0fdf4;
                      padding: 20px;
                      border-radius: 12px;
                      margin: 20px 0;
                    "
                  >
                    <p>
                      <strong>Doctor:</strong>
                      ${doctorName}
                    </p>

                    <p>
                      <strong>Date:</strong>
                      ${appointment.date}
                    </p>

                    <p>
                      <strong>Time:</strong>
                      ${appointment.time}
                    </p>

                    <p>
                      <strong>Status:</strong>
                      Completed
                    </p>
                  </div>

                  <p>
                    Thank you for using HealthCompanion.
                  </p>

                  <hr />

                  <p
                    style="
                      color: #64748b;
                      font-size: 13px;
                    "
                  >
                    This is an automated email from
                    HealthCompanion.
                  </p>
                </div>
              </body>
            </html>
          `,
        });
      } else {
        console.log(
          "⚠️ Patient email not found. Completion email not sent."
        );
      }
    } catch (emailError) {
      console.error(
        "⚠️ Patient completion email failed:",
        emailError.message
      );
    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Appointment completed successfully",
      appointment,
    });
  } catch (error) {
    console.error(
      "Complete appointment error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while completing appointment",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  approveAppointment,
  rejectAppointment,
  completeAppointment,
};
