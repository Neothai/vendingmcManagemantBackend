export const isEmptyString = (str: string): boolean => {
  return str === null || str === undefined || str.trim().length === 0;
};

export const isNullNumber = (num: number, zeroCheck = false): boolean => {
  return num === null || num === undefined || (zeroCheck ? (Number(num) === 0.0) : false) || isNaN(Number(num));
};

export const isNotBool = (bool: boolean): boolean => {
  return (typeof bool !== 'boolean') || bool === null || bool === undefined; 
};

export const isNotArray = (arr: Array<any>, emptyArrayCheck = false): boolean => {
  return !arr || !Array.isArray(arr) || (emptyArrayCheck ? (arr.length === 0) : false);
};

export const isNotValueOf = (targetObject: object, input: any): boolean => {
  return !Object.values(targetObject).includes(input);
};

export const isNotkeyOf = (targetObject: object, input: any): boolean => {
  return !Object.keys(targetObject).includes(input);
};