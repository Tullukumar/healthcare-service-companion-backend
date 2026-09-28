require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const email = "admin@medicare.com";
    const password = "Admin@123";

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        name: "Healthcare Admin",
        email,
        password: hashedPassword,
        role: "admin",
        phone: "9999999999",
      },
      {
        new: true,
        upsert: true,
      }
    );

    console.log("Admin account ready");
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exit(1);
  }
};

createAdmin();