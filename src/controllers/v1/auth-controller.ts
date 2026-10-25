import { FastifyReply, FastifyRequest } from 'fastify';

import { isEmptyString } from '../../utils/input-validation.js';
import { API_RES, sendRes } from '../../utils/output-response.js';
import { queryUserInfo } from './user-controller.js';
import { decryptRSAPassword, verifyPassword } from '../../utils/secure-helper.js';
import { ENV } from '../../config/env-config.js';
import { issueJWTToken, verifyJWTToken } from '../../middleware/auth.js';

export interface UserAuthParams {
  uName: string;
  uPass: string;
};

// ต้องลบสมาชิกตัวนั้นๆ เองทุกเวลาหมดอายุของ jwt ซึ่งตอนนี้ยังไม่ได้ทำ
let userloggedinSession = new Map<string, string>(); // <ownerId, JWT value>

/*
  GET api/v1/auth/session

  Response:
  ถ้า login อยู่แล้ว -> 200
  {
    "code": 0,
    "status": "OK",
    "res": {
        "uid": "<uuidv7-value>"
    }
  }

  ถ้าไม่ได้ login -> 401
  {
    "code": 3,
    "status": "Invalid Auth"
  }
*/
export const userCheckLogin = async(req: FastifyRequest, reply: FastifyReply) => {
/*  const oldToken = req.cookies['tt5UserToken'];
  if(!oldToken) return sendRes(res, API_RES.INVALID_AUTH);

  const jwtDecodeResult = verifyJWTToken(oldToken ,'tt5cpmgrb', 'tt5user');
  if(!jwtDecodeResult.stat) return sendRes(res, API_RES.ACCESS_DENIED);*/

  const userdata = await queryUserInfo({uid: req.jwt?.sub}, false, false, { uid: true });
  if(!userdata) return sendRes(reply, API_RES.NOT_EXISTS);
  return sendRes(reply, API_RES.OK, {uid: userdata.uid});
};

/*
  POST api/v1/auth/session
  BODY (JSON)
  {
    "uName": "username",
    "uPass": "base64 RSA-OAEP SHA-256 with public key (rawpassword)"
  }
  
  public key:
    -----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmoo3iRVnKdwoq0WjXC8P
    VLMFezIMR/Ob0BLuZ1otrAuySM5vRVD3l9RT4tOkGeIOxvT9sy/+GquBQUuzB2J1
    mLzNDU2k+OH58jP0LQKwV6uN5oOVsCeQl+AEn1ER6wMHnombNm6CvzfjIum80bVq
    87O/S+6MJRYVpLi9kSf2w9T0pKBiubskLOw5DB106wTOn3mTXc1xVRsmmlczpu83
    N/RS2iqHFOl9CmmQ2X95pWhqJaYSUrB96Vxuc7g1Ndc33cMgyzvBhgq2IaKwxI9/
    N3ax01hemfKmEOAziMGuQ2pKKgN/P1TFmm200rKivjoHY6ZK4peBhkGp0n+79bQx
    xQIDAQAB
    -----END PUBLIC KEY-----

  Response:
  ถ้า login สำเร็จ -> 200
  {
    "code": 0,
    "status": "OK",
    "res": {
        "uid": "<uuidv7>"
    }
  }

  ถ้า login ไม่สำเร็จเพราะ
    1. รหัสผ่านไม่ถูกต้อง -> 403
    {
      "code": 4,
      "status": "Access Denied"
    }

    2. username ไม่ถูกต้อง
    {
      "code": 5,
      "status": "Not Exists"
    }

    3. JSON parameter ไม่ครบหรือไม่ถูกต้อง
    {
      "code": 1,
      "status": "Invalid Parameter"
    }

  ถ้าพยายาม login ซ้ำ -> 304
*/
export const userLogin = async(req: FastifyRequest<{ Body: {uName: string, uPass: string} }>, reply: FastifyReply) => {
  const { uName, uPass } = req.body;

  if([uName, uPass].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

  const oldToken = req.cookies['tt5UserToken'];
  if(oldToken && verifyJWTToken(oldToken ,'tt5cpmgrb', 'tt5user').stat) return sendRes(reply, API_RES.EXISTS);

  const userdata = await queryUserInfo({userName: uName}, false, false, {
    uid: true, password: true
  });

  if(!userdata) return sendRes(reply, API_RES.NOT_EXISTS);

  const rawPassword = decryptRSAPassword(uPass);
  const passwordIsCorrect = await verifyPassword(rawPassword, userdata.password);
  if(!passwordIsCorrect) return sendRes(reply, API_RES.ACCESS_DENIED);

  const token = issueJWTToken(userdata.uid, 'tt5cpmgrb', 'tt5user');

  reply.cookie('tt5UserToken', token, {
    httpOnly: true,
    secure: ENV.APP.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 2 * 60 * 60 * 1000 // ตั้งอายุคุกกี้ให้หมดอายุพร้อมตั๋ว (2 ชั่วโมง แปลงเป็น มิลลิวินาที)
  });

  userloggedinSession.set(userdata.uid, token);

  return sendRes(reply, API_RES.OK, {uid: userdata.uid});
};

/*
  DELETE api/v1/auth/session

  Response:
  ถ้าสำเร็จ -> 200
  {
    "code": 0,
    "status": "OK"
  }

  ถ้า logout อยู่แล้ว -> 404
  {
    "code": 5,
    "status": "Not Exists"
  }
*/
export const userLogout = async(req: FastifyRequest, reply: FastifyReply) => {
  const oldToken = req.cookies['tt5UserToken'];
  if(!oldToken) return sendRes(reply, API_RES.OK);

  const res = verifyJWTToken(oldToken ,'tt5cpmgrb', 'tt5user');
  if(!res) return sendRes(reply, API_RES.OK);

  reply.clearCookie('tt5UserToken', { 
    httpOnly: true, 
    secure: ENV.APP.NODE_ENV === 'production',
    path: '/'
  });

  if(userloggedinSession.has(res.data.uid)) userloggedinSession.delete(res.data.uid);

  return sendRes(reply, API_RES.OK);
};