import { FastifyPluginAsync } from 'fastify';
import { MoneyspaceCallbackBody, onMoneyspacePaymentCallback } from '../../controllers/v1/payment-hook-controller.js';

const paymentCallbackRouter: FastifyPluginAsync = async (fastify) => {
  // endpoint webhook ของ moneyspace ที่จะยิงเข้ามา
  fastify.post<{ Body: MoneyspaceCallbackBody }>('/hook/msp-callback', onMoneyspacePaymentCallback);
};

export default paymentCallbackRouter;