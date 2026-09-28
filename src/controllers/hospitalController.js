const Hospital = require("../models/Hospital");

// ==========================================
// GET ALL ACTIVE HOSPITALS
// GET /api/hospitals
// ==========================================
const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find({
      isActive: true,
    })
      .select("name city address phone email")
      .sort({
        name: 1,
      });

    res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals,
    });
  } catch (error) {
    console.error(
      "Get hospitals error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error while fetching hospitals",
    });
  }
};

// ==========================================
// GET HOSPITAL BY ID
// GET /api/hospitals/:id
// ==========================================
const getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      isActive: true,
    }).select("name city address phone email");

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found.",
      });
    }

    res.status(200).json({
      success: true,
      hospital,
    });
  } catch (error) {
    console.error(
      "Get hospital by ID error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error while fetching hospital.",
    });
  }
};


module.exports = {
  getHospitals,
  getHospitalById,
};