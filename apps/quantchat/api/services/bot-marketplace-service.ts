// ============================================================================
// QuantChat - Bot Marketplace Service
// Bot discovery, installation, creation, publishing, analytics
// ============================================================================

interface Bot {
  id: string;
  name: string;
  description: string;
  category: string;
  developerId: string;
  version: string;
  iconUrl: string;
  commands: BotCommand[];
  permissions: string[];
  installCount: number;
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  isPublished: boolean;
  pricing: 'free' | 'premium' | 'freemium';
  webhookUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BotCommand {
  name: string;
  description: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
}

interface BotInstallation {
  id: string;
  botId: string;
  userId: string;
  chatIds: string[];
  installedAt: Date;
  config: Record<string, any>;
  isActive: boolean;
}

interface BotAnalytics {
  botId: string;
  totalInstalls: number;
  activeInstalls: number;
  commandsExecuted: number;
  avgResponseTime: number;
  errorRate: number;
  dailyActive: number;
  retention7d: number;
}

interface BotReport {
  id: string;
  botId: string;
  reporterId: string;
  reason: 'spam' | 'malicious' | 'broken' | 'inappropriate' | 'other';
  description: string;
  createdAt: Date;
}

export class BotMarketplace {
  private bots: Map<string, Bot> = new Map();
  private installations: Map<string, BotInstallation> = new Map();
  private userInstallIndex: Map<string, string[]> = new Map();
  private botReports: Map<string, BotReport[]> = new Map();
  private botRatings: Map<string, Map<string, number>> = new Map();

  async listBots(category?: string, options?: { page?: number; limit?: number; sort?: 'popular' | 'newest' | 'rating' }): Promise<{ bots: Bot[]; total: number }> {
    let bots = Array.from(this.bots.values()).filter(b => b.isPublished);

    if (category) {
      bots = bots.filter(b => b.category === category);
    }

    switch (options?.sort) {
      case 'popular': bots.sort((a, b) => b.installCount - a.installCount); break;
      case 'newest': bots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); break;
      case 'rating': bots.sort((a, b) => b.rating - a.rating); break;
      default: bots.sort((a, b) => b.installCount - a.installCount);
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const start = (page - 1) * limit;
    const paginated = bots.slice(start, start + limit);

    return { bots: paginated, total: bots.length };
  }

  async searchBots(query: string): Promise<Bot[]> {
    if (!query || query.trim().length < 2) return [];
    const queryLower = query.toLowerCase();

    return Array.from(this.bots.values())
      .filter(b => b.isPublished && (
        b.name.toLowerCase().includes(queryLower) ||
        b.description.toLowerCase().includes(queryLower) ||
        b.category.toLowerCase().includes(queryLower)
      ))
      .sort((a, b) => b.installCount - a.installCount)
      .slice(0, 20);
  }

  async installBot(userId: string, botId: string, chatIds?: string[]): Promise<BotInstallation> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');
    if (!bot.isPublished) throw new Error('Bot is not available');

    // Check if already installed
    const userInstalls = this.userInstallIndex.get(userId) || [];
    for (const installId of userInstalls) {
      const install = this.installations.get(installId);
      if (install && install.botId === botId && install.isActive) {
        throw new Error('Bot already installed');
      }
    }

    const installId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const installation: BotInstallation = {
      id: installId,
      botId,
      userId,
      chatIds: chatIds || [],
      installedAt: new Date(),
      config: {},
      isActive: true,
    };

    this.installations.set(installId, installation);
    userInstalls.push(installId);
    this.userInstallIndex.set(userId, userInstalls);
    bot.installCount++;

    return installation;
  }

  async uninstallBot(userId: string, botId: string): Promise<void> {
    const userInstalls = this.userInstallIndex.get(userId) || [];
    let found = false;

    for (const installId of userInstalls) {
      const install = this.installations.get(installId);
      if (install && install.botId === botId && install.isActive) {
        install.isActive = false;
        found = true;
        const bot = this.bots.get(botId);
        if (bot) bot.installCount = Math.max(0, bot.installCount - 1);
        break;
      }
    }

    if (!found) throw new Error('Bot not installed');
  }

