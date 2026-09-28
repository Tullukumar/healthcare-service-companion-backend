const bcrypt = require("bcryptjs");
const Ambulance = require("../models/Ambulance");
const User = require("../models/User");
const Hospital = require("../models/Hospital");

// ==========================================
// GET AVAILABLE AMBULANCES
// GET /api/ambulances/available
// ==========================================

const getAvailableAmbulances = async (req, res) => {
  try {
    const ambulances = await Ambulance.find({
      status: "available",
    })
      .populate(
        "hospital",
        "name city address phone"
      )
      .populate(
        "driver",
        "name email phone role"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ambulances.length,
      ambulances,
    });
  } catch (error) {
    console.error(
      "Get available ambulances error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while fetching ambulances.",
    });
  }
};

// ==========================================
// CREATE AMBULANCE
// POST /api/ambulances
// ==========================================

const createAmbulance = async (req, res) => {
  try {
    // Only admins can register ambulances
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only admins can register ambulances.",
      });
    }

    const {
      vehicleNumber,
      driver,
      driverName,
      driverPhone,
      type,
    } = req.body;

    // ==========================================
    // VALIDATE BASIC INFORMATION
    // ==========================================

    if (
      !vehicleNumber ||
      !driverName ||
      !driverPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Vehicle number, driver name and driver phone are required.",
      });
    }

    // ==========================================
    // VALIDATE DRIVER
    // ==========================================

    let driverUser = null;

    if (driver) {
      driverUser = await User.findById(driver);

      if (!driverUser) {
        return res.status(404).json({
          success: false,
          message: "Driver user not found.",
        });
      }

      if (driverUser.role !== "ambulance") {
        return res.status(400).json({
          success: false,
          message:
            "Selected user is not an ambulance driver.",
        });
      }

      // Prevent assigning the same driver
      // to multiple ambulances
      const existingDriverAmbulance =
        await Ambulance.findOne({
          driver: driverUser._id,
        });

      if (existingDriverAmbulance) {
        return res.status(409).json({
          success: false,
          message:
            "This driver is already assigned to an ambulance.",
        });
      }
    }

    // ==========================================
    // FIND HOSPITAL ASSIGNED TO ADMIN
    // ==========================================

    const hospital = await Hospital.findOne({
      admin: req.user.userId,
      isActive: true,
    });

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message:
          "No active hospital is assigned to this admin.",
      });
    }

    // ==========================================
    // PREVENT DUPLICATE VEHICLE NUMBER
    // ==========================================

    const existingAmbulance =
      await Ambulance.findOne({
        vehicleNumber:
          vehicleNumber.trim().toUpperCase(),
      });

    if (existingAmbulance) {
      return res.status(409).json({
        success: false,
        message:
          "An ambulance with this vehicle number already exists.",
      });
    }

    // ==========================================
    // CREATE AMBULANCE
    // ==========================================

    const ambulance =
      await Ambulance.create({
        vehicleNumber:
          vehicleNumber.trim().toUpperCase(),

        driver:
          driverUser?._id || null,

        driverName:
          driverName.trim(),

        driverPhone:
          driverPhone.trim(),

        hospital:
          hospital._id,

        type:
          type || "basic",

        status:
          "available",

        isOnline:
          false,

        lastLocationUpdate:
          null,
      });

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const populatedAmbulance =
      await Ambulance.findById(
        ambulance._id
      )
        .populate(
          "hospital",
          "name city address phone"
        )
        .populate(
          "driver",
          "name email phone role"
        );

    res.status(201).json({
      success: true,
      message:
        "Ambulance registered successfully.",
      ambulance:
        populatedAmbulance,
    });
  } catch (error) {
    console.error(
      "Create ambulance error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while registering ambulance.",
    });
  }
};

// ==========================================
// CREATE AMBULANCE DRIVER
// POST /api/ambulances/driver
// ==========================================

