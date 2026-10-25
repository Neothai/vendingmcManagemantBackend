import { checkUserAuth, checkMachineUserAuth, machineMiddlewareParams } from '../../middleware/auth.js';
import { machineCreate, machineCreateBody, machineNewSecretKey, machineLists, machineRealtimeComm, machineRevokeSecretKey } from '../../controllers/v1/machine-controller.js';

import { FastifyPluginAsync } from "fastify";

const machineRouter: FastifyPluginAsync = async (fastify) => {
  /* ======================== ต้องผ่านการ login ======================== */
  fastify.get<{ Params: { page: string, itemperpage: string } }>
                ('/machine/lists/:page/:itemperpage', { preHandler: checkUserAuth }, machineLists);
  fastify.get<{ Params: { id: string } }>
                ('/machine/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.get<{ Params: { id: string } }>
                ('/machine/secretkey/new/:id', { preHandler: checkUserAuth }, machineNewSecretKey);
  fastify.get<{ Params: { id: string } }>
                ('/machine/secretkey/revoke/:id', { preHandler: checkUserAuth }, machineRevokeSecretKey);
  fastify.post<{ Body: machineCreateBody }>
                ('/machine', { preHandler: checkUserAuth }, machineCreate);
  fastify.put   ('/machine/:id', { preHandler: checkUserAuth }, async () => {});
  fastify.delete('/machine/:id', { preHandler: checkUserAuth }, async () => {});
};

export const websocketMachineRouter: FastifyPluginAsync = async(ws) => {
  ws.get<{ Params: machineMiddlewareParams }>
        ('/machine/:machineId', { websocket: true, preValidation: [ checkMachineUserAuth ] }, machineRealtimeComm);
};

export default machineRouter;