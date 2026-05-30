import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { OrgService, MemberService } from '@quant/organizations';
import type { OrgContext } from '@quant/organizations';

declare module 'fastify' {
  interface FastifyInstance {
    org: {
      service: OrgService;
      members: MemberService;
    };
  }
  interface FastifyRequest {
    orgContext?: OrgContext | null;
  }
}

async function organizationsPlugin(fastify: FastifyInstance) {
  const orgService = new OrgService();
  const memberService = new MemberService();

  fastify.decorate('org', {
    service: orgService,
    members: memberService,
  });

  fastify.decorateRequest('orgContext', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const orgId = request.headers['x-organization-id'] as string | undefined;

    if (!orgId) {
      request.orgContext = null;
      return;
    }

    const org = orgService.getOrg(orgId);
    if (!org) {
      request.orgContext = null;
      return;
    }

    const userId = (request as unknown as { auth?: { userId?: string } }).auth?.userId;
    if (!userId) {
      request.orgContext = null;
      return;
    }

    const membership = memberService.getMembership(orgId, userId);
    if (!membership) {
      request.orgContext = null;
      return;
    }

    request.orgContext = {
      orgId: org.id,
      org,
      memberRole: membership.role,
    };
  });
}

export default fp(organizationsPlugin, {
  name: 'organizations',
});
