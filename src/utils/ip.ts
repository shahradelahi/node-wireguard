import { IPV4_REGEX, IPV6_REGEX } from '@/constants.ts';

export function isValidIPv4(str: string): boolean {
  return IPV4_REGEX.test(str);
}

export function isValidIPv6(str: string): boolean {
  return IPV6_REGEX.test(str);
}

export function isValidIPv4Range(str: string): boolean {
  if (!str.includes('/')) {
    return false;
  }
  const [addr, subnet] = str.split('/');
  if (!isValidIPv4(addr)) {
    return false;
  }

  const subnetNum = Number(subnet);
  if (isNaN(subnetNum)) {
    return false;
  }
  return isPrivateIP(addr) && subnetNum >= 8 && subnetNum <= 32;
}

/**
 * Private IP Address Identifier in Regular Expression
 *
 * 127.  0.0.0 – 127.255.255.255     127.0.0.0 /8
 *  10.  0.0.0 –  10.255.255.255      10.0.0.0 /8
 * 172. 16.0.0 – 172. 31.255.255    172.16.0.0 /12
 * 192.168.0.0 – 192.168.255.255   192.168.0.0 /16
 */
export function isPrivateIP(ip: string) {
  const ipRegex = /^(127\.)|(10\.)|(172\.1[6-9]\.)|(172\.2[0-9]\.)|(172\.3[0-1]\.)|(192\.168\.)/;
  return ipRegex.test(ip);
}

export function isPrivateIPRange(ip: string) {
  if (!isValidIPv4Range(ip)) {
    return false;
  }

  const [addr] = ip.split('/');
  return isPrivateIP(addr);
}

export function* generateIPs(ipRange: string): Generator<string, void, unknown> {
  const [baseIP, subnetMask] = ipRange.split('/');
  const subnetBits = parseInt(subnetMask, 10);
  const hostBits = 32 - subnetBits;
  const maxHosts = 2 ** hostBits;

  // Convert the base IP to a number
  let currentIP = ipToNumber(baseIP);

  // Generate IPs
  for (let i = 1; i < maxHosts - 1; i++) {
    yield numberToIP(currentIP + i);
  }
}

// Helper function to convert IP to number
function ipToNumber(ip: string): number {
  return ip
    .split('.')
    .reduce((acc, octet, index) => acc + parseInt(octet, 10) * 256 ** (3 - index), 0);
}

// Helper function to convert number to IP
function numberToIP(num: number): string {
  const octets = [];
  for (let i = 3; i >= 0; i--) {
    octets.push(Math.floor(num / 256 ** i));
    num %= 256 ** i;
  }
  return octets.join('.');
}
