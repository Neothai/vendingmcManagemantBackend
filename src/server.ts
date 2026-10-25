import Fastify, { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyCookie    from "@fastify/cookie";
import cors             from "@fastify/cors";

import { ENV }           from './config/env-config.js'
import { AppDataSource } from './db/data-source.js';

import userRouterV1 from './routes/v1/user-route.js';
import authRouterV1 from './routes/v1/auth-route.js';
import hqRouterV1   from './routes/v1/headquarter-route.js';
import shopRouterV1 from './routes/v1/shop-route.js';
import machineRouterV1, { websocketMachineRouter as machineWsRouter } from './routes/v1/machine-route.js';
import { API_RES, sendRaw } from './utils/output-response.js';
import { globalErrorHandler } from "./middleware/error.js";
import { MachineTransactionQueue } from "./services/transaction-queue.js";
import { MachineSystemLogQueue } from "./services/system-log-queue.js";
import paymentCallbackRouterV1 from "./routes/v1/payment-hook-route.js";
import fastifyFormbody from "@fastify/formbody";

export const server = Fastify({ 
  logger: true,
  trustProxy: true, // แนะนำเป็น true เพื่อให้อ่าน Client IP ผ่าน Reverse Proxy ถูกต้อง

  // ชั่วคราวสำหรับ alwaysdata server
  rewriteUrl: (req) => {
    if (req.url && req.url.startsWith('/vend')) {
      return req.url.replace(/^\/vend/, '') || '/';
    }
    return req.url || '/';
  }
});

const API_V1_PATH = '/api/v1';

async function bootstrap() {
  try {
    console.log(`Now: ${new Date().toString()}`); 
    await AppDataSource.initialize();
    console.log("Database connected successfully!");

    await server.register(cors, { origin: true, credentials: true });
    await server.register(fastifyCookie);
    await server.register(fastifyWebsocket);
    await server.register(fastifyFormbody);

    server.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // 1. ดัก Bad JSON
      if (error.statusCode === 400 && error.message.includes('JSON')) {
        server.log.warn('[Bad JSON Detected]: ผู้ใช้ยิงโครงสร้าง JSON ผิดพลาดเข้ามา');
        return sendRaw(reply, API_RES.INVALID_BODY.httpCode, API_RES.INVALID_BODY.errCode, 'Invalid JSON Format');
      }

      // 2. ส่งต่อให้ globalErrorHandler จัดการ Error ชนิดอื่นๆ ต่อ
      return globalErrorHandler(error, request, reply);
    });

    await server.register(userRouterV1,    { prefix: API_V1_PATH });
    await server.register(authRouterV1,    { prefix: API_V1_PATH });
    await server.register(hqRouterV1,      { prefix: API_V1_PATH });
    await server.register(shopRouterV1,    { prefix: API_V1_PATH });
    await server.register(machineRouterV1, { prefix: API_V1_PATH });

    await server.register(machineWsRouter, { prefix: `${API_V1_PATH}/ws` });

    await server.register(paymentCallbackRouterV1, { prefix: API_V1_PATH });

    const port = Number(ENV.APP.HTTP_PORT);
    const host = ENV.APP.HOST;

    await server.listen({ port, host });
    console.log(`Server is running on ${host}:${port} in ${ENV.APP.NODE_ENV} mode`);
  } catch (error) {
    console.error('[Bootstrap Critical Error]:', error);
    process.exit(1);
  }
}

bootstrap();

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  
  // 1. ระบายคิวธุรกรรมที่ยังค้างอยู่ใน RAM ลง PostgreSQL ให้หมด
  await MachineTransactionQueue.flush();
  await MachineSystemLogQueue.flush();

  // 2. ปิด Fastify และคืน Connection ของ Database
  await server.close();
  await AppDataSource.destroy();

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ดักจับกรณีมี Exception หลุดนอกบล็อก try-catch
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
  process.exit(1);
});