import { isObject } from '@/utils/object.ts';

export function isJson(str: string | object): boolean {
  if (typeof str === 'object' && isObject(str)) {
    return true;
  }
  try {
    return typeof str === 'string' && JSON.parse(str);
  } catch (ex) {
    return false;
  }
}

function isSerializable(v: any): boolean {
  if (v === null || v === undefined) {
    return true;
  }
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return true;
  }
  if (Array.isArray(v)) {
    return v.every(isSerializable);
  }
  if (typeof v === 'object') {
    return Object.values(v).every(isSerializable);
  }
  return false;
}
