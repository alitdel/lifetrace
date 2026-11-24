/**
 * Centralized Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  console.error('[Unhandled Server Error]', err);

  // Multer error handling
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'The uploaded file exceeds the permitted size limit (25MB).'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  // Security / validation / custom errors
  const statusCode = err.statusCode || (err.message && err.message.includes('Security') ? 403 : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal server error occurred. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

module.exports = errorHandler;

