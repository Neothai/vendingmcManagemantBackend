import { WebSocket } from "ws";
import axios from "axios";
import { Jimp } from 'jimp';
import * as jsQRModule from 'jsqr';
const jsQR = (jsQRModule as any).default || jsQRModule;
import { v7 as uuidv7 } from 'uuid';

import { isEmptyString, isNotArray, isNotkeyOf, isNotValueOf, isNullNumber } from '../../utils/input-validation.js';
import { sendRes, API_RES, sendOk, sendRaw } from '../../utils/output-response.js';
import { AppDataSource } from '../../db/data-source.js';
import { Machine, MACHINE_PAYMENT_ACCEPTOR_TYPE, PaymentAcceptorType } from '../../entities/Machine.js';
import { DBPagination, calcPagination } from '../../utils/db-helper.js';
import { getShopInfo } from './shop-controller.js';
import { FastifyRequest } from 'fastify';
import { FastifyReply } from 'fastify/types/reply.js';
import { ENV } from "../../config/env-config.js";
import { machineConnManager, vendingMachineWsCode } from '../../services/machine-connection-manager.js'
import { MachineTransaction, transactionItemDetails, transactionPaymentAcceptor, transactionType } from "../../entities/MachineTransaction.js";
import { MachineTransactionQueue, PendingMachineTransactionPayload } from "../../services/transaction-queue.js";
import { MachineSystemLogQueue } from "../../services/system-log-queue.js";
import { MachineSystemLogBootReason, MachineSystemLogEventType, MachineSystemLogLevel } from "../../entities/MachineSystemLog.js";
import { machinePaymentRecord } from "../../services/machine-payment-rec.js";
import crypto, { randomInt } from "crypto";

export interface machineCreateBody {
  mcName   : string;
  alias    : string;
  model    : string;
  imageUrl : string;
  note     : string;
  shopId   : string;
  mcPaymAcc: PaymentAcceptorType[];
};

export interface machineSecretKey {
  rawKey  : string;
  hashKey : string;
};

const listAndCountMachineByOwnerId = async(uid: string, page: number, itemPerPage: number) => {
  const {take, skip}: DBPagination = calcPagination(page, itemPerPage);

  const mcTable = AppDataSource.getRepository(Machine);
  return await mcTable.findAndCount({
    where: { shop: { owner: { uid: uid } } },
    select: { id: true, machineId: true, name: true },
    take: take,
    skip: skip,
    order: { id: "ASC" }
  });
};

const createNewMachine = async(newMachine: Machine) => {
  const mcTable = AppDataSource.getRepository(Machine);
  return await mcTable.save(newMachine);
};

export const verifyMachine = async(machineId: string, ownerId = ''): Promise<boolean> => {
  const mcTable = AppDataSource.getRepository(Machine);
  return await mcTable.exists({ where: { machineId: machineId, shop: { owner: { uid: ownerId } } } });
};

const machineGetSecretKey = async(machineId: string, mustBeActiveKey: boolean/*คือเงื่อนไข ว่าคีย์ที่จะค้น ต้องเปิดใช้งานอยู่ไหม*/): Promise<string> => {
  const mcTable = AppDataSource.getRepository(Machine);
  const data = await mcTable.findOne({
    where: {
      machineId: machineId,
      ...( mustBeActiveKey ? { enableSecretKey: true } : {} )
    },
    select: {
      secretKey: true
    } 
  });

  return data?.secretKey || '';
};

const machineSetSecretKey = async(machineId: string, hashedKey: string) => {
  const mcTable = AppDataSource.getRepository(Machine);
  await mcTable.update({ machineId: machineId }, { secretKey: hashedKey });
};

export const isPaymentAcceptorType = (key: unknown): key is PaymentAcceptorType => {
  return typeof key === "string" && Object.hasOwn(MACHINE_PAYMENT_ACCEPTOR_TYPE, key);
};

