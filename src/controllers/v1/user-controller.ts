import { FastifyReply, FastifyRequest } from 'fastify';
import { v7 as uuidv7 } from 'uuid';

import { isEmptyString, isNullNumber } from '../../utils/input-validation.js';
import { API_RES, sendOk, sendRaw, sendRes } from '../../utils/output-response.js';
import { AppDataSource } from '../../db/data-source.js';
import { User } from '../../entities/User.js';
import { decryptRSAPassword, hashPassword } from '../../utils/secure-helper.js';
import { verifyThaiAddress } from '../../utils/thai-address-validation.js';
import { Address } from '../../entities/Address.js';
import { Contact } from '../../entities/Contact.js';
import { DBQueryDataOption } from '../../utils/db-helper.js';

export interface UserCreateBody {
  uName: string;
  uPass: string;
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

export const queryUserInfo = async(query: Object, needContact = false, needAddress = false, selectOptions = {}) => {
  const userTable = AppDataSource.getRepository(User);
  return await userTable.findOne({
    where: query,
    relations: { contact: needContact, address: needAddress },
    ...(selectOptions ? { select: selectOptions } : {})
  });
};

const createNewUser = async(newUser: User) => {
  const userTable = AppDataSource.getRepository(User);
  return await userTable.save(newUser);
};

/*
  GET api/v1/users/:opt
*/
export const userGetInfo = async(req: FastifyRequest<{ Params: { opt: DBQueryDataOption } }>, reply: FastifyReply) => {
  const uid: string = req.jwt?.sub || '';
  const opt: DBQueryDataOption = req.params.opt as DBQueryDataOption;
  if([uid, opt].some(isEmptyString) || !Object.values(DBQueryDataOption).includes(opt)) return sendRes(reply, API_RES.INVALID_PARAM);

  const optIsFull = opt === DBQueryDataOption.FULL;

  const userData = await queryUserInfo({uid: uid}, optIsFull, optIsFull, {
    idx: true, userName: true, role: true,
    ...(optIsFull ? { 
      contact: {
        name: true, email: true, phone: true, lineId: true
      }, 
      address: {
        name: true, latitude: true, longitude: true, details: true, subDistrict: true, district: true, province: true, zipCode: true
      }
    } : {})
  });

  if(!userData) return sendRes(reply, API_RES.NOT_EXISTS);

  return sendOk(reply, userData);
};


/*
  POST api/v1/users
  BODY (JSON) (* คือว่างไว้ได้)
  {
    "uName": "username",
    "uPass": "password",
    "contact": {
      "cName": "fullname", 
      *"email": "email",
      "phone": "phone",
      *"lineId": "lineid"
    },
    "address": {
      *"aName": "addressname",
      *"latitude": "...",
      *"longitude": "...",
      *"details": "128/54 ถนนเจริญชัย...",
      "subDistrict": "...",
      "district": "...",
      "province": "...",
      "zipCode": "..."
    }
  }
*/
export const userCreateNew = async(req: FastifyRequest<{ Body: UserCreateBody }>, reply: FastifyReply) => {
  const uName: string = req.body.uName; // ชื่อผู้ใช้
  const uPass: string = req.body.uPass;

  if([uName, uPass].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

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

  const rawPassword = decryptRSAPassword(uPass);
  const hashedPassword = await hashPassword(rawPassword);

  const newUser               = new User;
  newUser.contact             = new Contact;
  newUser.address             = new Address;

  newUser.uid                 = uuidv7();
  newUser.userName            = uName;
  newUser.password            = hashedPassword;

  newUser.contact.name        = cName;
  if(!isEmptyString(email))   newUser.contact.email  = email;
  newUser.contact.phone       = [phone];
  if(!isEmptyString(lineId))  newUser.contact.lineId = lineId;

  if(!isEmptyString(aName))          newUser.address.name      = aName;
  if(!isNullNumber(latitude, true))  newUser.address.latitude  = latitude;
  if(!isNullNumber(longitude, true)) newUser.address.longitude = longitude;
  if(!isEmptyString(details))        newUser.address.details   = details;
  newUser.address.subDistrict = subDistrict;
  newUser.address.district    = district;
  newUser.address.province    = province;
  newUser.address.zipCode     = zipCode;

  const n = await createNewUser(newUser);
  return sendOk(reply, { uid: n.uid, uname: n.userName });
};