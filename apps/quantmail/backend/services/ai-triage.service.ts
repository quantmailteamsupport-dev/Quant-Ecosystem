import { z } from 'zod';
import type { AIEngine } from '@quant/ai';
import { createAppError } from '@quant/server-core';

export const TriageInputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  from: z.string(),
  receivedAt: z.string().optional(),
});

export const TriageResultSchema = z.object({
  category: z.enum(['act_now', 'delegate', 'read_later', 'ignore']),
  reason: z.string(),
  urgency: z.number().min(0).max(1),
  suggestedAction: z.string().optional(),
});

export type TriageInput = z.infer<typeof TriageInputSchema>;
export type TriageResult = z.infer<typeof TriageResultSchema>;

export class AITriageService {
  constructor(private readonly ai: AIEngine) {}

  async triage(email: TriageInput, userId: string): Promise<TriageResult> {
    const validated = TriageInputSchema.parse(email);

    const response = await this.ai.infer({
      prompt: `Classify this email and return a JSON object with category, reason, urgency, and optionally suggestedAction.

Email:
From: ${validated.from}
Subject: ${validated.subject}
Body: ${validated.body}
${validated.receivedAt ? `Received: ${validated.receivedAt}` : ''}

Respond ONLY with valid JSON matching this schema:
{
  "category": "act_now" | "delegate" | "read_later" | "ignore",
  "reason": "brief explanation",
  "urgency": 0.0 to 1.0,
  "suggestedAction": "optional action suggestion"
}`,
      systemPrompt:
        'You are an email triage assistant. Classify emails by priority and suggest actions. Always respond with valid JSON only.',
      userId,
      app: 'quantmail',
      feature: 'email-triage',
      temperature: 0.2,
      maxTokens: 256,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw createAppError('Failed to parse AI triage response', 500, 'AI_PARSE_ERROR');
    }

    const result = TriageResultSchema.safeParse(parsed);
    if (!result.success) {
      throw createAppError('AI returned invalid triage result', 500, 'AI_VALIDATION_ERROR');
    }

    return result.data;
  }

  async triageBatch(
    emails: TriageInput[],
    userId: string,
  ): Promise<{ results: TriageResult[]; triaged: number; cost: number }> {
    const results: TriageResult[] = [];
    let totalCost = 0;

    for (const email of emails) {
      const result = await this.triage(email, userId);
      results.push(result);
      totalCost += 0.001; // estimated cost per triage
    }

    return {
      results,
      triaged: results.length,
      cost: totalCost,
    };
  }
}