// สร้าง secret key เอาไว้ให้เครื่องขายของใช้ยืนยันตัวตนแทนการ login
const createNewMachineSecretKey = (prefix: string): machineSecretKey => {
  // สุ่ม Secret จริงความปลอดภัยสูง (32 bytes = 64 hex chars)
  const secretPart = crypto.randomBytes(32).toString('hex');
  const key        = `${prefix ? prefix : "sk"}_${secretPart}`;
  const hash       = crypto.createHash('sha256').update(key).digest('hex');

  return { rawKey: key, hashKey: hash };
};

export const verifyMachineSecretKey = async(machineId: string, rawKey: string): Promise<boolean> => {
  const cleanRawKey = rawKey.replace(/^Bearer\s+/i, '').trim();
  const hashedKey = await machineGetSecretKey(machineId, true);

  if(isEmptyString(hashedKey) || isEmptyString(cleanRawKey)) return false;

  const inputKeyHash = crypto.createHash('sha256').update(cleanRawKey).digest('hex');

  console.log(`[DEBUG] Raw Key Received -> "${cleanRawKey}"`);
  console.log(`[DEBUG] Input Hash      -> "${inputKeyHash}" (Len: ${inputKeyHash.length})`);
  console.log(`[DEBUG] DB Hash         -> "${hashedKey}" (Len: ${hashedKey.length})`);

  if (inputKeyHash.length !== hashedKey.length) {
    console.error(`[DEBUG ERROR] Length mismatch! Check DB Column length or truncation.`);
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(hashedKey, 'hex'), Buffer.from(inputKeyHash, 'hex'));
};

/*
const createNewMachineTransaction = async(machineId: string, type: transactionType, totalAmount: number, acctype: transactionPaymentAcceptor[], details: transactionItemDetails[]) => {
  const newTransaction           = new MachineTransaction;
  newTransaction.machineId       = machineId;
  newTransaction.transactionId   = uuidv7();
  newTransaction.type            = type;
  newTransaction.totalAmount     = totalAmount;
  newTransaction.paymentAcceptor = acctype;
  newTransaction.itemDetails     = details;

  const mcTransaction = AppDataSource.getRepository(MachineTransaction);
  return await mcTransaction.insert(newTransaction);
};*/

export const machineLists = async(
  req: FastifyRequest<{ Params: { page: string, itemperpage: string } }>,
  reply: FastifyReply
) => {
  const page       : number = Number(req.params.page || 0);
  const itemPerPage: number = Number(req.params.itemperpage || 0);

  if([page, itemPerPage].some(val => isNullNumber(val, true))) return sendRes(reply, API_RES.INVALID_PARAM);

  const [machineData, machineCount] = await listAndCountMachineByOwnerId(req.jwt?.sub || '', page, itemPerPage);
  if(!machineData) return sendRes(reply, API_RES.NOT_EXISTS);

  const mcList = machineData?.map((mc) => ({ id: mc.machineId, name: mc.name })) || [];

  return sendOk(reply, { count: machineCount, lists: mcList });
};

