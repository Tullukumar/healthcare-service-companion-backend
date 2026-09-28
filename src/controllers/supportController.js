// ==========================================
// SUPPORT CONTROLLER
// ==========================================

const mongoose = require("mongoose");

const SupportTicket = require("../models/SupportTicket");

// ==========================================
// CREATE SUPPORT TICKET
// POST /api/support/tickets
// ==========================================

const createSupportTicket = async (req, res) => {
  try {
    // ========================================
    // AUTHENTICATED USER
    // ========================================

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    // ========================================
    // REQUEST DATA
    // ========================================

    const {
      hospital,
      category,
      subject,
      description,
      priority,
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Support category is required.",
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Support subject is required.",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Support description is required.",
      });
    }

    // ========================================
    // VALIDATE HOSPITAL
    // ========================================

    if (
      hospital &&
      !mongoose.Types.ObjectId.isValid(hospital)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid hospital ID.",
      });
    }

    // ========================================
    // ATTACHMENT
    // ========================================

    let attachment = {
      url: "",
      publicId: "",
      originalName: "",
      mimeType: "",
      size: 0,
    };

    if (req.file) {
      attachment = {
        // Cloudinary URL if available
        url:
          req.file.path ||
          req.file.secure_url ||
          req.file.url ||
          "",

        // Cloudinary public ID if available
        publicId:
          req.file.filename ||
          req.file.public_id ||
          req.file.publicId ||
          "",

        // Original uploaded filename
        originalName:
          req.file.originalname ||
          req.file.originalName ||
          "",

        // MIME type
        mimeType:
          req.file.mimetype ||
          req.file.mimeType ||
          "",

        // File size in bytes
        size:
          Number(req.file.size) || 0,
      };
    }

    // ========================================
    // CREATE SUPPORT TICKET
    // ========================================

    const ticket = await SupportTicket.create({
      patient: userId,

      hospital: hospital || null,

      category,

      subject: subject.trim(),

      description: description.trim(),

      priority: priority || "MEDIUM",

      status: "OPEN",

      messages: [],

      attachment,
    });

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      ticket,
    });
  } catch (error) {
    // ========================================
    // ERROR
    // ========================================

    console.error(
      "Create support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to create support ticket.",
    });
  }
};

// ==========================================
// GET MY SUPPORT TICKETS
// GET /api/support/tickets/my
// ==========================================

const getMySupportTickets = async (req, res) => {
  try {
    // ========================================
    // AUTHENTICATED USER
    // ========================================

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    // ========================================
    // FIND TICKETS
    // ========================================

    const tickets = await SupportTicket.find({
      patient: userId,
    })
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
      "Get support tickets error:",
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
// GET /api/support/tickets/:id
// ==========================================

const getMySupportTicketById = async (
  req,
  res
) => {
  try {
    // ========================================
    // AUTHENTICATED USER
    // ========================================

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

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

    const ticket = await SupportTicket.findOne({
      _id: id,
      patient: userId,
    })
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
// SEND SUPPORT MESSAGE
// POST /api/support/tickets/:id/messages
// ==========================================

const sendSupportMessage = async (
  req,
  res
) => {
  try {
    // ========================================
    // AUTHENTICATED USER
    // ========================================

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

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
    // FIND PATIENT TICKET
    // ========================================

    const ticket = await SupportTicket.findOne({
      _id: id,
      patient: userId,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // CHECK CLOSED STATUS
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
      sender: userId,
      message: message.trim(),
      sentAt: new Date(),
    });

    // ========================================
    // UPDATE STATUS
    // ========================================

    if (ticket.status === "OPEN") {
      ticket.status = "IN_PROGRESS";
    }

    await ticket.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message: "Support message sent successfully.",
      ticket,
    });
  } catch (error) {
    console.error(
      "Send support message error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to send support message.",
    });
  }
};

// ==========================================
// CLOSE SUPPORT TICKET
// PUT /api/support/tickets/:id/close
// ==========================================

const closeSupportTicket = async (
  req,
  res
) => {
  try {
    // ========================================
    // AUTHENTICATED USER
    // ========================================

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

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

    const ticket = await SupportTicket.findOne({
      _id: id,
      patient: userId,
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found.",
      });
    }

    // ========================================
    // CHECK STATUS
    // ========================================

    if (ticket.status === "CLOSED") {
      return res.status(400).json({
        success: false,
        message: "Support ticket is already closed.",
      });
    }

    // ========================================
    // CLOSE TICKET
    // ========================================

    ticket.status = "CLOSED";

    ticket.closedAt = new Date();

    await ticket.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,
      message: "Support ticket closed successfully.",
      ticket,
    });
  } catch (error) {
    console.error(
      "Close support ticket error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to close support ticket.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createSupportTicket,
  getMySupportTickets,
  getMySupportTicketById,
  sendSupportMessage,
  closeSupportTicket,
};

