import { AppDataSource } from '../db/data-source.js';
import { v7 as uuidv7 } from 'uuid';
import { MachineTransaction, transactionItemDetails, transactionPaymentAcceptor, transactionType } from '../entities/MachineTransaction.js';

export interface PendingMachineTransactionPayload {
  machineId      : string;
  type           : transactionType;
  totalAmount    : number;
  paymentAcceptor: transactionPaymentAcceptor[];
  itemDetails    : transactionItemDetails[];
};

class MachineTransactionBatchQueue {
  private queue: MachineTransaction[] = [];
  private readonly maxBatchSize = 20;       // ครบ 20 รายการเมื่อไหร่ สั่งบันทึกทันที
  private readonly flushIntervalMs = 10000;  // หรือทุก 5 วินาที แม้ไม่ครบ 20 รายการ
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

  public add(data: PendingMachineTransactionPayload) {
    const tx = new MachineTransaction();
    tx.machineId       = data.machineId;
    tx.transactionId   = uuidv7();
    tx.type            = data.type;
    tx.totalAmount     = data.totalAmount;
    tx.paymentAcceptor = data.paymentAcceptor;
    tx.itemDetails     = data.itemDetails;

    this.queue.push(tx);

    console.log('Add new data to queue.');

    // ถ้าคิวเต็มโควตา ให้ Flush ลง DB ทันทีโดยไม่ต้องรอ Timer
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  public async flush() {
    if (this.queue.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    // ตัดก้อนข้อมูลออกจากคิวเพื่อเตรียมบันทึก
    const batchToInsert = this.queue.splice(0, this.maxBatchSize);

    try {
      const repo = AppDataSource.getRepository(MachineTransaction);
      // TypeORM insert รองรับ Array: ยิง INSERT ก้อนเดียวพร้อมกันหลายแถว
      await repo.insert(batchToInsert);
      console.log('Flush data to MachineTransaction success.');
    } catch (error) {
      console.error('[TransactionQueue Error]:', error);
      // หากเกิดข้อผิดพลาด ให้นำข้อมูลกลับเข้าหัวแถวของคิว เพื่อลองใหม่ในรอบถัดไป
      this.queue.unshift(...batchToInsert);
      console.error('Error to flush to MachineTransaction.');
    } finally {
      this.isFlushing = false;
    }
  }
}

export const MachineTransactionQueue = new MachineTransactionBatchQueue();