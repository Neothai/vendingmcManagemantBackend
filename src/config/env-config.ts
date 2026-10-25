import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

// ฟังก์ชันช่วยดักเช็กว่าลืมใส่ค่าใน .env หรือไม่
const getEnvMeta = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const ENV = {
  APP: {
    HTTP_PORT: Number(process.env.PORT) || 3000,
    HOST: process.env.IP || "0.0.0.0",
    NODE_ENV: process.env.NODE_ENV || "development",
  },
  DB: {
    HOST: getEnvMeta("DB_HOST"),
    PORT: parseInt(getEnvMeta("DB_PORT"), 10),
    USERNAME: getEnvMeta("DB_USERNAME"),
    PASSWORD: getEnvMeta("DB_PASSWORD"),
    DATABASE: getEnvMeta("DB_DATABASE"),
  },
  JWT: {
    SECRET: getEnvMeta("JWT_SECRET"),
    EXPIRES_IN: getEnvMeta("JWT_EXPIRES_IN"),
  },
  RSA: {
    PUBLIC: getEnvMeta("RSA_PUBLIC_KEY"),
    PRIVATE: getEnvMeta("RSA_PRIVATE_KEY")
  },
  WS: {
    PORT: getEnvMeta("WS_PORT"),
    PING_INTERVAL: getEnvMeta("WS_PING_FREQ_MS")
  },
  PAYMENT_GW: {
    MSP: { // ค่าย Moneyspace
      SECRET_ID: getEnvMeta("PAYMENT_GW_MSP_SECRET_ID"),
      SECRET_KEY: getEnvMeta("PAYMENT_GW_MSP_SECRET_KEY")
    }
  }
} as const; // ใช้ as const เพื่อล็อกค่าให้อ่านได้อย่างเดียว (Read-only)
