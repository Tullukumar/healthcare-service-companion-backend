const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==========================================
// UPLOAD DIRECTORY
// ==========================================

// This creates:
// server/uploads/support/

const uploadDirectory = path.join(
  __dirname,
  "../../uploads/support"
);

// Create folder automatically if it doesn't exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

// ==========================================
// STORAGE
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname
    );

    const uniqueName =
      `support-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

    cb(null, uniqueName);
  },
});

// ==========================================
// ALLOWED FILE TYPES
// ==========================================

const allowedMimeTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",

  // PDF
  "application/pdf",

  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ==========================================
// FILE FILTER
// ==========================================

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, PNG, WEBP, PDF, DOC and DOCX files are allowed."
      ),
      false
    );
  }
};

// ==========================================
// MULTER UPLOAD
// ==========================================

const uploadSupport = multer({
  storage,

  fileFilter,

  limits: {
    // Maximum file size = 5 MB
    fileSize: 5 * 1024 * 1024,
  },
});

// ==========================================
// EXPORT
// ==========================================

module.exports = uploadSupport;