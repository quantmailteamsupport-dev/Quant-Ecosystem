// ============================================================================
// QuantNeon - InteractiveSticker Component
// ============================================================================

import type { Sticker } from '../types';

interface InteractiveStickerProps { sticker: Sticker; onInteract: (stickerId: string, data: any) => void; }

export function InteractiveSticker({ sticker, onInteract }: InteractiveStickerProps) {
  const style = `position: absolute; left: ${sticker.position.x * 100}%; top: ${sticker.position.y * 100}%`;
  switch (sticker.type) {
    case 'poll': return { type: 'div', props: { className: 'sticker sticker-poll', style }, children: [{ type: 'h4', props: {}, children: [sticker.data.question || 'Poll'] }, ...(sticker.data.options || []).map((opt: string, i: number) => ({ type: 'button', props: { className: 'poll-option' }, children: [opt] }))] };
    case 'question': return { type: 'div', props: { className: 'sticker sticker-question', style }, children: [{ type: 'p', props: {}, children: [sticker.data.question || 'Ask me anything'] }, { type: 'input', props: { placeholder: 'Type your answer...' }, children: [] }] };
    case 'slider': return { type: 'div', props: { className: 'sticker sticker-slider', style }, children: [{ type: 'p', props: {}, children: [sticker.data.prompt || 'Rate this'] }, { type: 'input', props: { type: 'range', min: 0, max: 100 }, children: [] }] };
    case 'countdown': return { type: 'div', props: { className: 'sticker sticker-countdown', style }, children: [{ type: 'h4', props: {}, children: [sticker.data.title || 'Countdown'] }, { type: 'span', props: { className: 'countdown-timer' }, children: [sticker.data.endTime || '00:00:00'] }] };
    case 'quiz': return { type: 'div', props: { className: 'sticker sticker-quiz', style }, children: [{ type: 'h4', props: {}, children: [sticker.data.question || 'Quiz'] }, ...(sticker.data.options || []).map((opt: string, i: number) => ({ type: 'button', props: { className: 'quiz-option' }, children: [opt] }))] };
    default: return { type: 'div', props: { className: `sticker sticker-${sticker.type}`, style }, children: [] };
  }
}
export default InteractiveSticker;
