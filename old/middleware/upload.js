const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../public/uploads');
const avatarDir = path.join(__dirname, '../public/uploads/avatars');
const productDir = path.join(__dirname, '../public/uploads/products');

[uploadDir, avatarDir, productDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter — only allow images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype);

  if (extOk && mimeOk) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WEBP, GIF) are allowed.'));
  }
};

// ---------- Product Image Storage ----------
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

// ---------- Avatar Storage ----------
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.session && req.session.user ? req.session.user.id : 'guest';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
  }
});

// ---------- General Upload Storage (legacy fallback) ----------
const generalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

// Product upload: up to 5 images, 5MB each
const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: imageFilter
});

// Avatar upload: single image, 3MB
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter
});

// General single upload (legacy compatibility)
const upload = multer({
  storage: generalStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'File too large. Maximum file size is 5MB.');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      req.flash('error', 'Too many files. Maximum 5 images allowed.');
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      req.flash('error', 'Unexpected file field. Please use the correct upload form.');
    } else {
      req.flash('error', `Upload error: ${err.message}`);
    }
    return res.redirect('back');
  } else if (err) {
    req.flash('error', err.message || 'File upload failed.');
    return res.redirect('back');
  }
  next();
};

// Helper: delete an uploaded file (for cleanup)
const deleteUploadedFile = (filePath) => {
  const fullPath = path.join(__dirname, '../public', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

module.exports = upload; // default export for backward compat
module.exports.upload = upload;
module.exports.productUpload = productUpload;
module.exports.avatarUpload = avatarUpload;
module.exports.handleUploadError = handleUploadError;
module.exports.deleteUploadedFile = deleteUploadedFile;
