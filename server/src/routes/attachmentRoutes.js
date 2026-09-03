const express = require('express');
const router = express.Router({ mergeParams: true });
const { uploadAttachment, getAttachments, downloadAttachment, deleteAttachment } = require('../controllers/attachmentController');
const upload = require('../middleware/multerConfig');

// Mounted at /api/boards/:boardId/tasks/:taskId/attachments
// Protected by authorizeBoard in taskRoutes

// Error handler for multer
const multerErrorHandler = (err, req, res, next) => {
  if (err.message === 'Invalid file type') {
    return res.status(400).json({ success: false, error: { message: 'Invalid file type' } });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: { message: 'File is too large (max 5MB)' } });
  }
  next(err);
};

router.get('/', getAttachments);
router.post('/', (req, res, next) => {
  // Apply the upload rate limiter from the app instance
  const limiter = req.app.get('uploadLimiter');
  if (limiter) return limiter(req, res, () => upload.single('file')(req, res, (err) => {
    if (err) return multerErrorHandler(err, req, res, next);
    next();
  }));
  upload.single('file')(req, res, (err) => {
    if (err) return multerErrorHandler(err, req, res, next);
    next();
  });
}, uploadAttachment);
router.get('/:attachmentId', downloadAttachment);
router.delete('/:attachmentId', deleteAttachment);

module.exports = router;
