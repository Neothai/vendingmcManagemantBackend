import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import type { Relation } from "typeorm";
import { Machine, PaymentAcceptorType } from "./Machine.js";

export enum transactionType {
  INCOME  = "Income",
  OUTCOME = "Outcome",
  CHANGE  = "Change"
};

export interface transactionPaymentAcceptor {
  type  : PaymentAcceptorType;
  amount: number;
};

export interface transactionItemDetails {
  itemCode : string;
  itemValue: number;
  itemPcs  : number;
}

@Entity("machine_transaction")
export class MachineTransaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 64 })
  transactionId!: string;

  @Index()
  @Column({ type: "varchar", length: 64, nullable: true })
  machineId!: string | null;

  @Column({ type: "enum",  enum: transactionType})
  type!: transactionType;

  /* ยอดรวมทั้งหมด จะแบ่งเป็น 3 กรณี
    1. กรณี income จะเป็นยอดรวมทั้งหมดที่รับมาจากเครื่องรับเงินทุกประเภท
    2. กรณี outcome จะเป็นจำนวนสินค้าที่จ่ายออก เช่น น้ำ 2 ขวด ขนม 1 ถุง รวมเป็น 3
    3. กรณี change จะเป็นยอดเงินทอนที่ทอนออกไป
  */
  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount!: number;

  @Column({ type: "jsonb", nullable: true })
  paymentAcceptor!: transactionPaymentAcceptor[];

  @Column({ type: "jsonb", nullable: true })
  itemDetails!: transactionItemDetails[];

  @ManyToOne(() => Machine, (mc) => mc.transactions, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "machineId", referencedColumnName: "machineId" })
  machine!: Relation<Machine> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
};