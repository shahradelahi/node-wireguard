export function isObject(obj: object) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function removeUndefined<T extends object>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
