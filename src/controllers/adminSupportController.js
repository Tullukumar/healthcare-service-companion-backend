
// ==========================================
// IMPORTS
// ==========================================

const mongoose = require("mongoose");

const SupportTicket = require("../models/SupportTicket");

// ==========================================
// GET ALL SUPPORT TICKETS
// GET /api/admin/support/tickets
// ==========================================

const getAllSupportTickets = async (req, res) => {
  try {
    const {
      status,
      category,
      priority,
    } = req.query;

    // ========================================
    // BUILD FILTER
    // ========================================

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (priority) {
      filter.priority = priority;
    }

    // ========================================
    // FETCH TICKETS
    // ========================================

    const tickets = await SupportTicket.find(filter)
      .populate(
        "patient",
        "name email phone"
      )
      .populate(
        "hospital",
        "name city address phone email"
      )
      .populate(
        "assignedTo",
        "name email role"
      )
      .sort({
        createdAt: -1,
      });

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error(
      "Get all support tickets error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch support tickets.",
    });
  }
};

// ==========================================
// GET SINGLE SUPPORT TICKET
// GET /api/admin/support/tickets/:id
// ==========================================

const getSupportTicketById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ========================================
    // VALIDATE ID
    // ========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID.",
      });
    }

    // ========================================
    // FIND TICKET
    // ========================================

    const ticket =
      await SupportTicket.findById(id)
        .populate(
          "patient",
          "name email phone"
        )
        .populate(
          "hospital",
          "name city address phone email"
        )
        .populate(
          "assignedTo",
          "name email role"
        )
        .populate(
          "messages.sender",
          "name email role"
        );

    // ========================================
    // NOT FOUND
    // ========================================

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error(
      "Get support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch support ticket.",
    });
  }
};

// ==========================================
// ASSIGN SUPPORT TICKET
// PUT /api/admin/support/tickets/:id/assign
// ==========================================

const assignSupportTicket = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const { assignedTo } = req.body;

    // ========================================
    // VALIDATE TICKET ID
    // ========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID.",
      });
    }

    // ========================================
    // VALIDATE USER ID
    // ========================================

    if (
      assignedTo &&
      !mongoose.Types.ObjectId.isValid(
        assignedTo
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid support staff ID.",
      });
    }

    // ========================================
    // FIND TICKET
    // ========================================

    const ticket =
      await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // ASSIGN
    // ========================================

    ticket.assignedTo =
      assignedTo || req.user._id;

    if (ticket.status === "OPEN") {
      ticket.status = "IN_PROGRESS";
    }

    await ticket.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message:
        "Support ticket assigned successfully.",
      ticket,
    });
  } catch (error) {
    console.error(
      "Assign support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to assign support ticket.",
    });
  }
};

// ==========================================
// SEND ADMIN SUPPORT MESSAGE
// POST /api/admin/support/tickets/:id/messages
// ==========================================

const sendAdminSupportMessage = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const { message } = req.body;

    // ========================================
    // VALIDATE ID
    // ========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID.",
      });
    }

    // ========================================
    // VALIDATE MESSAGE
    // ========================================

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    // ========================================
    // FIND TICKET
    // ========================================

    const ticket =
      await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // CHECK CLOSED
    // ========================================

    if (ticket.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message:
          "Messages cannot be sent to a closed ticket.",
      });
    }

    // ========================================
    // ADD MESSAGE
    // ========================================

    ticket.messages.push({
      sender: req.user._id,
      message: message.trim(),
      sentAt: new Date(),
    });

    // ========================================
    // UPDATE STATUS
    // ========================================

    if (ticket.status === "OPEN") {
      ticket.status = "IN_PROGRESS";
    }

    // ========================================
    // AUTO ASSIGN
    // ========================================

    if (!ticket.assignedTo) {
      ticket.assignedTo = req.user._id;
    }

    await ticket.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message:
        "Support message sent successfully.",
      ticket,
    });
  } catch (error) {
    console.error(
      "Admin support message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to send support message.",
    });
  }
};

// ==========================================
// RESOLVE SUPPORT TICKET
// PUT /api/admin/support/tickets/:id/resolve
// ==========================================

const resolveSupportTicket = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const { resolutionNote } = req.body;

    // ========================================
    // VALIDATE ID
    // ========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID.",
      });
    }

    // ========================================
    // FIND TICKET
    // ========================================

    const ticket =
      await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // RESOLVE
    // ========================================

    ticket.status = "RESOLVED";

    ticket.resolvedAt = new Date();

    ticket.resolutionNote =
      resolutionNote
        ? resolutionNote.trim()
        : "";

    if (!ticket.assignedTo) {
      ticket.assignedTo = req.user._id;
    }

    await ticket.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message:
        "Support ticket resolved successfully.",
      ticket,
    });
  } catch (error) {
    console.error(
      "Resolve support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to resolve support ticket.",
    });
  }
};

// ==========================================
// CLOSE SUPPORT TICKET
// PUT /api/admin/support/tickets/:id/close
// ==========================================

const closeAdminSupportTicket = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ========================================
    // VALIDATE ID
    // ========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID.",
      });
    }

    // ========================================
    // FIND TICKET
    // ========================================

    const ticket =
      await SupportTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // CLOSE
    // ========================================

    ticket.status = "CLOSED";

    ticket.closedAt = new Date();

    await ticket.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message:
        "Support ticket closed successfully.",
      ticket,
    });
  } catch (error) {
    console.error(
      "Close admin support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to close support ticket.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  getAllSupportTickets,
  getSupportTicketById,
  assignSupportTicket,
  sendAdminSupportMessage,
  resolveSupportTicket,
  closeAdminSupportTicket,
};