const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = {
  media: path.resolve(__dirname, '../uploads/media'),
  avatars: path.resolve(__dirname, '../uploads/avatars'),
  submissions: path.resolve(__dirname, '../uploads/submissions')
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Dangerous extensions blacklist
const EXECUTABLE_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.php3',
  '.js', '.vbs', '.msi', '.jar', '.py', '.pl', '.cgi', '.ps1', '.dll', '.com'
];

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime',
  // Documents / Evidence
  'application/pdf'
];

/**
 * Configure Multer Storage Engine
 */
function createStorage(folderKey = 'media') {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = uploadDirs[folderKey] || uploadDirs.media;
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      // Sanitize filename to prevent directory traversal
      const safeRandom = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${folderKey}-${safeRandom}${ext}`);
    }
  });
}

/**
 * File filter to ensure security
 */
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Check blacklist
  if (EXECUTABLE_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Security Alert: Executable file upload rejected (${ext}).`), false);
  }

  // 2. Check whitelist
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, GIF, MP4, WEBM, PDF.`), false);
  }

  cb(null, true);
}

// Media upload (Images, Videos, PDFs) - up to 25MB
const uploadMedia = multer({
  storage: createStorage('media'),
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Avatar upload (Images only) - up to 5MB
const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WEBP image formats are allowed for profile pictures.'), false);
    }
    fileFilter(req, file, cb);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Practical submission upload (Photos/PDFs) - up to 20MB
const uploadSubmission = multer({
  storage: createStorage('submissions'),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

module.exports = {
  uploadMedia,
  uploadAvatar,
  uploadSubmission,
  uploadDirs
};

