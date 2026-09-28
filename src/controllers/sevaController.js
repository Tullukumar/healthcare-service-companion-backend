// ==========================================
// SEVA CARE CONTROLLER
// ==========================================

const mongoose = require("mongoose");
const SevaRequest = require("../models/SevaRequest");

// ==========================================
// CREATE SEVA REQUEST
// POST /api/seva/requests
// ==========================================

const createSevaRequest = async (req, res) => {
  try {
    const {
      requestType,
      title,
      description,
      medicalCondition,
      hospital,
      requiredAmount,
      medicineDetails,
      equipmentDetails,
      bloodGroup,
      urgency,
      supportDeadline,
    } = req.body;

    // ==========================================
    // BASIC VALIDATION
    // ==========================================

    if (!requestType) {
      return res.status(400).json({
        success: false,
        message: "Request type is required.",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Request title is required.",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Request description is required.",
      });
    }

    // ==========================================
    // VALID REQUEST TYPES
    // ==========================================

    const validRequestTypes = [
      "FREE_TREATMENT",
      "FINANCIAL_ASSISTANCE",
      "MEDICINE",
      "MEDICAL_EQUIPMENT",
      "BLOOD",
    ];

    if (!validRequestTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid SevaCare request type.",
      });
    }

    // ==========================================
    // VALID URGENCY
    // ==========================================

    const validUrgencies = [
      "LOW",
      "MEDIUM",
      "HIGH",
      "EMERGENCY",
    ];

    const requestUrgency = urgency || "MEDIUM";

    if (!validUrgencies.includes(requestUrgency)) {
      return res.status(400).json({
        success: false,
        message: "Invalid urgency level.",
      });
    }

    // ==========================================
    // HOSPITAL VALIDATION
    // ==========================================

    let hospitalId = null;

    if (hospital) {
      if (!mongoose.Types.ObjectId.isValid(hospital)) {
        return res.status(400).json({
          success: false,
          message: "Invalid hospital ID.",
        });
      }

      hospitalId = hospital;
    }

    // ==========================================
    // REQUIRED AMOUNT VALIDATION
    // ==========================================

    let amount = 0;

    if (
      requiredAmount !== undefined &&
      requiredAmount !== null &&
      requiredAmount !== ""
    ) {
      amount = Number(requiredAmount);

      if (Number.isNaN(amount) || amount < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Required amount must be a valid positive number.",
        });
      }
    }

    // ==========================================
    // REQUEST-SPECIFIC VALIDATION
    // ==========================================

    if (
      requestType === "FINANCIAL_ASSISTANCE" &&
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required amount is required for financial assistance.",
      });
    }

    if (
      requestType === "MEDICINE" &&
      (!medicineDetails || !medicineDetails.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Medicine details are required.",
      });
    }

    if (
      requestType === "MEDICAL_EQUIPMENT" &&
      (!equipmentDetails || !equipmentDetails.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Equipment details are required.",
      });
    }

    if (
      requestType === "BLOOD" &&
      (!bloodGroup || !bloodGroup.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Blood group is required.",
      });
    }

    // ==========================================
    // SUPPORT DEADLINE
    // ==========================================

    let deadline = null;

    if (supportDeadline) {
      const parsedDeadline = new Date(supportDeadline);

      if (Number.isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid support deadline.",
        });
      }

      deadline = parsedDeadline;
    }

    // ==========================================
    // CREATE SEVA REQUEST
    // ==========================================

    const sevaRequest = await SevaRequest.create({
      patient: req.user._id,

      requestType,

      title: title.trim(),

      description: description.trim(),

      medicalCondition:
        medicalCondition?.trim() || "",

      hospital: hospitalId,

      requiredAmount: amount,

      receivedAmount: 0,

      medicineDetails:
        medicineDetails?.trim() || "",

      equipmentDetails:
        equipmentDetails?.trim() || "",

      bloodGroup:
        bloodGroup?.trim().toUpperCase() || "",

      urgency: requestUrgency,

      status: "PENDING",

      reviewedBy: null,

      reviewedAt: null,

      rejectionReason: "",

      adminNotes: "",

      supportDeadline: deadline,
    });

    // ==========================================
    // GET POPULATED REQUEST
    // ==========================================

    const populatedRequest =
      await SevaRequest.findById(
        sevaRequest._id
      )
        .populate(
          "patient",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        );

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message:
        "SevaCare request created successfully.",
      request: populatedRequest,
    });
  } catch (error) {
    console.error(
      "Create SevaCare request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create SevaCare request.",
    });
  }
};

// ==========================================
// GET MY SEVA REQUESTS
// GET /api/seva/requests/my
// ==========================================

const getMySevaRequests = async (req, res) => {
  try {
    const requests =
      await SevaRequest.find({
        patient: req.user._id,
      })
        .populate(
          "hospital",
          "name city address phone email"
        )
        .populate(
          "reviewedBy",
          "name email role"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(
      "Get my SevaCare requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch your SevaCare requests.",
    });
  }
};

// ==========================================
// GET SINGLE SEVA REQUEST
// GET /api/seva/requests/:id
// ==========================================

const getMySevaRequestById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SevaCare request ID.",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const request =
      await SevaRequest.findOne({
        _id: id,
        patient: req.user._id,
      })
        .populate(
          "patient",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        )
        .populate(
          "reviewedBy",
          "name email role"
        );

    // ==========================================
    // NOT FOUND
    // ==========================================

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "SevaCare request not found.",
      });
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    console.error(
      "Get SevaCare request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch SevaCare request.",
    });
  }
};

// ==========================================
// CANCEL SEVA REQUEST
// PUT /api/seva/requests/:id/cancel
// ==========================================

const cancelSevaRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SevaCare request ID.",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const request =
      await SevaRequest.findOne({
        _id: id,
        patient: req.user._id,
      });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "SevaCare request not found.",
      });
    }

    // ==========================================
    // CHECK CURRENT STATUS
    // ==========================================

    if (request.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message:
          "Completed requests cannot be cancelled.",
      });
    }

    if (request.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message:
          "This request is already cancelled.",
      });
    }

    // ==========================================
    // CANCEL REQUEST
    // ==========================================

    request.status = "CANCELLED";

    await request.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "SevaCare request cancelled successfully.",
      request,
    });
  } catch (error) {
    console.error(
      "Cancel SevaCare request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to cancel SevaCare request.",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createSevaRequest,
  getMySevaRequests,
  getMySevaRequestById,
  cancelSevaRequest,
};