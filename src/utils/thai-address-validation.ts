import subDistricts from './thai-address-lists/subDistricts.json' with { type: 'json' };
import districts    from './thai-address-lists/districts.json' with { type: 'json' };
import provinces    from './thai-address-lists/provinces.json' with { type: 'json' };
import { isEmptyString, isNullNumber } from './input-validation.js';

interface SubDistrict {
  id        : number;
  zipCode   : number;
  nameTh    : string;
  nameEn    : string;
  districtId: number;
  lat       : number | null;
  long      : number | null;
}

export const verifyProvinces = (name: string): boolean => {
  if (isEmptyString(name)) return false;
  const cleanName = name.trim();

  return provinces.some((province: any) => {
    return province.nameTh.trim() === cleanName;    
  });
};

export const verifyDistricts = (name: string): boolean => {
  if (isEmptyString(name)) return false;
  const cleanName = name.trim();

  return districts.some((district: any) => {
    return district.nameTh.trim() === cleanName;    
  });
};

export const verifySubDistricts = (name: string, zipCode?: string): boolean => {
  if (isEmptyString(name)) return false;
  const cleanName = name.trim();
  const checkZipCode = zipCode ?? '';

  return subDistricts.some((subDistrict: any) => {
    return subDistrict.nameTh.trim() === cleanName && (!isEmptyString(checkZipCode) ? (String(subDistrict.zipCode) === zipCode) : true);
  });
};

const subDistrictMap = new Map<number, string>(
  (subDistricts as SubDistrict[]).map(item => [item.id, String(item.zipCode)])
);

export const getZipCodeFromSubDistrictsId = (subDistrictsId: number): string => {
  if (isNullNumber(subDistrictsId)) return '';
  return subDistrictMap.get(subDistrictsId) ?? '';
};

export const verifyThaiAddress = (province: string, district: string, subDistrict: string, zipCode?: string): boolean => {
  return verifyProvinces(province) && verifyDistricts(district) && verifySubDistricts(subDistrict, zipCode);
};