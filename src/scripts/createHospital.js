require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const User = require("../models/User");
const Hospital = require("../models/Hospital");

const createHospital = async () => {
  try {
    await connectDB();

    // Find an existing admin
    const admin = await User.findOne({
      email: "admin@medicare.com",
      role: "admin",
    });

    if (!admin) {
      console.log(
        "Admin not found. Please create the admin first."
      );
      process.exit(1);
    }

    // Check if hospital already exists
    const existingHospital = await Hospital.findOne({
      name: "City Care Hospital",
      city: "Noida",
    });

    if (existingHospital) {
      console.log("Hospital already exists.");
      console.log("Hospital ID:", existingHospital._id);
      console.log("Admin:", admin.email);

      process.exit(0);
    }

    // Create hospital
    const hospital = await Hospital.create({
      name: "City Care Hospital",
      city: "Noida",
      address: "Noida, Uttar Pradesh",
      phone: "",
      email: "",
      admin: admin._id,
      isActive: true,
    });

    console.log("Hospital created successfully!");
    console.log("Hospital:", hospital.name);
    console.log("City:", hospital.city);
    console.log("Hospital ID:", hospital._id);
    console.log("Admin:", admin.email);

    process.exit(0);
  } catch (error) {
    console.error(
      "Hospital creation error:",
      error.message
    );

    process.exit(1);
  }
};

createHospital();