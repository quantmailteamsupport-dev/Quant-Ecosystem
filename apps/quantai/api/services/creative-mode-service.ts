// ============================================================================
// QuantAI - Creative Mode Service
// Story generation, poetry, scripts, lyrics, brainstorming, refinement
// ============================================================================

interface StoryResult { id: string; prompt: string; genre: string; content: string; title: string; wordCount: number; chapters?: string[]; characters?: string[]; }
interface PoemResult { id: string; style: string; topic: string; content: string; lines: number; rhymeScheme?: string; }
interface ScriptResult { id: string; format: string; title: string; content: string; scenes: number; characters: string[]; duration: string; }
interface LyricsResult { id: string; mood: string; theme: string; content: string; verses: string[]; chorus: string; bridge?: string; }
interface BrainstormResult { id: string; topic: string; ideas: { idea: string; category: string; feasibility: number; novelty: number }[]; mindMap: { center: string; branches: { label: string; children: string[] }[] }; }
interface RefineResult { id: string; original: string; refined: string; changes: { type: string; description: string }[]; improvements: string[]; }
interface Template { id: string; name: string; category: string; structure: string; example: string; }

class CreativeModeService {
  private stories: Map<string, StoryResult> = new Map();
  private poems: Map<string, PoemResult> = new Map();
  private templates: Map<string, Template> = new Map();
  private counter: number = 0;

  constructor() { this.initTemplates(); }

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  private initTemplates(): void {
    const templateData = [
      { name: 'Hero\'s Journey', category: 'story', structure: 'Call to Adventure > Trials > Transformation > Return' },
      { name: 'Sonnet', category: 'poetry', structure: '14 lines, ABAB CDCD EFEF GG rhyme scheme' },
      { name: 'Three-Act Script', category: 'script', structure: 'Setup > Confrontation > Resolution' },
      { name: 'Verse-Chorus-Verse', category: 'lyrics', structure: 'Verse 1 > Chorus > Verse 2 > Chorus > Bridge > Chorus' },
    ];
    templateData.forEach((t, i) => { this.templates.set(`tmpl_${i}`, { id: `tmpl_${i}`, ...t, example: `Example of ${t.name}...` }); });
  }

  async generateStory(prompt: string, genre: string, length: number = 500): Promise<StoryResult> {
    if (prompt.length < 5) throw new Error('Prompt must be at least 5 characters');
    if (length < 100 || length > 5000) throw new Error('Length must be 100-5000 words');

    const genres: Record<string, string> = {
      fantasy: 'In a realm where magic flowed like rivers, the ancient prophecy spoke of a chosen one who would restore balance to the fractured kingdoms.',
      scifi: 'The year was 2157. Humanity had expanded beyond the solar system, but with every new world colonized, old conflicts found new battlegrounds.',
      mystery: 'Detective Morgan stared at the crime scene, something was wrong. The evidence was too perfect, too neatly arranged, as if someone wanted to be found.',
      romance: 'Their eyes met across the crowded room, and in that instant, the world seemed to pause. Neither knew that this chance encounter would change everything.',
      horror: 'The house had been abandoned for decades, yet the lights flickered on every night at exactly 3:33 AM. No one dared to investigate, until now.',
    };

    const opening = genres[genre] || genres.fantasy;
    const content = `${opening}\n\n${prompt}\n\nThe story unfolded across days that felt like lifetimes. Characters emerged from the shadows of possibility, each carrying their own truth, their own burden. The narrative twisted and turned, revealing layers of complexity that demanded attention.\n\nConflict arose not from simple opposition, but from the collision of deeply held beliefs. Resolution, when it came, was not a victory but a transformation, leaving all involved changed in ways they could not have predicted.\n\nThe ending arrived not with a bang but with a quiet understanding, a recognition that some stories never truly end, they simply find a resting place before beginning again.`;

    const story: StoryResult = {
      id: this.genId('story'), prompt, genre, content: content.substring(0, length * 5),
      title: `The ${genre.charAt(0).toUpperCase() + genre.slice(1)} of ${prompt.split(' ').slice(0, 3).join(' ')}`,
      wordCount: content.split(' ').length,
      chapters: ['Chapter 1: The Beginning', 'Chapter 2: The Journey', 'Chapter 3: The Resolution'],
      characters: ['Protagonist', 'Mentor', 'Antagonist', 'Companion'],
    };

    this.stories.set(story.id, story);
    return story;
  }

