import { AppDataSource } from '../db/data-source.js';
import { 
  MachineSystemLog, 
  MachineSystemLogLevel, 
  MachineSystemLogEventType, 
  MachineSystemLogBootReason 
} from '../entities/MachineSystemLog.js';

export interface PendingMachineSystemLogPayload {
  machineId       : string;
  logLevel?       : MachineSystemLogLevel;
  eventType       : MachineSystemLogEventType;
  bootReason?     : MachineSystemLogBootReason | null;
  firmwareVersion : string;
  uptime          : number;
  ipAddress?      : string | null;
  details?        : Record<string, any> | null;
}

class MachineSystemLogBatchQueue {
  private queue: MachineSystemLog[] = [];
  private readonly maxBatchSize = 50;       // Log มักมีขนาดเล็ก ปรับขนาดก้อนเป็น 50 รายการ
  private readonly flushIntervalMs = 10000; // ระบายคิวทุก 10 วินาที
  private isFlushing = false;

  constructor() {
    // ตั้งเวลารัน Background Worker คอยระบายคิวลง DB
    this.scheduleNextFlush();
  }

  private scheduleNextFlush() {
    setTimeout(async () => {
      await this.flush();
      this.scheduleNextFlush(); // รอรอบเดิมเสร็จก่อน ค่อยเริ่มนับ
    }, this.flushIntervalMs);
  }

  public add(data: PendingMachineSystemLogPayload) {
    const log = new MachineSystemLog();
    log.machineId       = data.machineId;
    log.logLevel        = data.logLevel ?? MachineSystemLogLevel.INFO;
    log.eventType       = data.eventType;
    log.bootReason      = data.bootReason ?? null;
    log.firmwareVersion = data.firmwareVersion;
    log.uptime          = data.uptime;
    log.ipAddress       = data.ipAddress ?? null;
    log.details         = data.details ?? null;

    this.queue.push(log);

    console.log('Add new data to queue.');

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  public async flush() {
    if (this.queue.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const batchToInsert = this.queue.splice(0, this.maxBatchSize);

    try {
      const repo = AppDataSource.getRepository(MachineSystemLog);
      await repo.insert(batchToInsert);
      console.log('Flush data to MachineSystemLog success.');
    } catch (error) {
      console.error('[SystemLogQueue Error]:', error);
      // หากเกิดข้อผิดพลาด คืนข้อมูลกลับเข้าหัวแถวเพื่อรอยิงซ้ำรอบหน้า
      this.queue.unshift(...batchToInsert);
      console.error('Error to flush to MachineSystemLog.');
    } finally {
      this.isFlushing = false;
    }
  }
}

export const MachineSystemLogQueue = new MachineSystemLogBatchQueue();