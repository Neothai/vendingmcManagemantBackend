import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ENV } from '../config/env-config.js';

export const globalErrorHandler = (error: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'internal system error';

  req.log.error(`[Error Handler]: ${message}`);

  if (ENV.APP.NODE_ENV === 'development') {
    return reply.status(statusCode).send({
      success: false,
      message: message,
      stack: error.stack,
      error: error
    });
  }

  return reply.status(statusCode).send({
    success: false,
    message: statusCode === 500 ? 'internal system error' : message
  });
};