import { Column, CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { Relation } from "typeorm";
import { Contact } from "./Contact.js";
import { Address } from "./Address.js";
import { Machine } from "./Machine.js";
import { User } from "./User.js";
import { Headquarters } from "./Headquarters.js";

@Entity("shop")
export class Shop {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 64, unique: true })
  shopId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @OneToOne(() => Contact, (contact) => contact.shop, { cascade: ["insert", "update"] })
  contact!: Relation<Contact>;

  @OneToOne(() => Address, (address) => address.shop, { cascade: ["insert", "update"] })
  address!: Relation<Address>;

  @ManyToOne(() => Headquarters, (hq) => hq.shops, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "headquartersId", referencedColumnName: "id" })
  headquarters!: Relation<Headquarters> | null;

  @ManyToOne(() => User, (user) => user.ownedShops, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "ownerId", referencedColumnName: "idx" })
  owner!: Relation<User>;

  @ManyToMany(() => User)
  @JoinTable({ name: "shop_partners", joinColumn: { name: "shopId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  partners!: Relation<User>[];

  @ManyToMany(() => User)
  @JoinTable({ name: "shop_managers", joinColumn: { name: "shopId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  managers!: Relation<User>[];

  @ManyToMany(() => User)
  @JoinTable({ name: "shop_staffs", joinColumn: { name: "shopId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  staffs!: Relation<User>[];

  @ManyToMany(() => User)
  @JoinTable({ name: "shop_members", joinColumn: { name: "shopId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  members!: Relation<User>[];

  @ManyToMany(() => User)
  @JoinTable({ name: "shop_guests", joinColumn: { name: "shopId", referencedColumnName: "id" }, inverseJoinColumn: { name: "userId", referencedColumnName: "idx" }})
  guests!: Relation<User>[];

  @OneToMany(() => Machine, (mc) => mc.shop)
  machines!: Relation<Machine>[];

  @Column({ type: "varchar", length: 800, nullable: true})
  imageUrl!: string;

  @Column({ type: "text", nullable: true })
  note!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
};