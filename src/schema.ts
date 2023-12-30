import { IPV4_REGEX } from '@/constants.ts';
import { isValidIPv4, isValidIPv4Range } from '@/utils/ip.ts';
import { isBetween } from '@/utils/number.ts';
import { z } from 'zod';

export const AddressSchema = z
  .string()
  .min(1, { message: 'Address cannot be empty' })
  .refine(
    (v) => {
      if (!v.includes(',')) {
        return isValidIPv4(v);
      }
      const ips = v.split(',');
      return ips.every(isValidIPv4);
    },
    {
      message: 'Address must be a private IP address range'
    }
  );

export const AddressRangeSchema = z
  .string()
  .min(1, { message: 'Address cannot be empty' })
  .refine(
    (v) => {
      if (!v.includes(',')) {
        return isValidIPv4Range(v);
      }
      const ips = v.split(',');
      return ips.every(isValidIPv4Range);
    },
    {
      message: 'Address must be a private IP address range'
    }
  );

export const PortSchema = z
  .number()
  .min(1, { message: 'Port cannot be empty' })
  .refine((v) => v > 0 && v < 65535, {
    message: 'Port must be a valid port number'
  });

export const DnsSchema = z
  .string()
  .regex(IPV4_REGEX, {
    message: 'DNS must be a valid IPv4 address'
  })
  .optional();

export const MtuSchema = z
  .string()
  .refine((d) => !isNaN(Number(d)), {
    message: 'MTU must be a number'
  })
  .refine((d) => !isBetween(Number(d), 1, 1500), {
    message: 'MTU must be between 1 and 1500'
  })
  .default('1350')
  .optional();

export const WgKeySchema = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
  preSharedKey: z.string().optional()
});

export type WgKey = z.infer<typeof WgKeySchema>;

export const PeerSchema = z
  .object({
    preSharedKey: z.string().nullable(),
    allowedIPs: z.array(AddressRangeSchema).optional(),
    persistentKeepalive: z.number().optional(),
    endpoint: z.string().optional()
  })
  .merge(WgKeySchema);

export type Peer = z.infer<typeof PeerSchema>;

export type PeerList = Peer[];

export const WgConfigSchema = z
  .object({
    address: z.array(AddressSchema),
    listen: PortSchema,
    dns: DnsSchema,
    mtu: MtuSchema,
    preUp: z.string().optional(),
    postUp: z.string().optional(),
    preDown: z.string().optional(),
    postDown: z.string().optional(),
    peers: z.array(PeerSchema)
  })
  .merge(WgKeySchema);

export type WgConfig = z.infer<typeof WgConfigSchema>;
