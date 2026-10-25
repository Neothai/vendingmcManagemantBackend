class vendingMachinePaymentRecord {
  private activeLists = new Map<string, string>(); // <orderId, machineId>

  public new = (machineId: string, orderId: string): boolean => {
    const existing = this.activeLists.get(orderId);

    if(existing) {
      console.warn(`[vendingMachinePayment]: Duplicate machineId for orderId = ${orderId}`);
      return false;
    }

    this.activeLists.set(orderId, machineId);
    return true;
  };

  public getMachineId = (orderId: string): string | undefined => {
    return this.activeLists.get(orderId);
  };

  public remove = (orderId: string) => {
    const existing = this.activeLists.get(orderId);
    if(existing) this.activeLists.delete(orderId);
  };
};

export const machinePaymentRecord = new vendingMachinePaymentRecord();