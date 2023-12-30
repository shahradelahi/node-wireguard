import { Peer, PeerSchema, WgConfig } from '@/schema.ts';
import { clsx } from '@/utils/array.ts';
import base64 from '@/utils/base64.ts';
import { generateIPs } from '@/utils/ip.ts';
import { randomString } from '@/utils/random.ts';
import { hash } from '@litehex/node-checksum';
import { execaSync } from 'execa';
import { readFileSync } from 'fs';

export class WireGuardConfig {
  address: string[];
  listen: number;
  keys: WireGuardKeyPair;
  dns: string | undefined;
  mtu: number | undefined;

  preUp: string[] = [];
  postUp: string[] = [];
  preDown: string[] = [];
  postDown: string[] = [];

  peers: Map<string, WireGuardPeer>;

  constructor(c: {
    address: string | string[];
    listen: number;
    privateKey: string;
    dns?: string | undefined;
    mtu?: number | undefined;

    preUp?: string[] | undefined;
    postUp?: string[] | undefined;
    preDown?: string[] | undefined;
    postDown?: string[] | undefined;

    peers?: Peer[] | undefined;
  }) {
    this.address = Array.isArray(c.address) ? c.address : [c.address];
    this.listen = c.listen;
    this.keys = WireGuardKeyPair.generateFromPrivateKey(c.privateKey);
    this.dns = c.dns;
    this.mtu = c.mtu;

    this.preUp = c.preUp || [];
    this.postUp = c.postUp || [];
    this.preDown = c.preDown || [];
    this.postDown = c.postDown || [];

    this.peers = new Map();
    (c.peers || []).forEach((p) => {
      const peer = WireGuardPeer.from(p);
      this.peers.set(peer.keyPair.publicKey, peer);
    });
  }

  static fromFile(filePath: string): WireGuardConfig {
    const conf = readFileSync(filePath, 'utf-8');
    const lines = conf.split('\n');

    const server: WgConfig = {
      address: [],
      privateKey: '',
      publicKey: '',
      preSharedKey: '',
      listen: 0,
      dns: '',
      mtu: '',
      peers: []
    };

    let reachedPeers = false;
    for (const line of lines) {
      const [key, value] = line.split('=').map((s) => s.trim());
      const loweredKey = key.toLowerCase();

      if (reachedPeers) {
        console.log(key, value);
        if (key === '[Peer]') {
          server.peers.push({
            publicKey: '',
            privateKey: '', // it's okay to be empty because, we not using it on server
            preSharedKey: '',
            allowedIPs: []
          });
        }
        console.log(server.peers);
        if (loweredKey === 'publickey') {
          server.peers[server.peers.length - 1].publicKey = value;
        }

        if (loweredKey === 'presharedkey') {
          server.peers[server.peers.length - 1].preSharedKey = value;
        }

        if (loweredKey === 'allowedips') {
          if (value.includes(',')) {
            server.peers[server.peers.length - 1].allowedIPs?.push(
              ...value.replace(/\s/g, '').split(',')
            );
          } else {
            server.peers[server.peers.length - 1].allowedIPs?.push(value);
          }
        }

        if (loweredKey === 'persistentkeepalive') {
          server.peers[server.peers.length - 1].persistentKeepalive = parseInt(value);
        }
      }
      if (loweredKey === 'privatekey') {
        server.privateKey = value;
      }
      if (loweredKey === 'address') {
        server.address.push(value);
      }
      if (loweredKey === 'listenport') {
        server.listen = parseInt(value);
      }
      if (loweredKey === 'dns') {
        server.dns = value;
      }
      if (loweredKey === 'mtu') {
        server.mtu = value;
      }
      if (loweredKey === 'preup') {
        server.preUp = value;
      }
      if (loweredKey === 'predown') {
        server.preDown = value;
      }
      if (loweredKey === 'postup') {
        server.postUp = value;
      }
      if (loweredKey === 'postdown') {
        server.postDown = value;
      }
      if (loweredKey === 'publickey') {
        server.publicKey = value;
      }
      // if (key === '[Peer]') {
      //   console.log('reached peers');
      //   reachedPeers = true;
      // }
    }

    return new WireGuardConfig({
      address: server.address,
      privateKey: server.privateKey,
      listen: server.listen,
      dns: server.dns,
      mtu: server.mtu ? parseInt(server.mtu) : undefined,
      preUp: server.preUp ? server.preUp.split(',') : undefined,
      postUp: server.postUp ? server.postUp.split(',') : undefined,
      preDown: server.preDown ? server.preDown.split(',') : undefined,
      postDown: server.postDown ? server.postDown.split(',') : undefined,
      peers: server.peers
    });
  }

