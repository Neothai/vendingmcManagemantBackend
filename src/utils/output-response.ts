import { FastifyReply } from "fastify";

export const API_RES = {
  OK:                { httpCode: 200, errCode: 0, message: "OK" },
  INVALID_PARAM:     { httpCode: 400, errCode: 1, message: "Invalid Parameter" },
  INVALID_BODY:      { httpCode: 400, errCode: 2, message: "Invalid Body" },
  INVALID_REQ:       { httpCode: 400, errCode: 3, message: "Invalid Request for this endpoint" },
  INVALID_AUTH:      { httpCode: 401, errCode: 4, message: "Invalid Auth" },
  ACCESS_DENIED:     { httpCode: 403, errCode: 5, message: "Access Denied" },
  NOT_EXISTS:        { httpCode: 404, errCode: 6, message: "Not Exists" },
  EXISTS:            { httpCode: 304, errCode: 7, message: "Exists" },
  LIMIT_EXCEEDED:    { httpCode: 429, errCode: 8, message: "Limit Exceeded" },
  TOO_MANY_REQUESTS: { httpCode: 429, errCode: 9, message: "Too Many Requests" },
  SERVER_ERROR:      { httpCode: 500, errCode: 10, message: "Server Error" },
  UNKNOWN:           { httpCode: 500, errCode: 11, message: "Unknown" },
} as const;

type APIResponseDetail = typeof API_RES[keyof typeof API_RES];

export const sendOk = (reply: FastifyReply, resp?: Record<string, any>): FastifyReply => {
  return reply.code(API_RES.OK.httpCode).send({ code: API_RES.OK.errCode, status: API_RES.OK.message, res: resp });
};

export const sendRes = (reply: FastifyReply, resType: APIResponseDetail, resp?: Record<string, any>): FastifyReply => {
  return reply.code(resType.httpCode).send({ code: resType.errCode, status: resType.message, res: resp });
};

export const sendRaw = (reply: FastifyReply, httpCode: number, code: number, msg: string, resp?: Record<string, any>): FastifyReply => {
  return reply.code(httpCode).send({ code: code, status: msg, res: resp });
};