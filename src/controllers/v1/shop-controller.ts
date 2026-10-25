import { v7 as uuidv7 } from 'uuid';
import { isEmptyString, isNullNumber } from '../../utils/input-validation.js';
import { sendRes, API_RES, sendRaw } from '../../utils/output-response.js';
import { AppDataSource } from '../../db/data-source.js';
import { calcPagination, DBPagination } from '../../utils/db-helper.js';
import { Shop } from '../../entities/Shop.js';
import { verifyThaiAddress } from '../../utils/thai-address-validation.js';
import { queryUserInfo } from './user-controller.js';
import { Address } from '../../entities/Address.js';
import { Contact } from '../../entities/Contact.js';
import { FindOptionsRelations, FindOptionsSelect, FindOptionsWhere } from 'typeorm';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface ShopCreateBody {
  shopName: string;
  ownerId : string;
  imgUrl  : string;
  note    : string;
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

const listAndCountShopByOwnerId = async(uid: string, page: number, itemPerPage: number) => {
  const { take, skip }: DBPagination = calcPagination(page, itemPerPage);

  const shopTable = AppDataSource.getRepository(Shop);
  return await shopTable.findAndCount({
    where: { owner: { uid: uid } },
    select: { id: true, shopId: true, name: true, imageUrl: true },
    take: take,
    skip: skip,
    order: { id: "ASC" }
  });
};

export const getShopInfo = async(where: FindOptionsWhere<Shop>, select?: FindOptionsSelect<Shop>, relations?: FindOptionsRelations<Shop>) => {
  const shopTable = AppDataSource.getRepository(Shop);
  return await shopTable.findOne({
    where: where,
    ...(select ? {select: select} : {}),
    ...(relations ? {relations: relations} : {})
  });
};

export const shopIsValid = async(shopId: string, ownerId = ''): Promise<boolean> => {
  const shopTable = AppDataSource.getRepository(Shop);
  return await shopTable.existsBy({
    shopId: shopId,
    ...(!isEmptyString(ownerId || '') ? {owner: { uid: ownerId }} : {})
  });
};

const createNewShop = async(newShop: Shop) => {
  const shopTable = AppDataSource.getRepository(Shop);
  return await shopTable.save(newShop);
};

export const shopLists = async(req: FastifyRequest<{ Params: { page: string, itemperpage: string } }>, reply: FastifyReply) => {
  const page       : number = Number(req.params.page || 0);
  const itemPerPage: number = Number(req.params.itemperpage || 0);

  if([page, itemPerPage].some(val => isNullNumber(val, true))) return sendRes(reply, API_RES.INVALID_PARAM);

  const [shopsData, shopCount] = await listAndCountShopByOwnerId(req.jwt?.sub || '', page, itemPerPage);
  if(!shopsData) return sendRes(reply, API_RES.NOT_EXISTS);

  const shopLists = shopsData?.map((shop) => ({id: shop.shopId, name: shop.name, image: shop.imageUrl}));

  return sendRes(reply, API_RES.OK, {count: shopCount, lists: shopLists});
};

export const shopCreate = async(req: FastifyRequest<{ Body: ShopCreateBody }>, reply: FastifyReply) => {
  const shopName: string = req.body.shopName;
  const ownerId : string = req.jwt?.sub || '';
  const imgUrl  : string = req.body.imgUrl;
  const note    : string = req.body.note;

  if([shopName, ownerId].some(isEmptyString)) return sendRes(reply, API_RES.INVALID_PARAM);

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

  const newShop                      = new Shop;
  newShop.contact                    = new Contact;
  newShop.address                    = new Address;
  newShop.owner                      = userInfo;

  newShop.shopId                     = uuidv7();
  newShop.name                       = shopName;
  if(!isEmptyString(note))           newShop.note = note;

  newShop.contact.name               = cName;
  if(!isEmptyString(email))          newShop.contact.email  = email;
  newShop.contact.phone              = [phone];
  if(!isEmptyString(lineId))         newShop.contact.lineId = lineId;

  if(!isEmptyString(aName))          newShop.address.name      = aName;
  if(!isNullNumber(latitude, true))  newShop.address.latitude  = latitude;
  if(!isNullNumber(longitude, true)) newShop.address.longitude = longitude;
  if(!isEmptyString(details))        newShop.address.details   = details;
  newShop.address.subDistrict        = subDistrict;
  newShop.address.district           = district;
  newShop.address.province           = province;
  newShop.address.zipCode            = zipCode;

  const n = await createNewShop(newShop);
  return sendRes(reply, API_RES.OK, {id: n.shopId, name: n.name});
};