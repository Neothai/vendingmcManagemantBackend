import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne, ManyToOne, JoinColumn, ManyToMany, JoinTable } from "typeorm";
import type { Relation } from "typeorm";
import { Shop } from "./Shop.js";
import { Contact } from "./Contact.js";
import { Address } from "./Address.js";
import { User } from "./User.js";

@Entity("headquarters")
export class Headquarters {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true })
  hqId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  // 1 สำนักงานใหญ่ มีได้หลายสาขา (Shop)
  @OneToMany(() => Shop, (shop) => shop.headquarters)
  shops!: Relation<Shop>[];

  // เชื่อมกับ Contact และ Address ด้วย Reverse FK เดิม
  @OneToOne(() => Contact, (contact) => contact.headquarters, { cascade: ["insert", "update"] })
  contact!: Relation<Contact>;

  @OneToOne(() => Address, (address) => address.headquarters, { cascade: ["insert", "update"] })
  address!: Relation<Address>;

  // Owner มีได้แค่ 1 คน
  @ManyToOne(() => User, (user) => user.ownedHeadquarters, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownerId", referencedColumnName: "idx" })
  owner!: Relation<User>;

  // Partner มีได้หลายคน
  @ManyToMany(() => User)
  @JoinTable({ name: "hq_partners", joinColumn: { name: "headquartersId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  partners!: Relation<User>[];

  // Manager มีได้หลายคน
  @ManyToMany(() => User)
  @JoinTable({ name: "hq_managers", joinColumn: { name: "headquartersId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  managers!: Relation<User>[];

  // Staff มีได้หลายคน
  @ManyToMany(() => User)
  @JoinTable({ name: "hq_staffs", joinColumn: { name: "headquartersId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  staffs!: Relation<User>[];

  @Column({ type: "text", nullable: true })
  note!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}