import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    providers: [
      { name: 'OpenAI', status: 'active' as const, models: 4, requestsToday: 12450 },
      { name: 'Anthropic', status: 'active' as const, models: 3, requestsToday: 8920 },
      { name: 'Google AI', status: 'active' as const, models: 2, requestsToday: 3200 },
      { name: 'Local LLM', status: 'active' as const, models: 1, requestsToday: 1580 },
    ],
    modelUsage: [
      { model: 'GPT-4o', tokensUsed: '2.4M', requests: 5600, avgLatency: '1.2s', cost: '$48.00' },
      {
        model: 'Claude 3.5',
        tokensUsed: '1.8M',
        requests: 4200,
        avgLatency: '0.9s',
        cost: '$36.00',
      },
      {
        model: 'Gemini Pro',
        tokensUsed: '890K',
        requests: 2100,
        avgLatency: '0.7s',
        cost: '$12.00',
      },
      { model: 'Llama 3', tokensUsed: '450K', requests: 1580, avgLatency: '0.4s', cost: '$0.00' },
    ],
    totals: {
      tokens: '5.5M',
      requests: 26150,
      cost: '$96.00',
      avgLatency: '0.8s',
    },
  };

  return NextResponse.json({ success: true, data });
}
