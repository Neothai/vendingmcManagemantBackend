export interface DBPagination {
  take: number;
  skip: number;
};

export enum DBQueryDataOption {
  FULL     = "full",
  OVERVIEW = "overview"
}

export const calcPagination = (page: number, limit: number): DBPagination => {
  const pNum = Math.max(1, Number(page) || 1);
  const take = Math.min(1000, Math.max(1, Number(limit) || 10)); // จำกัดดึงได้ไม่เกิน 1000 แถวต่อครั้ง
  const skip = (pNum - 1) * take;

  return {take: take, skip: skip} as DBPagination;
};