  async createBot(developerId: string, config: {
    name: string;
    description: string;
    category: string;
    commands: BotCommand[];
    permissions: string[];
    webhookUrl: string;
    pricing?: 'free' | 'premium' | 'freemium';
  }): Promise<Bot> {
    if (!config.name || config.name.length < 3) throw new Error('Bot name must be at least 3 characters');
    if (!config.description || config.description.length < 10) throw new Error('Description must be at least 10 characters');
    if (!config.webhookUrl) throw new Error('Webhook URL is required');

    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const bot: Bot = {
      id: botId,
      name: config.name,
      description: config.description,
      category: config.category,
      developerId,
      version: '1.0.0',
      iconUrl: `https://bots.quantchat.com/icons/${botId}.png`,
      commands: config.commands,
      permissions: config.permissions,
      installCount: 0,
      rating: 0,
      ratingCount: 0,
      isVerified: false,
      isPublished: false,
      pricing: config.pricing || 'free',
      webhookUrl: config.webhookUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.bots.set(botId, bot);
    return bot;
  }

  async publishBot(botId: string, developerId: string): Promise<Bot> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');
    if (bot.developerId !== developerId) throw new Error('Access denied');
    if (bot.commands.length === 0) throw new Error('Bot must have at least one command');

    bot.isPublished = true;
    bot.updatedAt = new Date();
    return bot;
  }

  async updateBot(botId: string, developerId: string, updates: Partial<Pick<Bot, 'name' | 'description' | 'commands' | 'webhookUrl' | 'version'>>): Promise<Bot> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');
    if (bot.developerId !== developerId) throw new Error('Access denied');

    if (updates.name) bot.name = updates.name;
    if (updates.description) bot.description = updates.description;
    if (updates.commands) bot.commands = updates.commands;
    if (updates.webhookUrl) bot.webhookUrl = updates.webhookUrl;
    if (updates.version) bot.version = updates.version;
    bot.updatedAt = new Date();

    return bot;
  }

  async getBotAnalytics(botId: string, developerId: string): Promise<BotAnalytics> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');
    if (bot.developerId !== developerId) throw new Error('Access denied');

    let activeInstalls = 0;
    for (const install of this.installations.values()) {
      if (install.botId === botId && install.isActive) activeInstalls++;
    }

    return {
      botId,
      totalInstalls: bot.installCount,
      activeInstalls,
      commandsExecuted: Math.floor(Math.random() * 10000),
      avgResponseTime: Math.floor(Math.random() * 200) + 50,
      errorRate: Math.random() * 5,
      dailyActive: Math.floor(activeInstalls * 0.3),
      retention7d: Math.random() * 60 + 40,
    };
  }

  async rateBot(userId: string, botId: string, rating: number): Promise<Bot> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

    let ratings = this.botRatings.get(botId);
    if (!ratings) {
      ratings = new Map();
      this.botRatings.set(botId, ratings);
    }

    ratings.set(userId, rating);
    bot.ratingCount = ratings.size;
    let total = 0;
    for (const r of ratings.values()) total += r;
    bot.rating = Math.round((total / ratings.size) * 10) / 10;
    bot.updatedAt = new Date();

    return bot;
  }

  async reportBot(userId: string, botId: string, reason: BotReport['reason'], description: string): Promise<BotReport> {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot not found');

    const report: BotReport = {
      id: `report_${Date.now()}`,
      botId,
      reporterId: userId,
      reason,
      description,
      createdAt: new Date(),
    };

    const reports = this.botReports.get(botId) || [];
    reports.push(report);
    this.botReports.set(botId, reports);

    return report;
  }

  async getPopular(limit: number = 10): Promise<Bot[]> {
    return Array.from(this.bots.values())
      .filter(b => b.isPublished)
      .sort((a, b) => b.installCount - a.installCount)
      .slice(0, limit);
  }
}

export const botMarketplace = new BotMarketplace();
