import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  let statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  let message = error.message || 'Internal server error';

  // Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((item) => item.message)
      .join(', ');
  }

  // Invalid MongoDB ObjectId
  else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${error.path}: ${error.value}`;
  }

  // Duplicate MongoDB unique index
  else if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    statusCode = 409;
    message = 'A record with this value already exists';
  }

  // Hide unexpected internal errors in production
  else if (statusCode === 500) {
    message = process.env.NODE_ENV === 'production' ? 'Internal server error' : message;
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorHandler;
