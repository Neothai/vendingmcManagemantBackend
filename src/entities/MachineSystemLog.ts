import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { Relation } from "typeorm";0
import { Machine } from "./Machine.js";

export enum MachineSystemLogLevel {
  INFO  = "INFO",
  WARN  = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL"
};

export enum MachineSystemLogEventType {
  BOOT       = "BOOT",
  WDT        = "WATCHDOG",
  PWR        = "POWER",
  OTA        = "OTA",
  CFG        = "CONFIG",
  NETWORK    = "NETWORK",
  HWIO       = "HARDWARE_IO",
  SYS_ACCESS = "SYSTEM_ACCESS"
};

export enum MachineSystemLogBootReason {
  POR = "POWERON_RESET",
  WDT = "WATCHDOG_RESET",
  BOT = "BROWNOUT",
  SWR = "SOFTWARE_RESET"
};

@Entity("machine_system_log")
export class MachineSystemLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 64 })
  machineId!: string;

  @Column({ type: "enum", enum: MachineSystemLogLevel, default: MachineSystemLogLevel.INFO })
  logLevel!: MachineSystemLogLevel;

  @Column({ type: "enum", enum: MachineSystemLogEventType })
  eventType!: MachineSystemLogEventType;

  @Column({ type: "enum", enum: MachineSystemLogBootReason, nullable: true })
  bootReason!: MachineSystemLogBootReason | null;

  @Column({ type: "varchar", length: 32 })
  firmwareVersion!: string;

  @Column({ type: "bigint" })
  uptime!: number;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ type: "jsonb", nullable: true })
  details!: Record<string, any> | null;

  @ManyToOne(() => Machine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "machineId", referencedColumnName: "machineId" })
  machine!: Relation<Machine>

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
};