import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export const RecipientPatternSchema = z.object({
  recipientEmail: z.string(),
  averageResponseTimeMinutes: z.number(),
  mostActiveHours: z.array(z.number()),
  mostActiveDays: z.array(z.string()),
  timezone: z.string().optional(),
});

export const OptimalTimeSchema = z.object({
  recipientEmail: z.string(),
  suggestedTime: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  alternativeTimes: z.array(z.string()),
});

export type RecipientPattern = z.infer<typeof RecipientPatternSchema>;
export type OptimalTime = z.infer<typeof OptimalTimeSchema>;

export class SmartSendTimeService {
  constructor(private readonly ai: AIEngine) {}

  async predictOptimalTime(
    recipientEmail: string,
    userId: string,
    engagementHistory?: RecipientPattern,
  ): Promise<OptimalTime> {
    const historyText = engagementHistory
      ? `Average response time: ${engagementHistory.averageResponseTimeMinutes} minutes
Most active hours: ${engagementHistory.mostActiveHours.join(', ')}
Most active days: ${engagementHistory.mostActiveDays.join(', ')}
Timezone: ${engagementHistory.timezone || 'unknown'}`
      : 'No engagement history available.';

    const response = await this.ai.infer({
      prompt: `Based on this recipient's engagement patterns, predict the optimal send time.

Recipient: ${recipientEmail}
${historyText}

Respond ONLY with valid JSON:
{
  "recipientEmail": "${recipientEmail}",
  "suggestedTime": "ISO datetime string",
  "reason": "why this time is optimal",
  "confidence": 0.0 to 1.0,
  "alternativeTimes": ["ISO datetime 1", "ISO datetime 2"]
}`,
      systemPrompt:
        'You are an email send-time optimization assistant. Predict when emails are most likely to be read and responded to. Always respond with valid JSON only.',
      userId,
      app: 'quantmail',
      feature: 'smart-send-time',
      temperature: 0.3,
      maxTokens: 256,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI send time response', 500, 'AI_PARSE_ERROR');
    }

    const result = OptimalTimeSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError('AI returned invalid optimal time result', 500, 'AI_VALIDATION_ERROR');
    }

    return result.data;
  }

  async getRecipientPatterns(recipientEmail: string, userId: string): Promise<RecipientPattern> {
    // In a real implementation, this would analyze engagement data from the database
    return {
      recipientEmail,
      averageResponseTimeMinutes: 45,
      mostActiveHours: [9, 10, 14, 15],
      mostActiveDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      timezone: 'America/New_York',
    };
  }
}
