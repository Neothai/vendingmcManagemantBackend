import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ENV } from '../config/env-config.js';

import { User } from '../entities/User.js';
import { Shop } from '../entities/Shop.js';
import { Address } from '../entities/Address.js';
import { Contact } from '../entities/Contact.js';
import { Machine } from '../entities/Machine.js';
import { Headquarters } from '../entities/Headquarters.js';
import { MachineTransaction } from '../entities/MachineTransaction.js';
import { MachineSystemLog } from '../entities/MachineSystemLog.js';

export const AppDataSource = new DataSource({
  type: "postgres",
  host: ENV.DB.HOST,
  port: ENV.DB.PORT,
  username: ENV.DB.USERNAME,
  password: ENV.DB.PASSWORD,
  database: ENV.DB.DATABASE,
  
  entities: [User, Address, Contact, Machine, Shop, Headquarters, MachineTransaction, MachineSystemLog],
  
  // โหมดพัฒนา (Development) ตั้งเป็น true เพื่อให้สร้าง/อัปเดตตารางในฐานข้อมูลอัตโนมัติ
  synchronize: ENV.APP.NODE_ENV === "development", 
  //logging: ENV.APP.NODE_ENV === "development",

  extra: {
    max: 15,               // จำนวนท่อเชื่อมต่อสูงสุดพร้อมกัน (Default คือ 10)
    min: 2,                // จำนวนท่อขั้นต่ำที่เปิดสแตนด์บายไว้ใน RAM
    idleTimeoutMillis: 30000, // ปิดท่อทิ้งหากไม่มีการใช้งานเกิน 30 วินาที
    connectionTimeoutMillis: 5000 // หากท่อเต็ม รอคิวขอท่อใหม่ไม่เกิน 5 วินาที
  }
});
