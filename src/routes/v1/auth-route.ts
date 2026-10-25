import { FastifyPluginAsync } from 'fastify';

import { userCheckLogin, userLogin, userLogout } from '../../controllers/v1/auth-controller.js';
import { checkUserAuth } from '../../middleware/auth.js';

const authRouter: FastifyPluginAsync = async (fastify) => {
  /* ======================== ต้องผ่านการ login ======================== */
  fastify.get   ('/auth/session', { preHandler: checkUserAuth }, userCheckLogin);
  fastify.delete('/auth/session', { preHandler: checkUserAuth }, userLogout);

  /* ======================= ไม่ต้องผ่านการ login ======================= */
  fastify.post  ('/auth/session', userLogin);
};

export default authRouter;