import { NextRequest, NextResponse } from 'next/server';
import { CreateFlagInput } from '@quant/feature-flags';

// In-memory store for flags (mock data since no DB connection in admin app)
const flagsStore: Map<string, Record<string, unknown>> = new Map([
  [
    'flag_demo1',
    {
      id: 'flag_demo1',
      name: 'dark-mode-v2',
      description: 'New dark mode implementation',
      enabled: true,
      rules: [],
      percentage: 100,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'flag_demo2',
    {
      id: 'flag_demo2',
      name: 'ai-chat-beta',
      description: 'AI chat feature beta rollout',
      enabled: true,
      rules: [],
      percentage: 25,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    'flag_demo3',
    {
      id: 'flag_demo3',
      name: 'new-onboarding',
      description: 'Redesigned onboarding flow',
      enabled: false,
      rules: [],
      percentage: 50,
      variants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
]);

export async function GET() {
  const flags = Array.from(flagsStore.values());
  return NextResponse.json({ success: true, data: flags });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateFlagInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 400 },
      );
    }

    const id = 'flag_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
    const now = new Date().toISOString();
    const flag = {
      id,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      enabled: parsed.data.enabled ?? false,
      rules: parsed.data.rules ?? [],
      percentage: parsed.data.percentage ?? 100,
      variants: parsed.data.variants ?? [],
      createdAt: now,
      updatedAt: now,
    };

    flagsStore.set(id, flag);
    return NextResponse.json({ success: true, data: flag }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
