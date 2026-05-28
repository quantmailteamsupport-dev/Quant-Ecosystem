import type { VoiceCommand, CommandResult } from '../types.js';

const CATS = [
  'communication',
  'time',
  'media',
  'navigation',
  'info',
  'device',
  'home',
  'shopping',
  'productivity',
  'crisis',
];
const DATA = [
  'call mom,send text,read messages,video call,check voicemail,send email,reply message,forward call,block caller,add contact',
  'set alarm,set timer,what time,show calendar,add event,snooze alarm,countdown,world clock,schedule meeting,remind me',
  'play music,pause,next song,volume up,volume down,play podcast,shuffle,repeat,play playlist,stop music',
  'go home,navigate work,nearest gas,traffic update,share location,find parking,avoid tolls,walking directions,save place,eta',
  'weather today,latest news,stock price,define word,translate,sports score,wiki search,exchange rate,horoscope,trivia',
  'take photo,flashlight on,battery level,bluetooth on,wifi off,screenshot,dark mode,airplane mode,restart phone,lock screen',
  'lights on,lights off,thermostat up,lock door,garage open,fan on,tv off,arm security,camera feed,vacuum start',
  'add to cart,reorder milk,track package,find coupon,compare prices,buy groceries,order food,pay bill,check balance,return item',
  'new note,read emails,set focus,start meeting,share screen,create task,open calendar,dictate text,search files,end meeting',
  'call 911,emergency sos,find hospital,call poison control,send location,alert contacts,first aid,roadside help,fire report,amber alert',
];

const CMDS: VoiceCommand[] = DATA.flatMap((g, i) =>
  g.split(',').map((phrase, j) => ({
    id: `cmd-${i}-${j}`,
    phrase,
    category: CATS[i]!,
    handler: `handle_${CATS[i]}`,
  })),
);

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

export class CommandRegistry {
  private commands: VoiceCommand[] = [...CMDS];
  private aliases = new Map<string, string>();
  private history: CommandResult[] = [];
  private contextFilter: string | null = null;

  getAll(): VoiceCommand[] {
    return this.commands;
  }

  getByCategory(cat: string): VoiceCommand[] {
    return this.commands.filter((c) => c.category === cat);
  }

  getCoverage() {
    return {
      total: this.commands.length,
      categories: new Set(this.commands.map((c) => c.category)).size,
    };
  }

  execute(phrase: string): string | null {
    const resolved = this.aliases.get(phrase.toLowerCase()) ?? phrase;
    const cmd = this.commands.find((c) => c.phrase === resolved);
    if (!cmd) return null;
    if (this.contextFilter && cmd.contexts && !cmd.contexts.includes(this.contextFilter)) {
      return null;
    }
    const result: CommandResult = {
      commandId: cmd.id,
      success: true,
      output: `Executed: ${cmd.phrase}`,
      timestamp: Date.now(),
    };
    this.history.push(result);
    return cmd.id;
  }

  addAlias(alias: string, phrase: string): void {
    this.aliases.set(alias.toLowerCase(), phrase);
  }

  fuzzyMatch(input: string, maxDistance = 3): VoiceCommand | null {
    const lower = input.toLowerCase();
    let best: VoiceCommand | null = null;
    let bestDist = maxDistance + 1;
    for (const cmd of this.commands) {
      const dist = levenshtein(lower, cmd.phrase.toLowerCase());
      if (dist < bestDist) {
        bestDist = dist;
        best = cmd;
      }
    }
    return best;
  }

  setContextFilter(context: string | null): void {
    this.contextFilter = context;
  }

  registerCommand(cmd: VoiceCommand): void {
    this.commands.push(cmd);
  }

  getHistory(): CommandResult[] {
    return [...this.history];
  }

  undo(): CommandResult | null {
    const last = this.history.pop();
    return last ?? null;
  }
}
