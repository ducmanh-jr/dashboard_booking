import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
  PORT: Joi.number().port().required(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().default(6379),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  ADMIN_EMAILS: Joi.string().optional(),
  SUPER_ADMIN_EMAILS: Joi.string().optional(),
});
