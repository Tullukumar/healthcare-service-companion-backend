require("dotenv").config();

const connectDB = require("../config/db");
const DoctorProfile = require("../models/DoctorProfile");

const migrateDoctorHospital = async () => {
  try {
    await connectDB();

    const hospitalId = "6a8efa2964c5df4de9bfcc3d";

    const result = await DoctorProfile.updateMany(
      {
        hospital: "City Care Hospital",
      },
      {
        $set: {
          hospital: hospitalId,
        },
      }
    );

    console.log("Doctor hospital migration completed.");
    console.log("Matched doctors:", result.matchedCount);
    console.log("Updated doctors:", result.modifiedCount);

    process.exit(0);
  } catch (error) {
    console.error(
      "Doctor hospital migration error:",
      error.message
    );

    process.exit(1);
  }
};

migrateDoctorHospital();