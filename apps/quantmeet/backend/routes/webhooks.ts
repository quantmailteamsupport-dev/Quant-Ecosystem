import type { FastifyInstance } from 'fastify';
import { LiveKitWebhookService } from '../services/livekit-webhook.service';

export default async function webhooksRoutes(fastify: FastifyInstance) {
  const apiKey = process.env['LIVEKIT_API_KEY'] ?? 'devkey';
  const apiSecret = process.env['LIVEKIT_API_SECRET'] ?? 'devsecret';
  const webhookService = new LiveKitWebhookService(apiKey, apiSecret);

  fastify.post('/livekit', {
    config: {
      rawBody: true,
    },
    handler: async (request, reply) => {
      const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      const authHeader = request.headers['authorization'] as string | undefined;

      const event = await webhookService.handleWebhook(body, authHeader);

      if (event) {
        fastify.log.info({ event: event.type, room: event.roomName }, 'LiveKit webhook processed');
      }

      return reply.status(200).send({ received: true });
    },
  });
}
