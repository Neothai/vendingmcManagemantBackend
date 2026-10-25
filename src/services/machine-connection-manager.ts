import { WebSocket } from 'ws';

interface vendingMachineSession {
  ws: WebSocket;
  ca: Date; // connectedAt
};

export const vendingMachineWsCode = {
  CONN_BUSY: { code: 4001, reason: 'Another machine is connected.' },
  CONN_TIMO: { code: 4002, reason: 'Machine is not receive ping in time.' },
  CONN_REJT: { code: 4003, reason: 'Machine connection reject.' }
};

class VendingMachineConnManager {
  private activeMachines = new Map<string, vendingMachineSession>();

  public register = (machineId: string, ws: WebSocket, terminateOld = false): boolean => {
    const existing = this.activeMachines.get(machineId);

    if (existing) {
      console.warn(`[Duplicate Connection]: Machine ${machineId} attempted reconnect.`);
      if (!terminateOld) return false;
      
      console.log('Terminate old machine connection.');
      existing.ws.close(vendingMachineWsCode.CONN_REJT.code, vendingMachineWsCode.CONN_REJT.reason);
      this.activeMachines.delete(machineId);
    }

    this.activeMachines.set(machineId, { ws, ca: new Date() });
    return true;
  };

  // รับ parameter ws เพิ่ม เพื่อตรวจสอบว่าเป็นเจ้าของ session ใน Map จริงๆ ก่อนลบ
  public remove(machineId: string, currentWs?: WebSocket) {
    const existing = this.activeMachines.get(machineId);
    if (!existing) return;

    // ถ้ามีการส่ง ws เข้ามา ต้องตรวจว่าเป็น Socket เดียวกัน ถึงจะมีสิทธิ์ลบออกจาก Map
    if (currentWs && existing.ws !== currentWs) {
      return;
    }

    this.activeMachines.delete(machineId);
  }

  public isOnline(machineId: string): boolean {
    return this.activeMachines.has(machineId);
  }

  public getWs(machineId: string): WebSocket | undefined {
    return this.activeMachines.get(machineId)?.ws;
  }

  public sendMsgToMachine(machineId: string, payload: Record<string, any>): boolean {
    const session = this.activeMachines.get(machineId);
    if (session && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(payload));
      return true;
    }
    return false; // กรณีตู้ไม่ได้ต่ออยู่ หรือ WebSocket หลุดไปแล้ว
  }
}

export const machineConnManager = new VendingMachineConnManager();