export const machineCreate = async(req: FastifyRequest<{ Body: machineCreateBody }>, reply: FastifyReply) => {
  const mcName  : string = String(req.body.mcName   || '');
  const alias   : string = String(req.body.alias    || '');
  const model   : string = String(req.body.model    || '');
  const imageUrl: string = String(req.body.imageUrl || '');
  const note    : string = String(req.body.note     || '');
  const shopId  : string = String(req.body.shopId   || '');

  if([mcName, model, shopId].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

  const rawAcceptors: PaymentAcceptorType[] = req.body.mcPaymAcc;

  if(isNotArray(rawAcceptors, true)) return sendRaw(reply, API_RES.INVALID_BODY.httpCode, API_RES.INVALID_BODY.errCode, `Invalid data type of "mcPaymAcc". Expected: [COIN_ACCEPTOR | BILL_ACCEPTOR | QR_BOX | CARD_READER | MEMBER_CARD_READER]`);
  const invalidItems = rawAcceptors.filter((item) => !isPaymentAcceptorType(item));

  if(invalidItems.length > 0) return sendRaw(reply, API_RES.INVALID_BODY.httpCode, API_RES.INVALID_BODY.errCode, `Invalid option of "mcPaymAcc". (${invalidItems})??`);

  const mcPaymentAcceptorSupport: PaymentAcceptorType[] = rawAcceptors;
  
  const shopData = await getShopInfo({shopId: shopId, owner: { uid: req.jwt?.sub || '' }});
  if(!shopData)    return sendRaw(reply, API_RES.NOT_EXISTS.httpCode, API_RES.NOT_EXISTS.errCode, "Shop not found.");

  const newMachine             = new Machine;
  newMachine.shop              = shopData;
  newMachine.machineId         = uuidv7();
  newMachine.name              = mcName;
  newMachine.model             = model;
  newMachine.paymentAcceptor   = mcPaymentAcceptorSupport;

  if(!isEmptyString(alias))    newMachine.alias    = alias;
  if(!isEmptyString(imageUrl)) newMachine.imageUrl = imageUrl;
  if(!isEmptyString(note))     newMachine.note     = note;

  const n = await createNewMachine(newMachine);
  return sendOk(reply, { id: n.machineId, name: n.name });
};

// เรียก get มาเฉยๆ ถ้ายังไม่มี secret ก็จะสร้างใหม่ ถ้ามีแล้วต้องสั่ง revoke ใหม่เท่านั้น
export const machineNewSecretKey = async(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const machineId: string = req.params.id || '';
  if(isEmptyString(machineId)) return sendRes(reply, API_RES.INVALID_PARAM);

  if(!await verifyMachine(machineId, req.jwt?.sub)) return sendRes(reply, API_RES.ACCESS_DENIED);

  const oldHashedKey = await machineGetSecretKey(machineId, false);
  if(!isEmptyString(oldHashedKey)) return sendRaw(reply, API_RES.INVALID_REQ.httpCode, API_RES.INVALID_REQ.errCode, "There is already an existing key; you must revoke it.");

  const newKey = createNewMachineSecretKey("sk_tt5");
  await machineSetSecretKey(machineId, newKey.hashKey);

  return sendOk(reply, { key: newKey.rawKey });
};

export const machineRevokeSecretKey = async(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const machineId: string = req.params.id || '';
  if(isEmptyString(machineId)) return sendRes(reply, API_RES.INVALID_PARAM);

  if(!await verifyMachine(machineId, req.jwt?.sub)) return sendRes(reply, API_RES.ACCESS_DENIED);

  const oldHashedKey = await machineGetSecretKey(machineId, false);
  if(isEmptyString(oldHashedKey)) return sendRaw(reply, API_RES.INVALID_REQ.httpCode, API_RES.INVALID_REQ.errCode, "There is no existing key; you must create it first.");

  const newKey = createNewMachineSecretKey("sk_tt5");
  await machineSetSecretKey(machineId, newKey.hashKey);

  return sendOk(reply, { key: newKey.rawKey });
};

export const getShopNameByMachineId = async(machineId: string): Promise<string> => {
  if (isEmptyString(machineId)) return "";

  const mcTable = AppDataSource.getRepository(Machine);
  const data = await mcTable.findOne({ 
    where: { machineId: machineId }, 
    relations: { shop: true }, //  ต้องระบุ relations เพื่อสั่งให้ TypeORM ทำ JOIN ตาราง shop
    select: { 
      id: true, 
      shop: { 
        id: true, 
        shopId: true, 
        name: true 
      } 
    } 
  });

  if (!data || !data.shop) return "";
  return data.shop.name;
};

/**
 * ฟังก์ชันสร้าง Payment Reference Number
 * รูปแบบ: QP <YY> <MM> <DD> <เลขสุ่ม 5 หลัก> <ตัวยืนยัน 1 หลัก>
 */
const createPaymentRef = (): string => {
  const prefix = "QP";
  
  // 1. ดึงวันที่ปัจจุบันในรูปแบบ YYMMDD
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2); // ค.ศ. 2 ปีท้าย (เช่น '26')
  const mm = String(now.getMonth() + 1).padStart(2, '0'); // เดือน 01-12
  const dd = String(now.getDate()).padStart(2, '0'); // วันที่ 01-31
  const dateStr = `${yy}${mm}${dd}`;

  // 2. สร้างเลขสุ่มแบบปลอดภัย (Cryptographically Secure) จำนวน 5 หลัก (00000 - 99999)
  const randomNum = randomInt(0, 100000);
  const randomStr = String(randomNum).padStart(5, '0');

  // 3. รวมเฉพาะส่วนที่เป็นตัวเลขเพื่อนำไปหา Check Digit (รวม 11 หลัก)
  const baseNumbers = `${dateStr}${randomStr}`;

  // 4. คำนวณหา Check Digit ด้วยสูตร Luhn Algorithm
  let sum = 0;
  let isSecond = true; // เริ่มลูปจากขวาสุด (เมื่อสลับฝั่ง) ตัวแรกจะถูกคูณ 2

  for (let i = baseNumbers.length - 1; i >= 0; i--) {
    let d = parseInt(baseNumbers.charAt(i), 10);

    if (isSecond) {
      d *= 2;
      if (d > 9) d -= 9;
    }

    sum += d;
    isSecond = !isSecond;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;

  // 5. ประกอบร่างและส่งคืนค่า (ตัวอย่างผลลัพธ์: "QP261018482017")
  return `${prefix}${baseNumbers}${checkDigit}`;
};

/**
 * ฟังก์ชันดาวน์โหลดภาพ QR Code จาก URL และแกะออกมาเป็นข้อความดิบ
 * @param {string} qrImageUrl - ลิงก์รูปภาพ QR Code (เช่น https://...)
 * @returns {Promise<string>} ข้อความดิบของ PromptPay (000201...)
 */
const extractTextFromQR = async(qrImageUrl: string) => {
  try {
    // 1. ใช้ Jimp อ่านภาพจาก URL โดยตรง (Jimp จะดึงข้อมูลและแปลงเป็น Buffer ให้อัตโนมัติ)
    const image = await Jimp.read(qrImageUrl);
    
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // 2. แปลงข้อมูลพิกเซลของภาพให้อยู่ในรูปแบบ Uint8ClampedArray ตามที่ jsQR ต้องการ
    const rgbaChannels = new Uint8ClampedArray(image.bitmap.data);
    
    // 3. สั่งให้ jsQR ถอดรหัสภาพ
    const decodedQR = jsQR(rgbaChannels, width, height);
    
    if (!decodedQR) {
      throw new Error("ไม่สามารถตรวจพบหรือถอดรหัส QR Code จากรูปภาพนี้ได้");
    }
    
    // 4. ส่งค่าข้อความดิบกลับไป (ตัวอย่าง: "00020101021229300016...")
    return decodedQR.data;
    
  } catch (error) {
    console.error("QR Decoding Error:", error);
  }
};

/* =========================================== Machine Websocket Section =========================================== */

export enum MachineDataReportType {
  // 1. ธุรกรรมและการเงิน (เงินเข้า, เลือกบริการ, ยอดเงิน, เงินทอน)
  TRANSACTION_REPORT = "TRANSACTION",

  // 2. ผลการทำงานของระบบจ่าย (ครอบคลุมทั้ง มอเตอร์หมุน, ลิ้นชักเปิด, โซลินอยด์ปล่อยน้ำ, สั่งรีเลย์เครื่องซักผ้า)
  DISPENSE_REPORT    = "DISPENSE",

  // 3. ทรัพยากรคงเหลือ (จำนวนชิ้นในช่อง, ปริมาตรน้ำคงเหลือ, สถานะช่องล็อกเกอร์ ว่าง/เต็ม)
  RESOURCE_REPORT    = "RESOURCE",

  // 4. ค่ามาตรวัดทั่วไป (กระแสไฟฟ้า, แรงดันน้ำ, อุณหภูมิ, ระดับสัญญาณ RSSI)
  TELEMETRY_REPORT   = "TELEMETRY",

  // 5. เหตุการณ์ผิดปกติ (ชิ้นส่วนขัดข้อง, จ่ายของไม่สำเร็จ, ตัวรับเงินขัดข้อง)
  FAULT_REPORT       = "FAULT",

  // 6. พฤติกรรมผู้ใช้ที่หน้าตู้ (กดปุ่ม, เลือกรายการ, สัมผัสหน้าจอ, เสียบบัตร)
  INTERACTION_REPORT = "INTERACTION",

  // 7. สถานะการเริ่มระบบและการทำงาน (Boot, Heartbeat, Firmware version)
  SYSTEM_REPORT      = "SYSTEM",

  // 8. เพึ่งเพิ่มเมื่อ 16/10/69 เป็นตัวเลือกสำหรับให้เครื่องสั่งขอ QR promptpay (อยู่ในช่วงทดสอบ)
  PROMPTPAYQR_CREATE = "PPQR_CREATE"
};

export enum MachineResposeServerStatus {
  OK            = "OK",
  INVALID_PAPAM = "INVALID_PAPAM",
  INVALID_BODY  = "INVALID_BODY",
  INVALID_REPORT_TYPE = "INVALID_REPORT_TYPE",
  INVALID_RESP  = "INVALID_RESP"
};

const wsSendJSON = (ws: WebSocket, out: Record<string, any>): boolean => {
  let stat = false;

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(out));
    stat = true;
  } else {
    console.error(`Machine is not ready, Status = ${ws.readyState}`);
  }

  return stat;
};

