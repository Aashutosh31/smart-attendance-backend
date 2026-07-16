const Joi = require('joi');
const { sendError } = require('../utils/responseHandler');

const validate = (schema) => (req, res, next) => {
  const validSchema = typeof schema === 'function' ? schema(req) : schema;
  const object = {};
  
  if (validSchema.params) object.params = req.params;
  if (validSchema.query) object.query = req.query;
  if (validSchema.body) object.body = req.body;

  const compiledSchema = Joi.object(validSchema);
  const { value, error } = compiledSchema.validate(object, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return sendError(res, 400, 'Validation Error', errors);
  }

  // Update request with validated values (e.g., converted types)
  if (value.params) req.params = value.params;
  if (value.query) req.query = value.query;
  if (value.body) req.body = value.body;

  next();
};

module.exports = validate;
