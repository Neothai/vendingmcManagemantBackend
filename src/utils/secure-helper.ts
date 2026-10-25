import { ENV } from '../config/env-config.js';

import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const decryptRSAPassword = (input: string): string => {
  const buffer = Buffer.from(input, 'base64');
  const decrypted = crypto.privateDecrypt({
      key: ENV.RSA.PRIVATE,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, // แนะนำ OAEP ปลอดภัยกว่า PKCS1 ธรรมดา
      oaepHash: 'sha256',
    },
    buffer
  );
  return decrypted.toString('utf8');
};

export const hashPassword = async(input: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(input, saltRounds);
};

export const verifyPassword = async(input: string, hashedPass: string): Promise<boolean> => {
  return await bcrypt.compare(input, hashedPass);
};