const createAmbulanceDriver = async (
  req,
  res
) => {
  try {
    // Admin and hospital management can create drivers
    if (
      req.user.role !== "admin" &&
      req.user.role !== "hospital"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin or hospital management can create ambulance drivers.",
      });
    }

    const {
      name,
      email,
      phone,
      password,
      ambulanceId,
    } = req.body;

    // ==========================================
    // VALIDATE REQUIRED FIELDS
    // ==========================================

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !ambulanceId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, phone, password and ambulance are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters.",
      });
    }

    // ==========================================
    // CHECK EXISTING USER
    // ==========================================

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "A user with this email already exists.",
      });
    }

    // ==========================================
    // FIND AMBULANCE
    // ==========================================

    const ambulance =
      await Ambulance.findById(ambulanceId);

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: "Ambulance not found.",
      });
    }

    // ==========================================
    // CHECK DRIVER ASSIGNMENT
    // ==========================================

    if (ambulance.driver) {
      return res.status(409).json({
        success: false,
        message:
          "This ambulance already has a driver assigned.",
      });
    }

    // ==========================================
    // CREATE DRIVER USER
    // ==========================================

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const driver =
      await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "ambulance",
        phone: phone.trim(),
      });

    // ==========================================
    // ASSIGN DRIVER TO AMBULANCE
    // ==========================================

    ambulance.driver = driver._id;
    ambulance.driverName = driver.name;
    ambulance.driverPhone = driver.phone;

    // New driver starts offline
    ambulance.isOnline = false;
    ambulance.status = "offline";
    ambulance.lastLocationUpdate = null;

    await ambulance.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(201).json({
      success: true,
      message:
        "Ambulance driver created and assigned successfully.",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        role: driver.role,
      },
      ambulance: {
        id: ambulance._id,
        vehicleNumber:
          ambulance.vehicleNumber,
        status: ambulance.status,
        isOnline:
          ambulance.isOnline,
      },
    });
  } catch (error) {
    console.error(
      "Create ambulance driver error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while creating ambulance driver.",
    });
  }
};


// ==========================================
// GET DRIVER STATUS
// GET /api/ambulances/driver/status
// ==========================================

const getDriverStatus = async (req, res) => {
  try {
    // Only ambulance drivers can access their status
    if (req.user.role !== "ambulance") {
      return res.status(403).json({
        success: false,
        message:
          "Only ambulance drivers can access driver status.",
      });
    }

    // Find ambulance assigned to this driver
    const ambulance = await Ambulance.findOne({
      driver: req.user.userId,
    }).populate(
      "hospital",
      "name city address phone"
    );

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message:
          "No ambulance is assigned to this driver.",
      });
    }

    return res.status(200).json({
      success: true,
      ambulance: {
        id: ambulance._id,
        vehicleNumber: ambulance.vehicleNumber,
        status: ambulance.status,
        isOnline: ambulance.isOnline,
        lastLocationUpdate:
          ambulance.lastLocationUpdate,
        currentLocation:
          ambulance.currentLocation,
        hospital: ambulance.hospital,
      },
    });
  } catch (error) {
    console.error(
      "Get driver status error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load driver status.",
    });
  }
};




// ==========================================
// UPDATE DRIVER ONLINE STATUS
// PATCH /api/ambulances/driver/online-status
// ==========================================

const updateDriverOnlineStatus = async (
  req,
  res
) => {
  try {
    // Only ambulance drivers can change
    // their own online status
    if (req.user.role !== "ambulance") {
      return res.status(403).json({
        success: false,
        message:
          "Only ambulance drivers can update online status.",
      });
    }

    const { isOnline } = req.body;

    // Validate boolean
    if (typeof isOnline !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "isOnline must be true or false.",
      });
    }

    // Find ambulance assigned to this driver
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

    // ==========================================
    // DRIVER GOING OFFLINE
    // ==========================================

    if (!isOnline) {
      // Don't allow a busy driver to go offline
      if (ambulance.status === "busy") {
        return res.status(400).json({
          success: false,
          message:
            "You cannot go offline while handling an active request.",
        });
      }

      ambulance.isOnline = false;
      ambulance.status = "offline";
      ambulance.lastLocationUpdate =
        new Date();

      await ambulance.save();

      return res.status(200).json({
        success: true,
        message:
          "You are now offline.",
        ambulance: {
          id: ambulance._id,
          vehicleNumber:
            ambulance.vehicleNumber,
          status: ambulance.status,
          isOnline:
            ambulance.isOnline,
          lastLocationUpdate:
            ambulance.lastLocationUpdate,
        },
      });
    }

    // ==========================================
    // DRIVER GOING ONLINE
    // ==========================================

    // A busy driver cannot become available
    if (ambulance.status === "busy") {
      return res.status(400).json({
        success: false,
        message:
          "You cannot go online while your ambulance is busy.",
      });
    }

    ambulance.isOnline = true;
    ambulance.status = "available";
    ambulance.lastLocationUpdate =
      new Date();

    await ambulance.save();

    return res.status(200).json({
      success: true,
      message:
        "You are now online and available for requests.",
      ambulance: {
        id: ambulance._id,
        vehicleNumber:
          ambulance.vehicleNumber,
        status: ambulance.status,
        isOnline:
          ambulance.isOnline,
        lastLocationUpdate:
          ambulance.lastLocationUpdate,
      },
    });
  } catch (error) {
    console.error(
      "Update driver online status error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update online status.",
    });
  }
};

