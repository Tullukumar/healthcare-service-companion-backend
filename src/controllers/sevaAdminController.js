// ==========================================
// SEVA CARE ADMIN CONTROLLER
// ==========================================

const mongoose = require("mongoose");

const SevaRequest = require("../models/SevaRequest");

// ==========================================
// GET ALL SEVA REQUESTS
// GET /api/admin/seva/requests
// ==========================================

const getAllSevaRequests = async (req, res) => {
  try {
    const {
      status,
      requestType,
      urgency,
    } = req.query;

    // ==========================================
    // BUILD FILTER
    // ==========================================

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (requestType) {
      filter.requestType = requestType;
    }

    if (urgency) {
      filter.urgency = urgency;
    }

    // ==========================================
    // GET REQUESTS
    // ==========================================

    const requests = await SevaRequest.find(filter)
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
      )
      .sort({
        createdAt: -1,
      });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error(
      "Get all SevaCare requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch SevaCare requests.",
    });
  }
};

// ==========================================
// GET SINGLE SEVA REQUEST
// GET /api/admin/seva/requests/:id
// ==========================================

const getSevaRequestById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
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
      await SevaRequest.findById(id)
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
// APPROVE SEVA REQUEST
// PUT /api/admin/seva/requests/:id/approve
// ==========================================

const approveSevaRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      adminNotes,
    } = req.body;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
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
      await SevaRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "SevaCare request not found.",
      });
    }

    // ==========================================
    // CHECK STATUS
    // ==========================================

    if (
      request.status === "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled requests cannot be approved.",
      });
    }

    if (
      request.status === "COMPLETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Completed requests cannot be approved again.",
      });
    }

    // ==========================================
    // APPROVE REQUEST
    // ==========================================

    request.status = "APPROVED";

    request.reviewedBy = req.user._id;

    request.reviewedAt = new Date();

    if (
      typeof adminNotes === "string"
    ) {
      request.adminNotes =
        adminNotes.trim();
    }

    request.rejectionReason = "";

    await request.save();

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const updatedRequest =
      await SevaRequest.findById(id)
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
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "SevaCare request approved successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Approve SevaCare request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to approve SevaCare request.",
    });
  }
};

// ==========================================
// REJECT SEVA REQUEST
// PUT /api/admin/seva/requests/:id/reject
// ==========================================

const rejectSevaRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      rejectionReason,
      adminNotes,
    } = req.body;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SevaCare request ID.",
      });
    }

    // ==========================================
    // VALIDATE REJECTION REASON
    // ==========================================

    if (
      !rejectionReason ||
      !rejectionReason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rejection reason is required.",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const request =
      await SevaRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "SevaCare request not found.",
      });
    }

    // ==========================================
    // STATUS CHECK
    // ==========================================

    if (
      request.status === "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled requests cannot be rejected.",
      });
    }

    if (
      request.status === "COMPLETED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Completed requests cannot be rejected.",
      });
    }

    // ==========================================
    // REJECT REQUEST
    // ==========================================

    request.status = "REJECTED";

    request.reviewedBy = req.user._id;

    request.reviewedAt = new Date();

    request.rejectionReason =
      rejectionReason.trim();

    if (
      typeof adminNotes === "string"
    ) {
      request.adminNotes =
        adminNotes.trim();
    }

    await request.save();

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const updatedRequest =
      await SevaRequest.findById(id)
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
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "SevaCare request rejected successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Reject SevaCare request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to reject SevaCare request.",
    });
  }
};

// ==========================================
// UPDATE SEVA REQUEST STATUS
// PUT /api/admin/seva/requests/:id/status
// ==========================================

const updateSevaRequestStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      status,
      adminNotes,
    } = req.body;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SevaCare request ID.",
      });
    }

    // ==========================================
    // VALID STATUSES
    // ==========================================

    const validStatuses = [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ];

    if (
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SevaCare request status.",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const request =
      await SevaRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "SevaCare request not found.",
      });
    }

    // ==========================================
    // UPDATE STATUS
    // ==========================================

    request.status = status;

    request.reviewedBy = req.user._id;

    request.reviewedAt = new Date();

    if (
      typeof adminNotes === "string"
    ) {
      request.adminNotes =
        adminNotes.trim();
    }

    // Clear rejection reason when
    // request is moved away from REJECTED
    if (status !== "REJECTED") {
      request.rejectionReason = "";
    }

    await request.save();

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const updatedRequest =
      await SevaRequest.findById(id)
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
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "SevaCare request status updated successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Update SevaCare status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update SevaCare request status.",
    });
  }
};

// ==========================================
// UPDATE DONATED / RECEIVED AMOUNT
// PUT /api/admin/seva/requests/:id/donation
// ==========================================

const updateSevaDonation = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      receivedAmount,
    } = req.body;

    // ==========================================
    // VALIDATE ID
    // ==========================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid SevaCare request ID.",
      });
    }

    // ==========================================
    // VALIDATE AMOUNT
    // ==========================================

    const amount =
      Number(receivedAmount);

    if (
      Number.isNaN(amount) ||
      amount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Received amount must be a valid positive number.",
      });
    }

    // ==========================================
    // FIND REQUEST
    // ==========================================

    const request =
      await SevaRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "SevaCare request not found.",
      });
    }

    // ==========================================
    // CHECK REQUIRED AMOUNT
    // ==========================================

    if (
      request.requiredAmount > 0 &&
      amount > request.requiredAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Received amount cannot exceed required amount.",
      });
    }

    // ==========================================
    // UPDATE AMOUNT
    // ==========================================

    request.receivedAmount = amount;

    await request.save();

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const updatedRequest =
      await SevaRequest.findById(id)
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
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "SevaCare donation amount updated successfully.",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Update SevaCare donation error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update donation amount.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  getAllSevaRequests,
  getSevaRequestById,
  approveSevaRequest,
  rejectSevaRequest,
  updateSevaRequestStatus,
  updateSevaDonation,
};
