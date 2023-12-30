export function clsx(...args: any[]): (string | number)[] {
  return args.filter((arg) => typeof arg === 'string' || (typeof arg === 'number' && !isNaN(arg)));
}
