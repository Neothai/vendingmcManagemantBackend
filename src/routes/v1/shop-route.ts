import { FastifyPluginAsync } from 'fastify';

import { checkUserAuth } from '../../middleware/auth.js';
import { shopCreate, ShopCreateBody, shopLists } from '../../controllers/v1/shop-controller.js';

const shopRouter: FastifyPluginAsync = async (fastify) => {
  /* ======================== ต้องผ่านการ login ======================== */
  fastify.get<{ Params: { page: string, itemperpage: string } }>
                ('/shop/lists/:page/:itemperpage', { preHandler: checkUserAuth }, shopLists);  // แสดง list ของทุกร้านค้าที่คนนั้นๆ เป็นเจ้าของอยู่
  fastify.get   ('/shop/:shopid', { preHandler: checkUserAuth }, async () => {});                   // ดึงข้อมูลของร้านค้าดังกล่าวด้วย id ของร้านค้า
  fastify.post<{ Body: ShopCreateBody }>
                ('/shop', { preHandler: checkUserAuth }, shopCreate);                           // สร้างร้านค้าใหม่
  fastify.put   ('/shop/:shopid', { preHandler: checkUserAuth }, async () => {});                   // แก้ไขข้อมูลร้านค้า (field ไหมไม่ส่งมา = ไม่เปลี่ยนแปลง)
  fastify.delete('/shop/:shopid', { preHandler: checkUserAuth }, async () => {});                   // ลบข้อมูลร้านค้าดังกล่าวออกจากระบบด้วย id ของร้านค้า

  fastify.get   ('/shop/partner/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});
  fastify.post  ('/shop/partner/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/shop/partner/:id', { preHandler: checkUserAuth }, async () => {});

  fastify.get   ('/shop/managers/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});
  fastify.post  ('/shop/managers/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/shop/managers/:id', { preHandler: checkUserAuth }, async () => {});

  fastify.get   ('/shop/staffs/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});
  fastify.post  ('/shop/staffs/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/shop/staffs/:id', { preHandler: checkUserAuth }, async () => {});

  fastify.get   ('/shop/members/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});
  fastify.post  ('/shop/members/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/shop/members/:id', { preHandler: checkUserAuth }, async () => {});

  fastify.get   ('/shop/guests/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});
  fastify.post  ('/shop/guests/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/shop/guests/:id', { preHandler: checkUserAuth }, async () => {});

  fastify.get   ('/shop/machines/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});
  fastify.post  ('/shop/machines/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/shop/machines/:id', { preHandler: checkUserAuth }, async () => {});
};

export default shopRouter;