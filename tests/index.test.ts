import { WireGuardConfig, WireGuardKeyPair } from '@/index.ts';
import { expect } from 'chai';

describe('WireGuard Config', () => {
  it('should Generate a Basic Config', () => {
    const intKeys = WireGuardKeyPair.generate();
    const conf = new WireGuardConfig({
      address: '10.10.1.0/24',
      privateKey: intKeys.privateKey,
      listen: 51820,
      dns: '1.1.1.1'
    });

    const pKeys = WireGuardKeyPair.generate();
    conf.addPeer({
      privateKey: pKeys.privateKey,
      publicKey: pKeys.publicKey
    });

    console.log(conf.toString());
    console.log('');
    console.log(conf.toHash());

    expect(conf.peers.size).to.equal(1);

    const writtenPeer = conf.peers.get(pKeys.publicKey);
    expect(writtenPeer).to.not.be.undefined;
    expect(writtenPeer?.allowedIPs).to.have.members(['10.10.1.1/32']);
  });

  it('should Load a Config File', () => {
    const conf = WireGuardConfig.fromFile('./tests/test.conf');
    console.log(conf);
  });
});
