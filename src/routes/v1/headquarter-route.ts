import { FastifyPluginAsync } from 'fastify';

import { checkUserAuth } from '../../middleware/auth.js';
import { headquarterCreate, HeadquarterCreateBody, headquarterGetInfo, headquarterLists } from '../../controllers/v1/headquarter-controller.js';

const hqRouter: FastifyPluginAsync = async (fastify) => {
  /* ======================== ต้องผ่านการ login ======================== */
  fastify.get<{ Params: { page: number, itemperpage: number } }>
                ('/hq/lists/:page/:itemperpage', { preHandler: checkUserAuth }, headquarterLists);          // แสดง list ของสำนักงานใหญ่ที่ user คนนั้นๆ เป็นเจ้าของ
  fastify.get<{ Params: { hqid: string } }>
                ('/hq/:hqid', { preHandler: checkUserAuth }, headquarterGetInfo);                             // แสดงรายละเอียดของสำนักงานใหญ่ โดยค้นจาก id
  fastify.post<{ Body: HeadquarterCreateBody }>
                ('/hq', { preHandler: checkUserAuth }, headquarterCreate);                                   // ลงทะเบียนสำนักงานใหญ่ในนามของ user คนนั้นๆ
  //router.put   ('/hq', checkUserAuth);                                 // แก้ไขข้อมูลสำนักงานใหญ่ในนามของ user คนนั้นๆ (param ไหนไม่ส่งมา = ไม่เปลี่ยนแปลง) (name, owner, contact, address, note)
  fastify.delete('/hq/:hqid', { preHandler: checkUserAuth }, async () => {});                             // ลบข้อมูลของสำนักงานใหญ่ โดยอ้างอิงจาก id ออกจากระบบ

  fastify.get   ('/hq/shop/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});     // แสดง list ของร้านค้าย่อยของสำนักงานใหญ่ที่ user คนนั้นๆ เป็นเจ้าของ
  //ย้ายไป shop-route.ts router.get   ('/hq/shop/:shopid');                      // แสดงรายละเอียดของร้านค้าย่อยของสำนักงานใหญ่ โดยค้นจาก id
  fastify.post  ('/hq/shop/:shopid', { preHandler: checkUserAuth }, async () => {});                      // เพิ่มร้านค้าย่อยร้านใหม่เข้าสู่สำนักงานใหญ่ (ต้องสร้าง shop มาก่อน แล้วเอา id มาป้อน)
  fastify.delete('/hq/shop/:shopid', { preHandler: checkUserAuth }, async () => {});                      // เอาร้านค้าย่อยดังกล่าวออกจากสำนักงานใหญ่นี้ ไม่ใช่การลบข้อมูลร้านค้าออกจากระบบ

  fastify.get   ('/hq/partners/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {}); // แสดง list ของหุ้นส่วนของสำนักงานใหญ่ที่ user คนนั้นๆ เป็นเจ้าของ
  fastify.post  ('/hq/partners/:id', { preHandler: checkUserAuth }, async () => {});                      // เพิ่มหุ้นส่วนคนใหม่เข้าสู่สำนักงานใหญ่ (ต้องสร้าง user มาก่อน แล้วเอา uid มาป้อน)
  fastify.delete('/hq/partners/:id', { preHandler: checkUserAuth }, async () => {});                      // เอาหุ้นส่วนคนนี้ออกจากสำนักงานใหญ่นี้ ไม่ใช่การลบข้อมูลหุ้นส่วนออกจากระบบ

  fastify.get   ('/hq/managers/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {}); // แสดง list ของผู้จัดการของสำนักงานใหญ่ที่ user คนนั้นๆ เป็นเจ้าของ
  fastify.post  ('/hq/managers/:id', { preHandler: checkUserAuth }, async () => {});                      // เพิ่มผู้จัดการคนใหม่เข้าสู่สำนักงานใหญ่ (ต้องสร้าง user มาก่อน แล้วเอา uid มาป้อน)
  fastify.delete('/hq/managers/:id', { preHandler: checkUserAuth }, async () => {});                      // เอาผู้จัดการคนนี้ออกจากสำนักงานใหญ่นี้ ไม่ใช่การลบข้อมูลผู้จัดการออกจากระบบ

  fastify.get   ('/hq/staffs/lists/:page/:itemperpage', { preHandler: checkUserAuth }, async () => {});   // แสดง list ของพนักงานของสำนักงานใหญ่ที่ user คนนั้นๆ เป็นเจ้าของ
  fastify.post  ('/hq/staffs/:id', { preHandler: checkUserAuth }, async () => {});                        // เพิ่มพนักงานคนใหม่เข้าสู่สำนักงานใหญ่ (ต้องสร้าง user มาก่อน แล้วเอา uid มาป้อน)
  fastify.delete('/hq/staffs/:id', { preHandler: checkUserAuth }, async () => {});                        // เอาพนักงานคนนี้ออกจากสำนักงานใหญ่นี้ ไม่ใช่การลบข้อมูลพนักงานออกจากระบบ
};

export default hqRouter;