import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import {
  NetworkingService,
  CreateLoadBalancerSchema,
  CreateVPNSchema,
  ConfigureFirewallSchema,
  CreateSubnetSchema,
} from '../services/networking.service';

const idParamSchema = z.object({
  id: z.string().min(1),
});

export default async function networkingRoutes(fastify: FastifyInstance) {
  const service = new NetworkingService();

  fastify.post('/load-balancers', async (request, reply) => {
    const parseResult = CreateLoadBalancerSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid load balancer configuration', 400, 'VALIDATION_ERROR');
    }
    const lb = service.createLoadBalancer(parseResult.data);
    return reply.status(201).send({ success: true, data: lb });
  });

  fastify.delete<{ Params: { id: string } }>('/load-balancers/:id', async (request, reply) => {
    const paramResult = idParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw createAppError('Invalid load balancer ID', 400, 'VALIDATION_ERROR');
    }
    service.deleteLoadBalancer(paramResult.data.id);
    return reply.send({ success: true, data: null });
  });

  fastify.post('/dns', async (request, reply) => {
    const body = request.body as { domain?: string; records?: unknown[] };
    if (!body?.domain || !body?.records) {
      throw createAppError('Invalid DNS configuration', 400, 'VALIDATION_ERROR');
    }
    const config = service.configureDNS(
      body.domain,
      body.records as Parameters<typeof service.configureDNS>[1],
    );
    return reply.status(201).send({ success: true, data: config });
  });

  fastify.post('/vpns', async (request, reply) => {
    const parseResult = CreateVPNSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid VPN configuration', 400, 'VALIDATION_ERROR');
    }
    const vpn = service.createVPN(parseResult.data);
    return reply.status(201).send({ success: true, data: vpn });
  });

  fastify.post('/firewalls', async (request, reply) => {
    const parseResult = ConfigureFirewallSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid firewall configuration', 400, 'VALIDATION_ERROR');
    }
    const firewall = service.configureFirewall(parseResult.data);
    return reply.status(201).send({ success: true, data: firewall });
  });

  fastify.post('/subnets', async (request, reply) => {
    const parseResult = CreateSubnetSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw createAppError('Invalid subnet configuration', 400, 'VALIDATION_ERROR');
    }
    const subnet = service.createSubnet(parseResult.data);
    return reply.status(201).send({ success: true, data: subnet });
  });

  fastify.post('/ips', async (request, reply) => {
    const body = request.body as { region?: string };
    if (!body?.region) {
      throw createAppError('Region is required', 400, 'VALIDATION_ERROR');
    }
    const ip = service.allocateIP(body.region);
    return reply.status(201).send({ success: true, data: ip });
  });
}
