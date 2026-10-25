import fastify, { FastifyPluginAsync } from 'fastify';
import { userGetInfo, userCreateNew, UserCreateBody } from '../../controllers/v1/user-controller.js';
import { checkUserAuth } from '../../middleware/auth.js';
import { DBQueryDataOption } from '../../utils/db-helper.js';

const userRouter: FastifyPluginAsync = async(fastify) => {
  /* ======================== ต้องผ่านการ login ======================== */
  fastify.get<{ Params: { opt: DBQueryDataOption } }>
                ('/users/:opt', { preHandler: checkUserAuth }, userGetInfo); // รับข้อมูลผู้ใช้
  fastify.put   ('/users', { preHandler: checkUserAuth }, async() => {}); // แก้ไขข้อมูลผู้ใช้  field ไหนไม่ส่งมา = ไม่แก้ไข
  fastify.delete('/users', { preHandler: checkUserAuth }, async() => {}); // ลบข้อมูลลผู้ใช้

  /* ======================= ไม่ต้องผ่านการ login ======================= */
  fastify.post<{ Body: UserCreateBody }>
                ('/users', userCreateNew); // เพิ่มข้อมูลผู้ใช้ไหม
};

export default userRouter;