export const sendOkToMachine = (ws: WebSocket, data?: Record<string, any>, msg?: string): boolean => {
  return wsSendJSON(ws, { status: MachineResposeServerStatus.OK, msg: msg, data });
};

export const sendInvalidParamToMachine = (ws: WebSocket, data?: Record<string, any>, msg?: string): boolean => {
  return wsSendJSON(ws, { status: MachineResposeServerStatus.INVALID_PAPAM, msg: msg, data });
};

export const sendInvalidBodyToMachine = (ws: WebSocket, data?: Record<string, any>, msg?: string): boolean => {
  return wsSendJSON(ws, { status: MachineResposeServerStatus.INVALID_BODY, msg: msg, data });
};

export const sendResToMachine = (ws: WebSocket, res: MachineResposeServerStatus, data?: Record<string, any>, msg?: string): boolean => {
  return wsSendJSON(ws, { status: res, msg: msg, data });
};

export const verifyTransactionPaymentAcceptor = (input: transactionPaymentAcceptor): boolean => {
  return isNullNumber(input?.amount ?? 0, true) || isNotkeyOf(MACHINE_PAYMENT_ACCEPTOR_TYPE, input?.type || '');
};

export const verifyTransactionItemDetails = (input: transactionItemDetails): boolean => {
  return isEmptyString(input?.itemCode || '') || isNullNumber(input?.itemValue, true) || isNullNumber(input?.itemPcs, true);
};

