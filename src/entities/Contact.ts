import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Check, Index } from "typeorm";
import type { Relation } from "typeorm";
import { User } from "./User.js";
import { Shop } from "./Shop.js";
import { Headquarters } from "./Headquarters.js";

// ข้อมูลสำหรับติดต่อ ใช้กับคน, สถานที่
@Entity("contact")
@Check(`
  ("userId" IS NOT NULL AND "shopId" IS NULL AND "headquartersId" IS NULL) OR
  ("userId" IS NULL AND "shopId" IS NOT NULL AND "headquartersId" IS NULL) OR
  ("userId" IS NULL AND "shopId" IS NULL AND "headquartersId" IS NOT NULL)
`)
export class Contact {
  @PrimaryGeneratedColumn()
  id!: number;

  // ชื่อจริง ไม่ใช่ยูสเซอร์เนม
  @Column({ type: "varchar", length: 1024 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;
  
  @Column("varchar", { array: true, default: "{}" })
  phone!: string[];

  @Column({ type: "varchar", length: 255, nullable: true })
  lineId!: string;

  // Foreign Key ชี้กลับหา User (User PK คือ idx)
  @OneToOne(() => User, (user) => user.contact, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "userId", referencedColumnName: "idx" })
  user?: Relation<User> | null;

  // Foreign Key ชี้กลับหา Shop (Shop PK คือ id)
  @OneToOne(() => Shop, (shop) => shop.contact, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "shopId", referencedColumnName: "id" })
  shop?: Relation<Shop> | null;

  @OneToOne(() => Headquarters, (hq) => hq.contact, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "headquartersId", referencedColumnName: "id" })
  headquarters?: Relation<Headquarters> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
};