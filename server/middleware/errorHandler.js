const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });
  
  const status = err.status || 500;
  const response = { error: err.message };
  
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  res.status(status).json(response);
};
