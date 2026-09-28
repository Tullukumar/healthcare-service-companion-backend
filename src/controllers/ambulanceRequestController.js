const AmbulanceRequest = require("../models/AmbulanceRequest");
const Ambulance = require("../models/Ambulance");
const { getIO } = require("../utils/socket");

// ==========================================
// ACTIVE AMBULANCE REQUEST STATUSES
// ==========================================

const ACTIVE_REQUEST_STATUSES = [
  "accepted",
  "on-the-way",
  "arrived",
];

// ==========================================
// PATIENT REQUESTS AN AMBULANCE
// POST /api/ambulance-requests
// ==========================================

const createAmbulanceRequest = async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        success: false,
        message: "Only patients can request an ambulance.",
      });
    }

    const {
      pickupAddress,
      pickupLocation,
      emergencyType,
      notes,
    } = req.body;

    if (
      !pickupLocation ||
      typeof pickupLocation.latitude !== "number" ||
      typeof pickupLocation.longitude !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup location is required.",
      });
    }

    const ambulanceRequest = await AmbulanceRequest.create({
      patient: req.user.userId,
      ambulance: null,

      pickupAddress:
        pickupAddress?.trim() || "GPS Location",

      pickupLocation: {
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
      },

      emergencyType:
        emergencyType?.trim() || "Medical Emergency",

      notes: notes?.trim() || "",

      status: "requested",
    });

    const populatedRequest =
      await AmbulanceRequest.findById(
        ambulanceRequest._id
      ).populate(
        "patient",
        "name phone email"
      );

    // Notify online available ambulance drivers
    try {
      const io = getIO();

      const onlineAmbulances =
        await Ambulance.find({
          driver: { $ne: null },
          isOnline: true,
          status: "available",
        }).select("driver");

      onlineAmbulances.forEach((ambulance) => {
        if (!ambulance.driver) return;

        io.to(
          `driver:${ambulance.driver.toString()}`
        ).emit(
          "ambulance:new-request",
          populatedRequest
        );
      });
    } catch (socketError) {
      console.error(
        "Socket new request notification error:",
        socketError.message
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Ambulance request created successfully. Waiting for driver acceptance.",
      request: populatedRequest,
    });
  } catch (error) {
    console.error(
      "Create ambulance request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while requesting ambulance.",
      error: error.message,
    });
  }
};

// ==========================================
// GET ACTIVE REQUEST
// GET /api/ambulance-requests/active
//
// PATIENT:
// Gets their own active ambulance request.
//
// AMBULANCE:
// Gets the active request assigned to their ambulance.
// ==========================================

const getActiveAmbulanceRequest = async (req, res) => {
  try {
    // ------------------------------------------
    // PATIENT
    // ------------------------------------------

    if (req.user.role === "patient") {
      const request =
        await AmbulanceRequest.findOne({
          patient: req.user.userId,

          status: {
            $in: [
              "requested",
              ...ACTIVE_REQUEST_STATUSES,
            ],
          },
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "patient",
            "name phone email"
          )
          .populate(
            "ambulance",
            "vehicleNumber driver driverName driverPhone type status currentLocation"
          );

      return res.status(200).json({
        success: true,
        hasActiveRequest: !!request,
        request: request || null,
      });
    }

    // ------------------------------------------
    // AMBULANCE DRIVER
    // ------------------------------------------

    if (req.user.role === "ambulance") {
      const ambulance =
        await Ambulance.findOne({
          driver: req.user.userId,
        });

      if (!ambulance) {
        return res.status(404).json({
          success: false,
          message:
            "No ambulance is assigned to this driver.",
        });
      }

      const request =
        await AmbulanceRequest.findOne({
          ambulance: ambulance._id,

          status: {
            $in: ACTIVE_REQUEST_STATUSES,
          },
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "patient",
            "name phone email"
          )
          .populate(
            "ambulance",
            "vehicleNumber driver driverName driverPhone type status currentLocation"
          );

      return res.status(200).json({
        success: true,
        hasActiveRequest: !!request,
        request: request || null,
      });
    }

    // ------------------------------------------
    // OTHER ROLES
    // ------------------------------------------

    return res.status(403).json({
      success: false,
      message:
        "You are not authorized to view ambulance requests.",
    });
  } catch (error) {
    console.error(
      "Get active ambulance request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching active ambulance request.",
      error: error.message,
    });
  }
};

// ==========================================
// DRIVER GETS PENDING REQUESTS
// GET /api/ambulance-requests/pending
// ==========================================

const getPendingAmbulanceRequests = async (
  req,
  res
) => {
  try {
    if (req.user.role !== "ambulance") {
      return res.status(403).json({
        success: false,
        message:
          "Only ambulance drivers can view pending requests.",
      });
    }

    const requests =
      await AmbulanceRequest.find({
        status: "requested",
        ambulance: null,
      })
        .populate(
          "patient",
          "name email phone"
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
      "Get pending ambulance requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching pending ambulance requests.",
      error: error.message,
    });
  }
};

// ==========================================
// DRIVER ACCEPTS REQUEST
// PATCH /api/ambulance-requests/:id/accept
// ==========================================