  addPeer(p: Partial<Peer>): WireGuardPeer {
    const freeAddress = this.nextFreeAddress();

    if (!freeAddress) throw new Error('No free address found. range is full');

    const peer = WireGuardPeer.from(
      PeerSchema.parse({
        allowedIPs: [`${freeAddress}/32`],
        ...p
      })
    );
    this.peers.set(peer.keyPair.publicKey, peer);
    return peer;
  }

  getUsedIPs(): string[] {
    const usedAddress = this.iteratePeers()
      .map((p) => p.allowedIPs)
      .flat();

    return usedAddress;
  }

  nextFreeAddress(): string | undefined {
    for (const base of this.address) {
      for (const addr of generateIPs(base)) {
        if (!this.getUsedIPs().includes(addr)) {
          return addr;
        }
      }
    }
  }

  iteratePeers(): WireGuardPeer[] {
    return Array.from(this.peers.values());
  }

  toHash(): string {
    return hash('sha256', this.toString());
  }

  toString(): string {
    return clsx(
      `Address = ${this.address}`,
      `ListenPort = ${this.listen}`,
      `PrivateKey = ${this.keys.privateKey}`,
      this.mtu && `MTU = ${this.mtu}`,
      this.dns && `DNS = ${this.dns}`,
      !!(this.preUp.length || this.postUp.length || this.preDown.length || this.postDown.length) &&
        '',
      this.preUp.length ? `PreUp = ${this.preUp.join(',')}` : null,
      this.postUp.length ? `PostUp = ${this.postUp.join(',')}` : null,
      this.preDown.length ? `PreDown = ${this.preDown.join(',')}` : null,
      this.postDown.length ? `PostDown = ${this.postDown.join(',')}` : null,
      '',
      this.iteratePeers()
        .map((p) => p.toString())
        .join('\n')
    ).join('\n');
  }

  peerConfigStr(publicKey: string, overwrite?: Partial<Peer>): string {
    const peer = this.peers.get(publicKey);
    if (!peer) throw new Error('Peer not found');

    const endpoint = overwrite?.endpoint || peer.endpoint;
    if (!endpoint) throw new Error('Endpoint not specified');

    return clsx(
      `[Interface]`,
      `PrivateKey = ${peer.keyPair.privateKey}`,
      `Address = ${peer.allowedIPs}`,
      `[Peer]`,
      `PublicKey = ${peer.keyPair.publicKey}`,
      `AllowedIPs = ${peer.allowedIPs}`,
      peer.persistentKeepalive && `PersistentKeepalive = ${peer.persistentKeepalive}`,
      `Endpoint = ${endpoint}`
    ).join('\n');
  }
}

export class WireGuardPeer {
  allowedIPs: string[];
  persistentKeepalive: number | undefined;
  endpoint: string | undefined;
  keyPair: WireGuardKeyPair;

  constructor(
    allowedIPs: string[] | undefined,
    persistentKeepalive: number | undefined,
    endpoint: string | undefined,
    keyPair: WireGuardKeyPair
  ) {
    this.allowedIPs = allowedIPs || ['0.0.0.0/0', '::/0'];
    this.persistentKeepalive = persistentKeepalive;
    this.endpoint = endpoint;
    this.keyPair = keyPair;
  }

  static from(peer: Peer): WireGuardPeer {
    return new WireGuardPeer(
      peer.allowedIPs,
      Number(peer.persistentKeepalive),
      peer.endpoint,
      new WireGuardKeyPair(peer.privateKey, peer.preSharedKey)
    );
  }

  toString() {
    return clsx(
      `[Peer]`,
      `PublicKey = ${this.keyPair.publicKey}`,
      `AllowedIPs = ${this.allowedIPs}`,
      this.persistentKeepalive && `PersistentKeepalive = ${this.persistentKeepalive}`,
      this.endpoint && `Endpoint = ${this.endpoint}`
    ).join('\n');
  }

  revokeKeys() {
    this.keyPair = WireGuardKeyPair.generate();
  }
}

export class WireGuardKeyPair {
  publicKey: string;
  privateKey: string;
  preSharedKey: string | undefined;

  constructor(privateKey: string, preSharedKey?: string) {
    this.privateKey = privateKey;
    this.publicKey = WireGuardKeyPair.generatePublicKey(privateKey);
    this.preSharedKey = preSharedKey;
  }

  static generate(): WireGuardKeyPair {
    const privateKey = base64.encode(randomString(32));
    return new WireGuardKeyPair(privateKey, base64.encode(randomString(32)));
  }

  static generateFromPrivateKey(privateKey: string): WireGuardKeyPair {
    const publicKey = base64.encode(randomString(32));
    return new WireGuardKeyPair(publicKey, privateKey);
  }

  static generatePublicKey(privateKey: string): string {
    const { stdout: publicKey } = execaSync(`echo ${privateKey} | wg pubkey`, {
      shell: true
    });
    return publicKey;
  }
}
