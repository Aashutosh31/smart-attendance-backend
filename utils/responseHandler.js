const sendSuccess = (res, statusCode = 200, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, statusCode = 500, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
