import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { Relation } from "typeorm";
import { Shop } from "./Shop.js";
import { MachineTransaction } from "./MachineTransaction.js";

export enum paymentAcceptorTechnologyType {
  OFFLINE = "Offline", // เครื่องรับเงินที่ไม่ต้องการเชื่อมต่อเน็ต เช่น เครื่องรับเหรียญ เครื่องรับธนบัตร
  ONLINE  = "Online"   // เครื่องรับเงินที่ต้องการเชื่อมต่อเน็ต เช่น เครื่องรับชำระผ่าน QR เครื่องรับชำระด้วยบัตรสมาชิก
};

export enum paymentAcceptorInterfaceType {
  MDB     = "MDB",     // Multi-Drop Bus (มาตรฐานสากลหลักของตู้หยอดเหรียญ ใช้คุยกับบอร์ดคุมหลัก)
  PULSE   = "Pulse",   // สัญญาณพัลส์ (ระบบดั้งเดิม ยิงสัญญาณไฟฟ้าดิบตามจำนวนเงิน เช่น หยอด 10 บาท ยิง 10 ลูก)
  SERIAL  = "Serial",  // RS232 / TTL Serial (การเชื่อมต่อผ่านพอร์ตซีเรียลระดับฮาร์ดแวร์)
  USB     = "USB",     // เชื่อมต่อผ่านพอร์ต USB ทั่วไป (มักใช้กับเครื่องอ่านการ์ดหรือกล้องอัจฉริยะรุ่นใหม่)
  NETWORK = "Network"  // LAN / Wi-Fi / MQTT / HTTP API (สำหรับอุปกรณ์ออนไลน์ที่ส่งข้อมูลเข้าคลาวด์ตรงๆ)
}

export enum CurrencyType {
  THB = "THB", // บาทไทย
  USD = "USD", // ดอลลาร์สหรัฐ
  EUR = "EUR", // ยูโร
  JPY = "JPY", // เยนญี่ปุ่น
  CNY = "CNY"  // หยวนจีน
}

export const MACHINE_PAYMENT_ACCEPTOR_TYPE = {
  COIN_ACCEPTOR: { // เครื่องรับเหรียญทั่วไป
    type               : "Coin Acceptor",
    technology         : paymentAcceptorTechnologyType.OFFLINE,
    supportedCurrencies: [CurrencyType.THB],
    minAmount          : 1.00,
    maxAmount          : 10.00,
    requiresMaintenance: true, // ช่างต้องเดินทางไปไขตู้เพื่อเอาเหรียญออกไหม
    hardwareInterface  : paymentAcceptorInterfaceType.PULSE
  },
  BILL_ACCEPTOR: {  // เครื่องรับธนบัตร
    type               : "Bill Acceptor",
    technology         : paymentAcceptorTechnologyType.OFFLINE,
    supportedCurrencies: [CurrencyType.THB],
    minAmount          : 20.00,
    maxAmount          : 1000.00,
    requiresMaintenance: true, // ช่างต้องเดินทางไปไขตู้เพื่อเอาเหรียญออกไหม
    hardwareInterface  : paymentAcceptorInterfaceType.SERIAL
  },
  QR_BOX: {         // กล่องสแกนรับเงินผ่าน QR Code ทุกชนิด
    type               : "QR Box",
    technology         : paymentAcceptorTechnologyType.ONLINE,
    supportedCurrencies: [CurrencyType.THB],
    minAmount          : 10.00,
    maxAmount          : 10000.00,
    requiresMaintenance: false, // ช่างต้องเดินทางไปไขตู้เพื่อเอาเหรียญออกไหม
    hardwareInterface  : paymentAcceptorInterfaceType.NETWORK
  },
  CARD_READER: {    // เครื่องอ่านบัตรธนาคาร บัตรเครดิต ฯลฯ
    type               : "Card Reader",
    technology         : paymentAcceptorTechnologyType.ONLINE,
    supportedCurrencies: [CurrencyType.THB],
    minAmount          : 1.00,
    maxAmount          : 10.00,
    requiresMaintenance: false, // ช่างต้องเดินทางไปไขตู้เพื่อเอาเหรียญออกไหม
    hardwareInterface  : paymentAcceptorInterfaceType.NETWORK
  },
  MEMBER_CARD_READER: { // เครื่องอ่านบัตรสมาชิกของร้านเท่านั้น
    type               : "Member Card Reader",
    technology         : paymentAcceptorTechnologyType.ONLINE,
    supportedCurrencies: [CurrencyType.THB],
    minAmount          : 1.00,
    maxAmount          : 10.00,
    requiresMaintenance: false, // ช่างต้องเดินทางไปไขตู้เพื่อเอาเหรียญออกไหม
    hardwareInterface  : paymentAcceptorInterfaceType.NETWORK
  }
} as const;

export type PaymentAcceptorType = keyof typeof MACHINE_PAYMENT_ACCEPTOR_TYPE;

@Entity("machine")
export class Machine {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 64, unique: true })
  machineId!: string;

  // ชื่อจริงของเครื่อง
  @Index()
  @Column({ type: "varchar", length: 255 })
  name!: string;

  // ชื่อเล่นของเครื่อง
  @Index()
  @Column({ type: "varchar", length: 255, nullable: true })
  alias!: string;

  // ชื่อรุ่นของเครื่อง
  @Index()
  @Column({ type: "varchar", length: 255 })
  model!: string;

  @Column({ type: "varchar", length: 800, nullable: true})
  imageUrl!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  paymentAcceptor!: Relation<PaymentAcceptorType>[];

  @Column({ type: "text", nullable: true })
  note!: string;

  @ManyToOne(() => Shop, (shop) => shop.machines, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "shopId", referencedColumnName: "id" })
  shop!: Relation<Shop>;

  @OneToMany(() => MachineTransaction, (tx) => tx.machine)
  transactions!: Relation<MachineTransaction>[];

  @Column({ type: "varchar", length: 128, nullable: true, select: false/*จะไม่ดึงขึ้นไปแสดงผลอัตโนมัติ ถ้าไม่ได้เจาะจงมาดึงไป*/})
  secretKey!: string;

  @Column( { type: "boolean", default: true } )
  enableSecretKey!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
};