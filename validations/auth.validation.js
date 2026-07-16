const Joi = require('joi');

const syncUserSchema = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    id: Joi.string().required(),
    user_metadata: Joi.object().optional(),
  }),
};

const enrollFaceSchema = {
  body: Joi.object().keys({
    image: Joi.string().required(),
  }),
};

module.exports = {
  syncUserSchema,
  enrollFaceSchema,
};
