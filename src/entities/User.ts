import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from "typeorm";
import type { Relation } from "typeorm";
import { Contact } from "./Contact.js";
import { Address } from "./Address.js";
import { Shop } from "./Shop.js";
import { Headquarters } from "./Headquarters.js";

export enum userRoleType {
  ADMIN   = "admin",    // ผู้ดูแลระบบ
  OWNER   = "owner",    // เจ้าของร้าน
  PARTNER = "partner",  // หุ้นส่วนของเจ้าของร้าน
  MANAGER = "manager",  // ผู้จัดการร้าน
  STAFF   = "staff",    // พนักงานร้าน
  MEMBER  = "member",   // ลูกค้าที่เป็นสมาชิกของร้าน
  GUEST   = "guest",    // ลูกค้าทั่วไป
};

@Entity("user")
export class User {
  @PrimaryGeneratedColumn()
  idx!: number;

  @Index()
  @Column({ type: "varchar", length: 64, unique: true })
  uid!: string;

  @Index()
  @Column({ type: "varchar", length: 1024 })
  userName!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @OneToOne(() => Contact, (contact) => contact.user, { cascade: ["insert", "update"] })
  contact!: Relation<Contact>;

  @OneToOne(() => Address, (address) => address.user, { cascade: ["insert", "update"] })
  address!: Relation<Address>;

  @Column({type: "enum", enum: userRoleType, default: userRoleType.GUEST})
  role!: userRoleType;

  @Column({ type: "varchar", length: 800, nullable: true })
  imageUrl!: string;

  @OneToMany(() => Headquarters, (hq) => hq.owner)
  ownedHeadquarters!: Relation<Headquarters>[];

  @OneToMany(() => Shop, (shop) => shop.owner)
  ownedShops!: Relation<Shop>[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
};