import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Check, Index } from "typeorm";
import type { Relation } from "typeorm";
import { User } from "./User.js";
import { Shop } from "./Shop.js";
import { Headquarters } from "./Headquarters.js";

@Entity("address")
@Check(`
  ("userId" IS NOT NULL AND "shopId" IS NULL AND "headquartersId" IS NULL) OR
  ("userId" IS NULL AND "shopId" IS NOT NULL AND "headquartersId" IS NULL) OR
  ("userId" IS NULL AND "shopId" IS NULL AND "headquartersId" IS NOT NULL)
`)
export class Address {
  @PrimaryGeneratedColumn()
  id!: number;

  // ชื่อของที่อยู่ เช่น บ้านใกล้ทางข้ามถนน
  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "double precision", nullable: true })
  latitude!: number;

  @Column({ type: "double precision", nullable: true })
  longitude!: number;

  // เก็บรายละเอียดที่อยู่ เช่น "ชั้น 1 หน้าลิฟต์อาคาร A, เลขที่ 123/45 ซอยสุขุมวิท 21"
  @Column({ type: "varchar", length: 1024, nullable: true })
  details!: string;

  @Column({ type: "varchar", length: 255 })
  subDistrict!: string;

  @Column({ type: "varchar", length: 255 })
  district!: string;

  @Column({ type: "varchar", length: 255 })
  province!: string;

  @Column({ type: "varchar", length: 64 })
  zipCode!: string;

  @Column("varchar", { array: true, default: "{}" })
  imageUrls!: string[];

  @Column({ type: "text", nullable: true })
  note!: string;

  @OneToOne(() => User, (user) => user.address, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "userId", referencedColumnName: "idx" })
  user?: Relation<User> | null;

  @OneToOne(() => Shop, (shop) => shop.address, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "shopId", referencedColumnName: "id" })
  shop?: Relation<Shop> | null;

  @OneToOne(() => Headquarters, (hq) => hq.address, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "headquartersId", referencedColumnName: "id" })
  headquarters?: Relation<Headquarters> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
};