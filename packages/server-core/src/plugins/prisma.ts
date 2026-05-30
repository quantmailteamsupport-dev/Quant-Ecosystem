import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

// Use a minimal interface so server-core doesn't require specific PrismaClient types
interface PrismaLike {
  $disconnect(): Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaLike;
  }
}

export interface PrismaPluginOptions {
  client: PrismaLike;
}

async function prismaPlugin(fastify: FastifyInstance, opts: PrismaPluginOptions) {
  fastify.decorate('prisma', opts.client);

  fastify.addHook('onClose', async () => {
    await opts.client.$disconnect();
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
});
