import { v7 as uuidv7 } from 'uuid';
import { FastifyReply, FastifyRequest } from 'fastify';

import { isEmptyString, isNullNumber } from '../../utils/input-validation.js';
import { sendRes, API_RES, sendOk, sendRaw } from '../../utils/output-response.js';
import { AppDataSource } from '../../db/data-source.js';
import { Headquarters } from '../../entities/Headquarters.js';
import { calcPagination, DBPagination, DBQueryDataOption } from '../../utils/db-helper.js';
import { verifyThaiAddress } from '../../utils/thai-address-validation.js';
import { Contact } from '../../entities/Contact.js';
import { Address } from '../../entities/Address.js';
import { queryUserInfo } from './user-controller.js';

export interface HeadquarterCreateBody {
  hqName: string;
  note: string;
  contact: {
    cName: string;
    email: string;
    phone: string;
    lineId: string;
  };
  address: {
    aName: string;
    latitude: number;
    longitude: number;
    details: string;
    subDistrict: string;
    district: string;
    province: string;
    zipCode: string;
  };
};

const listAndCountHeadquarterByOwnerId = async(uid: string, page: number, itemPerPage: number) => {
  const {take, skip}: DBPagination = calcPagination(page, itemPerPage);

  const hqTable = AppDataSource.getRepository(Headquarters);
  return await hqTable.findAndCount({
    where : { owner: { uid: uid } },
    select: { id: true, hqId: true, name: true },
    take  : take,
    skip  : skip,
    order : { id: "ASC" }
  });
};

const getHeadquarterInfoByHeadquarterId = async(hqId: string) => {
  const hqTable = AppDataSource.getRepository(Headquarters);
  return await hqTable.find({
    where : { hqId: hqId },
    select: { hqId: true, name: true, note: true, createdAt: true, updatedAt: true }
  });
};

const createNewHeadquarter = async(newHeadquarter: Headquarters) => {
  const hqTable = AppDataSource.getRepository(Headquarters);
  return await hqTable.save(newHeadquarter);
};

/*
  GET api/v1/hq/:page/:itemperpage
  Response:
  {
    "code": 0,
    "status": "OK",
    "res": {
        "count": <จำนวนข้อมูลใน list>,
        "lists": [
            {
                "id": "<uuidv7>",
                "name": "<ชื่อ>"
            }
        ]
    }
}
*/
export const headquarterLists = async(
  req: FastifyRequest<{ Params: { page: number, itemperpage: number } }>,
  reply: FastifyReply
) => {
  const page       : number = Number(req.params.page || 0);
  const itemPerPage: number = Number(req.params.itemperpage || 0);

  if([page, itemPerPage].some(val => isNullNumber(val, true))) return sendRes(reply, API_RES.INVALID_PARAM);

  const [hqData, hqCount] = await listAndCountHeadquarterByOwnerId(req.jwt?.sub || '', page, itemPerPage);
  if(!hqData) return sendRes(reply, API_RES.NOT_EXISTS);

  const hqList = hqData?.map((hq) => ({ id: hq.hqId, name: hq.name })) || [];

  return sendOk(reply, { count: hqCount, lists: hqList });
};


export const headquarterGetInfo = async(
  req: FastifyRequest<{ Params: { hqid: string } }>,
  reply: FastifyReply
) => {
  const hqId: string = String(req.params.hqid || '');
  //const opt : DBQueryDataOption = req.params.opt as DBQueryDataOption;

  if([hqId].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

  const hqData = await getHeadquarterInfoByHeadquarterId(hqId);
  if(!hqData) return sendRes(reply, API_RES.NOT_EXISTS);

  return sendRes(reply, API_RES.OK, hqData);
};

export const headquarterCreate = async(
  req: FastifyRequest<{ Body: HeadquarterCreateBody }>,
  reply: FastifyReply
) => {
  const hqName : string = req.body.hqName;
  const ownerId: string = req.jwt?.sub || '';
  const note   : string = req.body.note;

  if([hqName, ownerId].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

  const cName : string = req.body.contact.cName; // ชื่อจริงๆ ของผู้ใช้
  const email : string = req.body.contact.email;
  const phone : string = req.body.contact.phone;
  const lineId: string = req.body.contact.lineId;

  if([cName, phone].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

  const aName      : string = req.body.address.aName; // ชื่อของที่อยู่ เช่น บ้านใกล้ปากซอย
  const latitude   : number = req.body.address.latitude;
  const longitude  : number = req.body.address.longitude;
  const details    : string = req.body.address.details;
  const subDistrict: string = req.body.address.subDistrict;
  const district   : string = req.body.address.district;
  const province   : string = req.body.address.province;
  const zipCode    : string = req.body.address.zipCode;

  if([subDistrict, district, province, zipCode].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

  if(!verifyThaiAddress(province, district, subDistrict, zipCode)) return sendRaw(reply, 400, API_RES.INVALID_PARAM.errCode, "thai address not correct.");

  const userInfo = await queryUserInfo({uid: ownerId}, false, false);
  if(!userInfo) return sendRaw(reply, API_RES.NOT_EXISTS.httpCode, API_RES.NOT_EXISTS.errCode, "Owner user not found.");

  const newHeadquarter               = new Headquarters;
  newHeadquarter.contact             = new Contact;
  newHeadquarter.address             = new Address;
  newHeadquarter.owner               = userInfo;

  newHeadquarter.hqId                = uuidv7();
  newHeadquarter.name                = hqName;
  if(!isEmptyString(note))           newHeadquarter.note = note;

  newHeadquarter.contact.name        = cName;
  if(!isEmptyString(email))          newHeadquarter.contact.email  = email;
  newHeadquarter.contact.phone       = [phone];
  if(!isEmptyString(lineId))         newHeadquarter.contact.lineId = lineId;

  if(!isEmptyString(aName))          newHeadquarter.address.name      = aName;
  if(!isNullNumber(latitude, true))  newHeadquarter.address.latitude  = latitude;
  if(!isNullNumber(longitude, true)) newHeadquarter.address.longitude = longitude;
  if(!isEmptyString(details))        newHeadquarter.address.details   = details;
  newHeadquarter.address.subDistrict = subDistrict;
  newHeadquarter.address.district    = district;
  newHeadquarter.address.province    = province;
  newHeadquarter.address.zipCode     = zipCode;

  const n = await createNewHeadquarter(newHeadquarter);
  return sendOk(reply, { id: n.hqId, name: n.name });
};