const acceptAmbulanceRequest = async (
  req,
  res
) => {
  try {
    if (req.user.role !== "ambulance") {
      return res.status(403).json({
        success: false,
        message:
          "Only ambulance drivers can accept requests.",
      });
    }

    const ambulance =
      await Ambulance.findOne({
        driver: req.user.userId,
      });

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message:
          "No ambulance is assigned to this driver.",
      });
    }

    let ambulanceStatus = String(
      ambulance.status || ""
    )
      .trim()
      .toLowerCase();

    // ------------------------------------------
    // RECOVER STALE BUSY STATUS
    // ------------------------------------------

    if (ambulanceStatus === "busy") {
      const activeRequest =
        await AmbulanceRequest.findOne({
          ambulance: ambulance._id,
          status: {
            $in: ACTIVE_REQUEST_STATUSES,
          },
        });

      if (activeRequest) {
        return res.status(400).json({
          success: false,
          message:
            "Your ambulance is currently busy with an active request. Please complete that request first.",
        });
      }

      ambulance.status = "available";
      ambulance.isOnline = true;
      ambulance.lastLocationUpdate = new Date();

      await ambulance.save();

      ambulanceStatus = "available";
    }

    // ------------------------------------------
    // CHECK AVAILABILITY
    // ------------------------------------------

    if (ambulanceStatus !== "available") {
      return res.status(400).json({
        success: false,
        message:
          `Your ambulance is currently "${ambulanceStatus}". Please make sure it is available before accepting a request.`,
      });
    }

    // ------------------------------------------
    // FIND REQUEST
    // ------------------------------------------

    const ambulanceRequest =
      await AmbulanceRequest.findOne({
        _id: req.params.id,
        status: "requested",
        ambulance: null,
      });

    if (!ambulanceRequest) {
      return res.status(404).json({
        success: false,
        message:
          "This ambulance request is no longer available.",
      });
    }

    // ------------------------------------------
    // ASSIGN AMBULANCE
    // ------------------------------------------

    ambulanceRequest.ambulance =
      ambulance._id;

    ambulanceRequest.status =
      "accepted";

    await ambulanceRequest.save();

    // ------------------------------------------
    // MARK AMBULANCE BUSY
    // ------------------------------------------

    ambulance.status = "busy";
    ambulance.isOnline = true;
    ambulance.lastLocationUpdate = new Date();

    await ambulance.save();

    // ------------------------------------------
    // POPULATE REQUEST
    // ------------------------------------------

    const populatedRequest =
      await AmbulanceRequest.findById(
        ambulanceRequest._id
      )
        .populate(
          "patient",
          "name phone email"
        )
        .populate(
          "ambulance",
          "vehicleNumber driver driverName driverPhone type status currentLocation"
        );

    // ------------------------------------------
    // NOTIFY PATIENT
    // ------------------------------------------

    try {
      const io = getIO();

      io.to(
        `patient:${ambulanceRequest.patient.toString()}`
      ).emit(
        "ambulance:request-accepted",
        populatedRequest
      );
    } catch (socketError) {
      console.error(
        "Socket acceptance notification error:",
        socketError.message
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Ambulance request accepted successfully.",
      request: populatedRequest,
    });
  } catch (error) {
    console.error(
      "Accept ambulance request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while accepting ambulance request.",
      error: error.message,
    });
  }
};

// ==========================================
// DRIVER UPDATES REQUEST STATUS
// PATCH /api/ambulance-requests/:id/status
// ==========================================

const updateAmbulanceRequestStatus = async (
  req,
  res
) => {
  try {
    if (req.user.role !== "ambulance") {
      return res.status(403).json({
        success: false,
        message:
          "Only ambulance drivers can update request status.",
      });
    }

    const { status } = req.body;

    const allowedStatuses = [
      "on-the-way",
      "arrived",
      "completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid ambulance request status.",
      });
    }

    const ambulanceRequest =
      await AmbulanceRequest.findById(
        req.params.id
      );

    if (!ambulanceRequest) {
      return res.status(404).json({
        success: false,
        message:
          "Ambulance request not found.",
      });
    }

    if (!ambulanceRequest.ambulance) {
      return res.status(400).json({
        success: false,
        message:
          "No ambulance is assigned to this request.",
      });
    }

    // ------------------------------------------
    // VERIFY DRIVER OWNS THIS AMBULANCE
    // ------------------------------------------

    const ambulance =
      await Ambulance.findOne({
        _id: ambulanceRequest.ambulance,
        driver: req.user.userId,
      });

    if (!ambulance) {
      return res.status(403).json({
        success: false,
        message:
          "This ambulance request is not assigned to you.",
      });
    }

    if (ambulanceRequest.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "This ambulance request has already been completed.",
      });
    }

    // ------------------------------------------
    // UPDATE STATUS
    // ------------------------------------------

    ambulanceRequest.status = status;

    await ambulanceRequest.save();

    // ------------------------------------------
    // COMPLETED → AMBULANCE AVAILABLE
    // ------------------------------------------

    if (status === "completed") {
      ambulance.status = "available";
      ambulance.isOnline = true;
      ambulance.lastLocationUpdate = new Date();

      await ambulance.save();
    }

    // ------------------------------------------
    // GET UPDATED REQUEST
    // ------------------------------------------

    const updatedRequest =
      await AmbulanceRequest.findById(
        ambulanceRequest._id
      )
        .populate(
          "patient",
          "name phone email"
        )
        .populate(
          "ambulance",
          "vehicleNumber driver driverName driverPhone type status currentLocation"
        );

    // ------------------------------------------
    // NOTIFY PATIENT
    // ------------------------------------------

    try {
      const io = getIO();

      io.to(
        `patient:${ambulanceRequest.patient.toString()}`
      ).emit(
        "ambulance:request-status",
        updatedRequest
      );
    } catch (socketError) {
      console.error(
        "Socket status notification error:",
        socketError.message
      );
    }

    return res.status(200).json({
      success: true,
      message:
        `Ambulance request status updated to ${status}.`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Update ambulance request status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating ambulance request status.",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  createAmbulanceRequest,
  getPendingAmbulanceRequests,
  getActiveAmbulanceRequest,
  acceptAmbulanceRequest,
  updateAmbulanceRequestStatus,
};