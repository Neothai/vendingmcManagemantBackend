export interface JwtUserPayload {
  sub: string;
  iss: string; // -> ระบบผู้สร้างตั๋ว
  aud: string; // -> กลุ่มผู้รับตั๋วไปใช้งาน  
}

// ขยาย Interface Request เดิมของ Express
declare global {
  namespace Express {
    interface Request {
      jwt?: JwtUserPayload;
    }
  }
}