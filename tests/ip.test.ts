import { generateIPs } from '@/utils/ip.ts';
import { expect } from 'chai';

describe('Basics', () => {
  it('returns every ip in given range', () => {
    const ipRange = '192.168.1.0/24';
    const generator = generateIPs(ipRange);

    const ips = Array.from(generator);

    expect(ips).to.have.lengthOf(254);
    expect(ips[0]).to.equal('192.168.1.1');
  });
});
