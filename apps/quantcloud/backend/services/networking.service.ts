import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface LoadBalancer {
  id: string;
  name: string;
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash';
  targets: LoadBalancerTarget[];
  healthCheck: HealthCheck;
  region: string;
  status: 'active' | 'provisioning' | 'inactive';
  createdAt: Date;
}

export interface LoadBalancerTarget {
  id: string;
  address: string;
  port: number;
  weight: number;
  healthy: boolean;
}

export interface HealthCheck {
  path: string;
  interval: number;
  timeout: number;
  unhealthyThreshold: number;
}

export interface DNSConfig {
  id: string;
  domain: string;
  records: DNSRecord[];
  createdAt: Date;
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  name: string;
  value: string;
  ttl: number;
}

export interface VPN {
  id: string;
  name: string;
  type: 'site-to-site' | 'point-to-site';
  status: 'active' | 'provisioning' | 'inactive';
  endpoint: string;
  cidr: string;
  createdAt: Date;
}

export interface Firewall {
  id: string;
  rules: FirewallRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FirewallRule {
  id: string;
  direction: 'inbound' | 'outbound';
  action: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  port: string;
  source: string;
  priority: number;
}

export interface Subnet {
  id: string;
  name: string;
  cidr: string;
  region: string;
  availableIPs: number;
  createdAt: Date;
}

export interface IPAddress {
  id: string;
  address: string;
  region: string;
  type: 'static' | 'dynamic';
  assignedTo: string | null;
  createdAt: Date;
}

export const CreateLoadBalancerSchema = z.object({
  name: z.string().min(1).max(100),
  algorithm: z
    .enum(['round-robin', 'least-connections', 'ip-hash'])
    .optional()
    .default('round-robin'),
  targets: z
    .array(
      z.object({
        address: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        weight: z.number().int().min(1).max(100).optional().default(1),
      }),
    )
    .optional()
    .default([]),
  healthCheck: z
    .object({
      path: z.string().optional().default('/health'),
      interval: z.number().int().min(5).max(300).optional().default(30),
      timeout: z.number().int().min(1).max(60).optional().default(5),
      unhealthyThreshold: z.number().int().min(1).max(10).optional().default(3),
    })
    .optional()
    .default({}),
  region: z.string().min(1),
});

export type CreateLoadBalancerInput = z.infer<typeof CreateLoadBalancerSchema>;

export const CreateVPNSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['site-to-site', 'point-to-site']),
  cidr: z.string().min(1),
});

export type CreateVPNInput = z.infer<typeof CreateVPNSchema>;

export const FirewallRuleSchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  action: z.enum(['allow', 'deny']),
  protocol: z.enum(['tcp', 'udp', 'icmp', 'all']),
  port: z.string().min(1),
  source: z.string().min(1),
  priority: z.number().int().min(1).max(10000),
});

export const ConfigureFirewallSchema = z.object({
  rules: z.array(FirewallRuleSchema).min(1),
});

export type ConfigureFirewallInput = z.infer<typeof ConfigureFirewallSchema>;

export const CreateSubnetSchema = z.object({
  name: z.string().min(1).max(100),
  cidr: z.string().min(1),
  region: z.string().min(1),
});

export type CreateSubnetInput = z.infer<typeof CreateSubnetSchema>;

export class NetworkingService {
  private readonly loadBalancers = new Map<string, LoadBalancer>();
  private readonly dnsConfigs = new Map<string, DNSConfig>();
  private readonly vpns = new Map<string, VPN>();
  private readonly firewalls = new Map<string, Firewall>();
  private readonly subnets = new Map<string, Subnet>();
  private readonly ipAddresses = new Map<string, IPAddress>();

  createLoadBalancer(input: CreateLoadBalancerInput): LoadBalancer {
    const parsed = CreateLoadBalancerSchema.parse(input);

    const lb: LoadBalancer = {
      id: randomUUID(),
      name: parsed.name,
      algorithm: parsed.algorithm,
      targets: parsed.targets.map((t) => ({
        id: randomUUID(),
        address: t.address,
        port: t.port,
        weight: t.weight,
        healthy: true,
      })),
      healthCheck: {
        path: parsed.healthCheck.path,
        interval: parsed.healthCheck.interval,
        timeout: parsed.healthCheck.timeout,
        unhealthyThreshold: parsed.healthCheck.unhealthyThreshold,
      },
      region: parsed.region,
      status: 'active',
      createdAt: new Date(),
    };

    this.loadBalancers.set(lb.id, lb);
    return lb;
  }

  deleteLoadBalancer(lbId: string): void {
    const lb = this.loadBalancers.get(lbId);
    if (!lb) {
      throw createAppError('Load balancer not found', 404, 'LB_NOT_FOUND');
    }
    this.loadBalancers.delete(lbId);
  }

  configureDNS(domain: string, records: DNSRecord[]): DNSConfig {
    const config: DNSConfig = {
      id: randomUUID(),
      domain,
      records,
      createdAt: new Date(),
    };

    this.dnsConfigs.set(domain, config);
    return config;
  }

  createVPN(input: CreateVPNInput): VPN {
    const parsed = CreateVPNSchema.parse(input);

    const vpn: VPN = {
      id: randomUUID(),
      name: parsed.name,
      type: parsed.type,
      status: 'active',
      endpoint: `vpn-${randomUUID().slice(0, 8)}.quantcloud.io`,
      cidr: parsed.cidr,
      createdAt: new Date(),
    };

    this.vpns.set(vpn.id, vpn);
    return vpn;
  }

  configureFirewall(input: ConfigureFirewallInput): Firewall {
    const parsed = ConfigureFirewallSchema.parse(input);

    const firewall: Firewall = {
      id: randomUUID(),
      rules: parsed.rules.map((r) => ({
        id: randomUUID(),
        ...r,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.firewalls.set(firewall.id, firewall);
    return firewall;
  }

  createSubnet(input: CreateSubnetInput): Subnet {
    const parsed = CreateSubnetSchema.parse(input);

    const subnet: Subnet = {
      id: randomUUID(),
      name: parsed.name,
      cidr: parsed.cidr,
      region: parsed.region,
      availableIPs: 254,
      createdAt: new Date(),
    };

    this.subnets.set(subnet.id, subnet);
    return subnet;
  }

  allocateIP(region: string): IPAddress {
    const ip: IPAddress = {
      id: randomUUID(),
      address: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      region,
      type: 'static',
      assignedTo: null,
      createdAt: new Date(),
    };

    this.ipAddresses.set(ip.id, ip);
    return ip;
  }
}