const handleIncomingMachineMessage = async (ws: WebSocket, type: string, machineId: string, payload: Record<string, any>) => {
  switch (type) {
    /* ตัวอย่าง
      {
        "reportType": "TRANSACTION",
        "txType": "Income",
        "totalAmount": 23.00,
        "acceptors": [
          { 
            "type": "BILL_ACCEPTOR",
            "amount": 20.00
          },
          {
            "type": "COIN_ACCEPTOR",
            "amount": 3.00
          }
        ],
        "itemDetails": [
          {
            "itemCode": "TEST-001",
            "itemValue": 23.00,
            "itemPcs": 1
          }
        ]
      }
    */
    case MachineDataReportType.TRANSACTION_REPORT: {
      const txType     : transactionType              = payload.txType;
      const totalAmount: number                       = payload.totalAmount;
      const acceptors  : transactionPaymentAcceptor[] = payload.acceptors;
      const itemDetails: transactionItemDetails[]     = payload.itemDetails;

      if(isEmptyString(txType) || isNotValueOf(transactionType, txType) || isNullNumber(totalAmount, true)) {
        return sendInvalidParamToMachine(ws);
      }

      if(txType === transactionType.INCOME) {
        if([acceptors, itemDetails].some(item => isNotArray(item, true)) 
            || acceptors.every(acc => verifyTransactionPaymentAcceptor(acc))
            || itemDetails.every(item => verifyTransactionItemDetails(item))){
          return sendInvalidParamToMachine(ws, { }, "Invalid acceptors or itemDetails");
        }
      }

      MachineTransactionQueue.add({
        machineId      : machineId,
        type           : txType,
        totalAmount    : totalAmount,
        paymentAcceptor: acceptors,
        itemDetails    : itemDetails
      });

    } break;
    case MachineDataReportType.DISPENSE_REPORT:

    break;
    case MachineDataReportType.RESOURCE_REPORT:

    break;
    case MachineDataReportType.TELEMETRY_REPORT:

    break;
    case MachineDataReportType.FAULT_REPORT:

    break;
    case MachineDataReportType.INTERACTION_REPORT:

    break;

    /* ตัวอย่าง
      {
        "reportType": "SYSTEM",
        "logLevel": "INFO",
        "eventType": "BOOT",
        "bootReason": "POWERON_RESET",
        "fwVer": "1.0.2",
        "uptime": 3000,
        "details": {
            "temp": 34.9,
            "rssi": -80.2
        }
      }
    */
    case MachineDataReportType.SYSTEM_REPORT:
      const logLevel  : MachineSystemLogLevel      = payload.logLevel   || '';
      const eventType : MachineSystemLogEventType  = payload.eventType  || '';
      const bootReason: MachineSystemLogBootReason = payload.bootReason || '';
      const fwVer     : string                     = payload.fwVer      || '';
      const uptime    : number                     = Number(payload.uptime);
      const details   : Object                     = payload.details;

      if(isEmptyString(logLevel) || isNotValueOf(MachineSystemLogLevel, logLevel)){
        return sendInvalidParamToMachine(ws, { }, "Invalid logLevel");
      }

      if(isEmptyString(eventType) || isNotValueOf(MachineSystemLogEventType, eventType)){
        return sendInvalidParamToMachine(ws, { }, "Invalid eventType");
      }
        
      if(eventType === MachineSystemLogEventType.BOOT && (isEmptyString(bootReason) || isNotValueOf(MachineSystemLogBootReason, bootReason))){
        return sendInvalidParamToMachine(ws, { }, "Invalid bootReason");
      }

      if(isEmptyString(fwVer)){
        return sendInvalidParamToMachine(ws, { }, "Invalid fwVer");
      }

      if(isNullNumber(uptime)){
        return sendInvalidParamToMachine(ws, { }, `Invalid uptime ${uptime}`);
      }

      if(details === null || details === undefined){
        return sendInvalidParamToMachine(ws, { }, "Invalid details");
      }

      MachineSystemLogQueue.add({
        machineId      : machineId,
        logLevel       : logLevel,
        eventType      : eventType,
        bootReason     : bootReason,
        firmwareVersion: fwVer,
        uptime         : Math.floor(uptime), // ปัดเศษลงเพื่อลง bigint ใน PostgreSQL อย่างปลอดภัย
        ipAddress      : (ws as any)._socket?.remoteAddress || null,
        details        : details
      });
    break;

    /*
      รูปแบบของคำขอ
      1. ขอสร้าง QR Promptpay
      {
        "reportType": "PPQR_CREATE",
        "cmd": "create",
        "orderId": "...",
        "amount": 12.80,
        "qrType": "base64Text" หรือ "base64PNG",
        "onPaymentSuccess": "auto" เมื่อต้องการให้ระบบแจ้งไปอัตโนมัตเมื่อการชำระสำเร็จ หรือ "manual" เมื่อต้องการ polling มาถามเอง
      }

      รูปแบบของคำตอบ
      1. เมื่อขอสร้าง QR Promptpay สำเร็จ
      {
        "status": "OK",
        "data": {
          "notifyType": "createQRSuccess",
          "qr": "<data>"
        }
      }

      2. เมื่อมีการจ่ายเงินสำเร็จ
      {
        {
        "status": "OK",
        "data": {
          "notifyType": "paymantSuccess",
          "amount": 12.8,
          "orderId": "..."
        }
      }
      }
    */
    case MachineDataReportType.PROMPTPAYQR_CREATE:
      const cmd             : string = payload.cmd || '';
      const orderId         : string = payload.orderId || '';
      const amount          : number = Number(payload.amount || 0);
      const qrType          : string = payload.qrType || '';
      const onPaymentSuccess: string = payload.onPaymentSuccess || '';

      if(isEmptyString(cmd))              return sendInvalidParamToMachine(ws, { }, "Invalid cmd");
      if(isEmptyString(orderId))          return sendInvalidParamToMachine(ws, { }, "Empty orderId");
      if(isNullNumber(amount) || amount < .1) return sendInvalidParamToMachine(ws, { }, "Invalid amount");
      if(isEmptyString(qrType))           return sendInvalidParamToMachine(ws, { }, "Invalid qrType");
      if(isEmptyString(onPaymentSuccess)) return sendInvalidParamToMachine(ws, { }, "Invalid onPaymentSuccess");

      if(!machinePaymentRecord.new(machineId, orderId)) return sendInvalidParamToMachine(ws, { }, "Duplicate orderId");

      const shopName: string = await getShopNameByMachineId(machineId);

      let response = await axios.post("https://a.moneyspace.net/payment/CreateTransaction", {
        secret_id: ENV.PAYMENT_GW.MSP.SECRET_ID,
        secret_key: ENV.PAYMENT_GW.MSP.SECRET_KEY,
        order_id: orderId,
        amount: amount,
        feeType: "include",
        payment_type: "qrnone",
        //"success_Url": "https://www.shopping.com/success",
        //"fail_Url": "https://www.shopping.com/fail",
        //"cancel_Url": "https://www.shopping.com/cancel",
        agreement: "5",
        branch: shopName,
        device_id: machineId,
        ref1: createPaymentRef(),
        language: "th"
      }, {
        timeout: 5000,
      });

      if (response.status !== 200) {
        console.warn(`network or server fail, error: ${response.statusText}`);
        return sendResToMachine(ws, MachineResposeServerStatus.INVALID_RESP);
      }

      const responseBody = response.data; // จะได้ Array ของออบเจกต์
      if (!responseBody || responseBody.length === 0) {
        console.warn("API response is empty");
        return sendResToMachine(ws, MachineResposeServerStatus.INVALID_RESP);
      }

      const paymentResult = responseBody[0];

      if (paymentResult.status !== "success") {
        console.warn(`MoneySpace Request Failed! Raw Status: ${paymentResult.status}`, paymentResult);
        return sendResToMachine(ws, MachineResposeServerStatus.INVALID_RESP);
      }

      const transactionId = paymentResult.transaction_ID;
      const qrImageUrl = paymentResult.image_qrprom;

      let qrData = '';

      if(qrType === "base64PNG"){
        response = await axios.get(qrImageUrl, {timeout: 5000});

        if (response.status !== 200) {
          console.warn(`get qr image fail, error: ${response.statusText}`);
          return sendResToMachine(ws, MachineResposeServerStatus.INVALID_RESP);
        }

        if (!response.data || response.data.length === 0) {
          console.warn("API response is empty");
          return sendResToMachine(ws, MachineResposeServerStatus.INVALID_RESP);
        }

        qrData = Buffer.from(response.data, "utf8").toString("base64");
      } else if(qrType === "base64Text") {
        qrData = await extractTextFromQR(qrImageUrl);
      }

      sendOkToMachine(ws, {
        notifyType: "createQRSuccess",
        qr: qrData
      });
    break;
  }

  sendOkToMachine(ws);
};

