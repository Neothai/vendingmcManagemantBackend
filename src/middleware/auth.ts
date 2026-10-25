import jwt from 'jsonwebtoken'

import { API_RES, sendRaw, sendRes } from '../utils/output-response.js';
import { ENV } from '../config/env-config.js';
import { JwtUserPayload } from '../types/express.js';
import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyMachine, verifyMachineSecretKey } from '../controllers/v1/machine-controller.js';
import { isEmptyString } from '../utils/input-validation.js';

export interface machineMiddlewareParams {
  machineId: string;
};

export const issueJWTToken = (uid: string, iss: string, aud: string) => {
  const payload: JwtUserPayload = {
    sub: uid,
    iss: iss, // -> ระบบผู้สร้างตั๋ว
    aud: aud  // -> กลุ่มผู้รับตั๋วไปใช้งาน                     
  };

  return jwt.sign(payload, ENV.JWT.SECRET, { expiresIn: ENV.JWT.EXPIRES_IN as any });
};

export const verifyJWTToken = (token: string, iss: string, aud: string) => {
  let stat: boolean = false;
  let data: jwt.JwtPayload = {};
  try {
    data = jwt.verify(token, ENV.JWT.SECRET, { issuer: iss, audience: aud }) as jwt.JwtPayload;
    stat = true;
  } catch (error) {
    stat = false;
  }

  return {stat: stat, data: data};
};

// 1. Hook ตรวจสอบสิทธิ์ผู้ใช้ทั่วไป (ใช้แทน checkUserAuth ของ Express)
export const checkUserAuth = async (req: FastifyRequest, reply: FastifyReply) => {
  const token = req.cookies['tt5UserToken'];
  if (!token) return sendRes(reply, API_RES.INVALID_AUTH);

  const jwtDecodeResult = verifyJWTToken(token, 'tt5cpmgrb', 'tt5user');
  if (!jwtDecodeResult.stat) return sendRes(reply, API_RES.ACCESS_DENIED);

  req.jwt = jwtDecodeResult.data as JwtUserPayload;
};

// 2. Hook ตรวจสอบสิทธิ์ระดับเครื่อง รองรับทั้งแบบ jwt และเป็น secret key
export const checkMachineUserAuth = async (
  req: FastifyRequest<{ Params: machineMiddlewareParams }>,
  reply: FastifyReply
) => {
  const token = req.cookies['tt5UserToken'];
  let jwtPass = false;

  const { machineId } = req.params as machineMiddlewareParams;
  if (isEmptyString(machineId)) return sendRaw(reply, API_RES.INVALID_PARAM.httpCode, API_RES.INVALID_PARAM.errCode, 'Requires: id');

  // ถ้าผู้ใช้ส่ง jwt มา ก็เช็คตัวนี้ก่อน ถ้าผ่านก็ไปต่อ ไม่ต้องเช็ค secret key
  if (token){
    const jwtDecodeResult = verifyJWTToken(token, 'tt5cpmgrb', 'tt5user');
    if (!jwtDecodeResult.stat) return sendRes(reply, API_RES.ACCESS_DENIED);

    req.jwt = jwtDecodeResult.data as JwtUserPayload;
    jwtPass = true;

    console.log('Machine login by JWT');

    if (!verifyMachine(machineId, req.jwt?.sub)) return sendRes(reply, API_RES.ACCESS_DENIED);
  }

  if(!jwtPass){
    const secretKey: string = String(req.headers["x-app-key"] || '');
    if(isEmptyString(secretKey)) return sendRaw(reply, API_RES.INVALID_AUTH.httpCode, API_RES.INVALID_AUTH.errCode, 'Secret key request!');

    console.log(`Input key = ${secretKey}`);

    // แต่ถ้าส่ง secret key มาแทน ก็เช็คตัวนี้ ถ้าผ่านก็ไปต่อ
    // ต้องส่งมาผ่าน header x-app-key เท่านั้น
    if(!await verifyMachineSecretKey(machineId, secretKey)) return sendRaw(reply, API_RES.ACCESS_DENIED.httpCode, API_RES.ACCESS_DENIED.errCode, 'Invalid secret key.'); 
    console.log('Machine login by secret key');
  }
};