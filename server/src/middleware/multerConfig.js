const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Strict whitelist of allowed extensions
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf',
  '.doc', '.docx',
  '.txt'
]);

// Strict whitelist of allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

// Blocklist of dangerous extensions even if disguised
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.js', '.mjs', '.cjs',
  '.html', '.htm', '.php', '.phtml', '.py', '.rb', '.svg',
  '.vbs', '.dll', '.jar', '.war', '.scr', '.ps1'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate an unpredictable, cryptographically random filename
    const randomHex = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomHex}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Prevent null-byte injection and path traversal
  if (!file.originalname || file.originalname.indexOf('\0') !== -1) {
    return cb(new Error('Invalid filename'), false);
  }

  const rawExt = path.extname(file.originalname).toLowerCase();

  // Check for dangerous extensions (including double extension spoofing like evil.exe.png)
  const lowerOriginal = file.originalname.toLowerCase();
  for (const dangerousExt of DANGEROUS_EXTENSIONS) {
    if (lowerOriginal.includes(dangerousExt)) {
      return cb(new Error('Executable or dangerous file types are prohibited'), false);
    }
  }

  // Dual-validation: Match both MIME type and allowed extension
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(rawExt)) {
    return cb(new Error('Invalid file type. Allowed: JPG, PNG, GIF, WEBP, PDF, DOC, DOCX, TXT'), false);
  }

  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: fileFilter
});

module.exports = upload;