export const machineRealtimeComm = (ws: WebSocket, req: FastifyRequest<{ Params: { machineId: string } }>) => {
  const machineId: string = req.params.machineId;
  const ownerId  : string = req.jwt?.sub || ''; 

  const success = machineConnManager.register(machineId, ws, true);
  if (!success) {
    console.warn(`[Rejected]: Machine ${machineId} is busy/already connected.`);
    ws.close(vendingMachineWsCode.CONN_BUSY.code, vendingMachineWsCode.CONN_BUSY.reason);
    return; // สำคัญที่สุด: ต้อง return ทันทีเพื่อไม่ให้ Timer และ Event ทำงานต่อ
  }

  console.log(`Machine: ${machineId} Connected. (Owner: ${ownerId})`);
  sendOkToMachine(ws, { }, "Connected");

  let isAlive = true;
  
  // เปลี่ยนมารับ pong จาก client แทน ping
  ws.on('pong', () => { isAlive = true; console.log("Recive ping"); });

  const heartbeatInterval = setInterval(() => {
    if (isAlive === false) {
      clearInterval(heartbeatInterval);
      machineConnManager.remove(machineId, ws);
      console.log(`Machine ${machineId} Not pong in time, terminate now!`);
      return ws.terminate();
    }

    isAlive = false;
    // สั่ง Server ส่ง ping ไปหา ESP32-P4
    if (ws.readyState === WebSocket.OPEN) {
      console.log("Send ping ->");
      ws.ping();
    }
  }, Number(ENV.WS.PING_INTERVAL));

  ws.on("message", async (raw: Buffer) => {
    let payload: Record<string, any>;

    // 1. ดักจับเฉพาะ Error ของการ Parse JSON
    try {
      payload = JSON.parse(raw.toString().trim()); // ใส่ .trim() เพื่อตัด \r \n \0 ที่อาจติดมา
    } catch (err) {
      console.error(`[Machine ${machineId}] Invalid JSON Syntax:`, err);
      return sendInvalidBodyToMachine(ws);
    }

    console.log(`[Machine ${machineId}] Message received:`, payload);

    const type: MachineDataReportType = payload.reportType || '';
    if(isEmptyString(type) || !Object.values(MachineDataReportType).includes(type)) {
      return sendInvalidParamToMachine(ws);
    }

    // 2. ดักจับ Error ที่เกิดจาก Logic / External API (Axios, Jimp, Payment GW) แยกกัน
    try {
      await handleIncomingMachineMessage(ws, type, machineId, payload);
    } catch (err) {
      console.error(`[Machine ${machineId}] Processing Error:`, err);
      sendResToMachine(ws, MachineResposeServerStatus.INVALID_RESP, {}, "Internal processing error");
    }
  });

  ws.on("close", (code: number, reason: Buffer) => {
    clearInterval(heartbeatInterval);
    machineConnManager.remove(machineId, ws); // ถอดเฉพาะ socket ตัวที่ปิดจริง
    console.log(`Connection close, code: ${code}, reason: ${reason.toString()}`);
  });

  ws.on("error", (err: Error) => {
    clearInterval(heartbeatInterval);
    machineConnManager.remove(machineId, ws);
    console.error(`Socket error: ${err.message}`);
  });
};