// ==========================================
// UPDATE AMBULANCE STATUS
// PATCH /api/ambulances/:id/status
// ==========================================

const updateAmbulanceStatus = async (
  req,
  res
) => {
  try {
    // Only admins can update ambulance status
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only admins can update ambulance status.",
      });
    }

    const { status } = req.body;

    if (
      ![
        "available",
        "busy",
        "offline",
      ].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid ambulance status.",
      });
    }

    const ambulance =
      await Ambulance.findById(
        req.params.id
      );

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message:
          "Ambulance not found.",
      });
    }

    ambulance.status = status;

    // Keep isOnline consistent with status
    if (status === "offline") {
      ambulance.isOnline = false;
    }

    if (status === "available") {
      ambulance.isOnline = true;
    }

    if (status === "busy") {
      ambulance.isOnline = true;
    }

    await ambulance.save();

    const updatedAmbulance =
      await Ambulance.findById(
        ambulance._id
      )
        .populate(
          "hospital",
          "name city address phone"
        )
        .populate(
          "driver",
          "name email phone role"
        );

    res.status(200).json({
      success: true,
      message:
        "Ambulance status updated successfully.",
      ambulance:
        updatedAmbulance,
    });
  } catch (error) {
    console.error(
      "Update ambulance status error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while updating ambulance status.",
    });
  }
};
// ==========================================
// ASSIGN EXISTING DRIVER TO AMBULANCE
// PATCH /api/ambulances/:id/driver
// ADMIN ONLY
// ==========================================

const assignDriverToAmbulance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can assign ambulance drivers.",
      });
    }

    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required.",
      });
    }

    const driver = await User.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver user not found.",
      });
    }

    if (driver.role !== "ambulance") {
      return res.status(400).json({
        success: false,
        message: "Selected user is not an ambulance driver.",
      });
    }

    const ambulance = await Ambulance.findById(req.params.id);

    if (!ambulance) {
      return res.status(404).json({
        success: false,
        message: "Ambulance not found.",
      });
    }

    // Check whether this driver is already assigned
    const existingAssignment = await Ambulance.findOne({
      driver: driver._id,
      _id: { $ne: ambulance._id },
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message:
          "This driver is already assigned to another ambulance.",
      });
    }

    // Check whether this ambulance has another driver
    if (
      ambulance.driver &&
      ambulance.driver.toString() !== driver._id.toString()
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This ambulance already has another driver assigned.",
      });
    }

    ambulance.driver = driver._id;
    ambulance.driverName = driver.name;
    ambulance.driverPhone = driver.phone;

    // Newly assigned driver starts offline
    ambulance.isOnline = false;
    ambulance.status = "offline";
    ambulance.lastLocationUpdate = null;

    await ambulance.save();

    const updatedAmbulance =
      await Ambulance.findById(ambulance._id)
        .populate(
          "driver",
          "name email phone role"
        )
        .populate(
          "hospital",
          "name city address phone"
        );

    return res.status(200).json({
      success: true,
      message:
        "Driver assigned to ambulance successfully.",
      ambulance: updatedAmbulance,
    });
  } catch (error) {
    console.error(
      "Assign driver error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while assigning driver.",
    });
  }
};

// ==========================================
// GET AMBULANCE DRIVERS
// GET /api/ambulances/drivers
// ADMIN ONLY
// ==========================================

const getAmbulanceDrivers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view ambulance drivers.",
      });
    }

    const drivers = await User.find({
      role: "ambulance",
      isActive: true,
    }).select(
      "name email phone role isActive"
    );

    return res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    console.error(
      "Get ambulance drivers error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching ambulance drivers.",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================
module.exports = {
  getAvailableAmbulances,
  createAmbulance,
  createAmbulanceDriver,
  updateAmbulanceStatus,
  updateDriverOnlineStatus,
  getDriverStatus,
  assignDriverToAmbulance,
  getAmbulanceDrivers,
};
