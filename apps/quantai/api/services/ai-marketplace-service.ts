// ============================================================================
// QuantAI - AI Marketplace Service
// Persona listing, creation, publishing, ratings, purchases
// ============================================================================

interface AIPersona { id: string; name: string; description: string; category: string; creatorId: string; systemPrompt: string; capabilities: string[]; config: PersonaConfig; status: 'draft' | 'review' | 'published' | 'rejected'; rating: number; ratingCount: number; purchaseCount: number; price: number; isFree: boolean; createdAt: string; publishedAt?: string; }
interface PersonaConfig { temperature: number; maxTokens: number; topP: number; responseStyle: string; personality: string[]; knowledge: string[]; }
interface PersonaRating { id: string; personaId: string; userId: string; rating: number; review: string; createdAt: string; }
interface Purchase { id: string; personaId: string; userId: string; price: number; purchasedAt: string; }
interface EarningsData { creatorId: string; totalEarnings: number; thisMonth: number; byPersona: { personaId: string; name: string; earnings: number; purchases: number }[]; }

class AIMarketplaceService {
  private personas: Map<string, AIPersona> = new Map();
  private ratings: Map<string, PersonaRating[]> = new Map();
  private purchases: Map<string, Purchase[]> = new Map();
  private userPersonas: Map<string, string[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string { return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`; }

  async listPersonas(category?: string, opts?: { sort?: 'popular' | 'rating' | 'new'; limit?: number; offset?: number }): Promise<{ personas: AIPersona[]; total: number }> {
    let all = Array.from(this.personas.values()).filter(p => p.status === 'published');
    if (category) all = all.filter(p => p.category === category);
    if (opts?.sort === 'rating') all.sort((a, b) => b.rating - a.rating);
    else if (opts?.sort === 'new') all.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    else all.sort((a, b) => b.purchaseCount - a.purchaseCount);
    const total = all.length;
    return { personas: all.slice(opts?.offset || 0, (opts?.offset || 0) + (opts?.limit || 20)), total };
  }

  async searchPersonas(query: string): Promise<AIPersona[]> {
    const q = query.toLowerCase();
    return Array.from(this.personas.values()).filter(p => p.status === 'published' && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.capabilities.some(c => c.toLowerCase().includes(q))));
  }

  async createPersona(creatorId: string, config: { name: string; description: string; category: string; systemPrompt: string; capabilities: string[]; personaConfig: PersonaConfig; price?: number }): Promise<AIPersona> {
    if (config.name.length < 3 || config.name.length > 50) throw new Error('Name must be 3-50 characters');
    if (config.description.length < 20) throw new Error('Description must be at least 20 characters');
    if (config.systemPrompt.length < 50) throw new Error('System prompt must be at least 50 characters');

    const persona: AIPersona = {
      id: this.genId('persona'), name: config.name, description: config.description,
      category: config.category, creatorId, systemPrompt: config.systemPrompt,
      capabilities: config.capabilities, config: config.personaConfig,
      status: 'draft', rating: 0, ratingCount: 0, purchaseCount: 0,
      price: config.price || 0, isFree: !config.price || config.price === 0,
      createdAt: new Date().toISOString(),
    };

    this.personas.set(persona.id, persona);
    const list = this.userPersonas.get(creatorId) || [];
    list.push(persona.id);
    this.userPersonas.set(creatorId, list);
    return persona;
  }

  async publishPersona(personaId: string, creatorId: string): Promise<AIPersona> {
    const persona = this.personas.get(personaId);
    if (!persona) throw new Error('Persona not found');
    if (persona.creatorId !== creatorId) throw new Error('Permission denied');
    if (persona.status === 'published') throw new Error('Already published');

    persona.status = 'published';
    persona.publishedAt = new Date().toISOString();
    return persona;
  }

  async rate(personaId: string, userId: string, rating: number, review: string): Promise<PersonaRating> {
    const persona = this.personas.get(personaId);
    if (!persona) throw new Error('Persona not found');
    if (rating < 1 || rating > 5) throw new Error('Rating must be 1-5');
    if (review.length < 5) throw new Error('Review must be at least 5 characters');

    const personaRatings = this.ratings.get(personaId) || [];
    const existing = personaRatings.find(r => r.userId === userId);
    if (existing) throw new Error('Already rated');

    const ratingEntry: PersonaRating = { id: this.genId('rate'), personaId, userId, rating, review, createdAt: new Date().toISOString() };
    personaRatings.push(ratingEntry);
    this.ratings.set(personaId, personaRatings);

    persona.ratingCount = personaRatings.length;
    persona.rating = Math.round((personaRatings.reduce((s, r) => s + r.rating, 0) / personaRatings.length) * 10) / 10;
    return ratingEntry;
  }

  async purchase(personaId: string, userId: string): Promise<Purchase> {
    const persona = this.personas.get(personaId);
    if (!persona) throw new Error('Persona not found');
    if (persona.status !== 'published') throw new Error('Persona not available');
    if (persona.creatorId === userId) throw new Error('Cannot purchase your own persona');

    const userPurchases = this.purchases.get(userId) || [];
    if (userPurchases.find(p => p.personaId === personaId)) throw new Error('Already purchased');

    const purchase: Purchase = { id: this.genId('pur'), personaId, userId, price: persona.price, purchasedAt: new Date().toISOString() };
    userPurchases.push(purchase);
    this.purchases.set(userId, userPurchases);
    persona.purchaseCount++;
    return purchase;
  }

  async getEarnings(creatorId: string): Promise<EarningsData> {
    const personaIds = this.userPersonas.get(creatorId) || [];
    const allPurchases = Array.from(this.purchases.values()).flat();
    let totalEarnings = 0;
    let thisMonth = 0;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const byPersona = personaIds.map(pId => {
      const persona = this.personas.get(pId);
      const personaPurchases = allPurchases.filter(p => p.personaId === pId);
      const earnings = personaPurchases.reduce((s, p) => s + p.price, 0) * 0.7; // 70% to creator
      totalEarnings += earnings;
      thisMonth += personaPurchases.filter(p => new Date(p.purchasedAt).getTime() >= monthStart).reduce((s, p) => s + p.price * 0.7, 0);
      return { personaId: pId, name: persona?.name || '', earnings: Math.round(earnings * 100) / 100, purchases: personaPurchases.length };
    });

    return { creatorId, totalEarnings: Math.round(totalEarnings * 100) / 100, thisMonth: Math.round(thisMonth * 100) / 100, byPersona };
  }

  async getFeatured(): Promise<AIPersona[]> {
    return Array.from(this.personas.values()).filter(p => p.status === 'published' && p.rating >= 4).sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, 10);
  }

  async getPopular(limit: number = 20): Promise<AIPersona[]> {
    return Array.from(this.personas.values()).filter(p => p.status === 'published').sort((a, b) => b.purchaseCount - a.purchaseCount).slice(0, limit);
  }
}

export const aiMarketplaceService = new AIMarketplaceService();
export { AIMarketplaceService };
