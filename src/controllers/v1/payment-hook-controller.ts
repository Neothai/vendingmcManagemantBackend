import crypto from 'crypto';
import { FastifyRequest } from 'fastify';
import { FastifyReply } from 'fastify/types/reply.js';
import { API_RES, sendOk, sendRes } from '../../utils/output-response.js';
import { MachineResposeServerStatus } from './machine-controller.js';
import { machineConnManager } from '../../services/machine-connection-manager.js';
import { isEmptyString } from '../../utils/input-validation.js';
import { machinePaymentRecord } from '../../services/machine-payment-rec.js';

/*
Content Type: application/x-www-form-urlencoded;charset=UTF-8

🧾 Webhook Response (HTTP POST)
transactionID: string — Merchant (Seller) uses exclusively to keep track of orders.
amount: number — amount of payment
status: string — Status of payment
orderid: string — Merchant (Seller) uses exclusively to keep track of orders.
hash: string — hash values

🔐 Hash Algorithm
data: transectionID+amount+status+orderid
key: secret_key
hash = hmac_sha256(data, secret_key)
how to hash(php): hash_hmac('sha256', $transectionID.$amount.$status.$orderid, $secret_key);

📊 Payment Status
OK: string — creating payment method
paysuccess: string — payment success
fail: string — payment failed
cancel: string — payment canceled

ตัวอย่างเมื่อส่งคำขอสร้าง qr แล้วมันยิง hook มา
transactionID=MQR1710261685755&amount=0.10&status=OK&orderid=ORDERTEST0000005&hash=0e8af5d2eac8781e372a1429d19ea8cf6067661c216f73fb83e299b4d50d89e0
*/

export enum MoneyspaceCallbackStatus {
  OK          = "OK",
  PAY_SUCCESS = "paysuccess",
  FAIL        = "fail",
  CANCEL      = "cancel"
};

export interface MoneyspaceCallbackBody {
  transactionID: string;
  amount       : string;
  status       : string;
  orderid      : string;
  hash         : string;
};

const secretKey = "Jxk3O1bms0n615zH8F2YJtpPSYLN7D3gbxcQZ6XJij2Sd3ssp5FyHPCmW77289719OMSSe1Gp604S0E2";

const MoneyspacePaymentCheckHash = (key: string, b: MoneyspaceCallbackBody): boolean => {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(new TextEncoder().encode(String(b.transactionID + b.amount + b.status + b.orderid)));
  return crypto.timingSafeEqual(Buffer.from(b.hash), Buffer.from(hmac.digest('hex')));
};

export const onMoneyspacePaymentCallback = async(
  req: FastifyRequest<{ Body: MoneyspaceCallbackBody }>,
  reply: FastifyReply
) => {
  const { transactionID, amount, status, orderid, hash }: MoneyspaceCallbackBody = req.body;

  if([transactionID, amount, status, orderid, hash].some(isEmptyString)) {
    return sendRes(reply, API_RES.INVALID_BODY);
  }

  if(!MoneyspacePaymentCheckHash(secretKey, req.body)) {
    return sendRes(reply, API_RES.INVALID_PARAM);
  }

  const machineId: string = machinePaymentRecord.getMachineId(orderid) || '';
  
  if(status === MoneyspaceCallbackStatus.OK) {
    return sendOk(reply);
  } else if (status === MoneyspaceCallbackStatus.PAY_SUCCESS){

  }
  
  const payload = {
    status: MachineResposeServerStatus.OK,
    data: {
      notifyType: "paymentSuccess",
      amount: Number(amount),
      orderId: orderid
    }
  };

  const sent = machineConnManager.sendMsgToMachine(machineId, payload);
  if (!sent) {
    console.warn(`[Payment Success] Cannot send signal to machine ${machineId}: Machine offline or socket not open.`);
  } else {
    console.log(`[Payment Success] Successfully sent signal to machine ${machineId}`);
  }
  
  return sendOk(reply);
};