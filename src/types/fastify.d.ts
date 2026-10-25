import "fastify"; // จำเป็นต้องมี: เพื่อให้ TS รู้ว่าเป็นการต่อเติม Type เดิม ไม่ใช่เขียนทับทั้งโมดูล
import { JwtUserPayload } from './express.d.ts'

// ขยาย Interface FastifyRequest ของ Fastify
declare module "fastify" {
  interface FastifyRequest {
    jwt?: JwtUserPayload;
  }
}