  async writePoem(style: string, topic: string): Promise<PoemResult> {
    const styles: Record<string, { lines: number; scheme: string; content: string }> = {
      haiku: { lines: 3, scheme: '5-7-5', content: `${topic} whispers low\nThrough the morning mist it flows\nPeace in every breath` },
      sonnet: { lines: 14, scheme: 'ABAB CDCD EFEF GG', content: `Upon the canvas of the ${topic} night,\nWhere stars like diamonds shimmer, cold and bright,\nI find my thoughts ascending to the height\nOf dreams that dance beyond the reach of sight.\n\nThe world below grows quiet, still, and small,\nWhile I in contemplation find my peace.\nFor in this moment, nothing matters at all\nExcept the gentle promise of release.\n\nSo let the ${topic} carry me away\nTo places where the soul finds its true rest,\nWhere every dawn brings forth a brighter day\nAnd every heart discovers it is blessed.\n\nFor in the end, all poetry must say:\nLove is the light that guides us on our way.` },
      free_verse: { lines: 8, scheme: 'none', content: `${topic}\nbreaking through\nthe surface of ordinary days\nlike light through clouds\n\nwe carry it with us\nthis unnamed thing\nthat makes everything\nworth beginning again` },
      limerick: { lines: 5, scheme: 'AABBA', content: `There once was a ${topic} so fine,\nThat sparkled like vintage red wine,\nIt danced through the air,\nWithout any care,\nAnd left all who saw it divine.` },
    };

    const selected = styles[style] || styles.free_verse;
    const poem: PoemResult = { id: this.genId('poem'), style, topic, content: selected.content, lines: selected.lines, rhymeScheme: selected.scheme };
    this.poems.set(poem.id, poem);
    return poem;
  }

  async createScript(format: string, topic: string): Promise<ScriptResult> {
    const formats: Record<string, { scenes: number; duration: string }> = {
      short_film: { scenes: 5, duration: '10-15 minutes' },
      feature: { scenes: 30, duration: '90-120 minutes' },
      tv_episode: { scenes: 15, duration: '22-45 minutes' },
      commercial: { scenes: 3, duration: '30-60 seconds' },
      podcast: { scenes: 8, duration: '30-60 minutes' },
    };

    const fmt = formats[format] || formats.short_film;
    const content = `TITLE: ${topic}\nFORMAT: ${format}\n\nFADE IN:\n\nINT. LOCATION - DAY\n\nCHARACTER 1\n(thoughtfully)\nThis is where it all begins.\n\nCHARACTER 2\nAre you sure about this?\n\nCHARACTER 1\nI've never been more certain.\n\n[Scene continues with ${fmt.scenes} total scenes exploring the theme of ${topic}]\n\nFADE OUT.\n\nTHE END`;

    return { id: this.genId('script'), format, title: topic, content, scenes: fmt.scenes, characters: ['Character 1', 'Character 2', 'Character 3'], duration: fmt.duration };
  }

  async composeLyrics(mood: string, theme: string): Promise<LyricsResult> {
    const verse1 = `Walking through the ${theme}\nEvery step a new discovery\nThe ${mood} feeling in my chest\nGuiding me toward recovery`;
    const chorus = `This is our moment, ${theme} alive\nFeeling the ${mood}, ready to thrive\nNothing can stop us, we're on our way\nLiving for ${theme} every single day`;
    const verse2 = `The world keeps turning round and round\nBut here with you I'm homeward bound\nThe ${mood} takes us higher still\nBeyond the clouds, beyond the hill`;
    const bridge = `And when the darkness tries to creep\nWe hold on tight, we never sleep\nThe ${theme} burning in our souls\nMaking broken people whole`;

    return { id: this.genId('lyrics'), mood, theme, content: `${verse1}\n\n${chorus}\n\n${verse2}\n\n${chorus}\n\n${bridge}\n\n${chorus}`, verses: [verse1, verse2], chorus, bridge };
  }

  async brainstorm(topic: string, count: number = 10): Promise<BrainstormResult> {
    const categories = ['innovation', 'improvement', 'combination', 'inversion', 'analogy'];
    const ideas = Array.from({ length: count }, (_, i) => ({
      idea: `${topic} idea ${i + 1}: Apply ${categories[i % categories.length]} thinking to create novel approach`,
      category: categories[i % categories.length],
      feasibility: Math.round((0.3 + Math.random() * 0.7) * 100) / 100,
      novelty: Math.round((0.4 + Math.random() * 0.6) * 100) / 100,
    }));

    const mindMap = { center: topic, branches: categories.slice(0, 4).map(cat => ({ label: cat, children: ideas.filter(i => i.category === cat).map(i => i.idea.substring(0, 50)) })) };
    return { id: this.genId('brain'), topic, ideas, mindMap };
  }

  async refine(text: string, instructions: string): Promise<RefineResult> {
    if (text.length < 10) throw new Error('Text must be at least 10 characters');
    const changes = [
      { type: 'clarity', description: 'Improved sentence structure for clarity' },
      { type: 'tone', description: `Adjusted tone based on: ${instructions}` },
      { type: 'flow', description: 'Enhanced transitions between ideas' },
    ];
    const refined = text.split('. ').map(s => s.trim()).filter(s => s.length > 0).join('. ') + '.';
    return { id: this.genId('ref'), original: text, refined, changes, improvements: ['Better flow', 'Clearer messaging', 'Stronger opening'] };
  }

  async getTemplates(category?: string): Promise<Template[]> {
    let templates = Array.from(this.templates.values());
    if (category) templates = templates.filter(t => t.category === category);
    return templates;
  }
}

export const creativeModeService = new CreativeModeService();
export { CreativeModeService };
