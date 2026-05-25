// ============================================================================
// QuantChat - Mini Apps Service
// In-chat apps: polls, todo lists, games, shared activities
// ============================================================================

interface MiniApp {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'games' | 'social' | 'utility';
  iconUrl: string;
  version: string;
  isActive: boolean;
}

interface Poll {
  id: string;
  chatId: string;
  creatorId: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isMultiChoice: boolean;
  expiresAt: Date | null;
  status: 'active' | 'closed';
  createdAt: Date;
}

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface TodoList {
  id: string;
  chatId: string;
  creatorId: string;
  title: string;
  items: TodoItem[];
  createdAt: Date;
  updatedAt: Date;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  assignedTo: string | null;
  completedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

interface GameSession {
  id: string;
  gameId: string;
  chatId: string;
  players: GamePlayer[];
  status: 'waiting' | 'in_progress' | 'completed';
  state: Record<string, any>;
  winnerId: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

interface GamePlayer {
  userId: string;
  score: number;
  joinedAt: Date;
}

interface LeaderboardEntry {
  userId: string;
  gameId: string;
  wins: number;
  gamesPlayed: number;
  highScore: number;
}

export class MiniAppsService {
  private apps: Map<string, MiniApp> = new Map();
  private polls: Map<string, Poll> = new Map();
  private todoLists: Map<string, TodoList> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private leaderboards: Map<string, LeaderboardEntry[]> = new Map();

  constructor() {
    this.initializeDefaultApps();
  }

  private initializeDefaultApps(): void {
    const defaultApps: MiniApp[] = [
      { id: 'poll', name: 'Polls', description: 'Create and vote on polls', category: 'social', iconUrl: '/icons/poll.png', version: '1.0.0', isActive: true },
      { id: 'todo', name: 'Todo Lists', description: 'Shared task lists', category: 'productivity', iconUrl: '/icons/todo.png', version: '1.0.0', isActive: true },
      { id: 'trivia', name: 'Trivia', description: 'Quiz game', category: 'games', iconUrl: '/icons/trivia.png', version: '1.0.0', isActive: true },
      { id: 'wordle', name: 'Word Guess', description: 'Guess the word game', category: 'games', iconUrl: '/icons/wordle.png', version: '1.0.0', isActive: true },
      { id: 'countdown', name: 'Countdown', description: 'Shared countdown timer', category: 'utility', iconUrl: '/icons/countdown.png', version: '1.0.0', isActive: true },
    ];
    for (const app of defaultApps) {
      this.apps.set(app.id, app);
    }
  }

  async listApps(category?: string): Promise<MiniApp[]> {
    let apps = Array.from(this.apps.values()).filter(a => a.isActive);
    if (category) apps = apps.filter(a => a.category === category);
    return apps;
  }

  async loadApp(appId: string): Promise<MiniApp> {
    const app = this.apps.get(appId);
    if (!app) throw new Error('App not found');
    if (!app.isActive) throw new Error('App is not available');
    return app;
  }

  async sendAppMessage(chatId: string, appId: string, userId: string, data: Record<string, any>): Promise<{ appId: string; chatId: string; data: Record<string, any>; sentAt: Date }> {
    const app = this.apps.get(appId);
    if (!app) throw new Error('App not found');

    return { appId, chatId, data, sentAt: new Date() };
  }

  async createPoll(chatId: string, creatorId: string, config: {
    question: string;
    options: string[];
    isAnonymous?: boolean;
    isMultiChoice?: boolean;
    expiresInMinutes?: number;
  }): Promise<Poll> {
    if (!config.question || config.question.trim().length === 0) {
      throw new Error('Question is required');
    }
    if (!config.options || config.options.length < 2) {
      throw new Error('At least 2 options required');
    }
    if (config.options.length > 10) {
      throw new Error('Maximum 10 options allowed');
    }

    const pollId = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const poll: Poll = {
      id: pollId,
      chatId,
      creatorId,
      question: config.question.trim(),
      options: config.options.map((text, idx) => ({
        id: `opt_${idx}`,
        text: text.trim(),
        votes: [],
      })),
      isAnonymous: config.isAnonymous ?? false,
      isMultiChoice: config.isMultiChoice ?? false,
      expiresAt: config.expiresInMinutes ? new Date(Date.now() + config.expiresInMinutes * 60000) : null,
      status: 'active',
      createdAt: new Date(),
    };

    this.polls.set(pollId, poll);
    return poll;
  }

  async votePoll(pollId: string, userId: string, optionIds: string[]): Promise<Poll> {
    const poll = this.polls.get(pollId);
    if (!poll) throw new Error('Poll not found');
    if (poll.status !== 'active') throw new Error('Poll is closed');
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      poll.status = 'closed';
      throw new Error('Poll has expired');
    }

    if (!poll.isMultiChoice && optionIds.length > 1) {
      throw new Error('Only one vote allowed');
    }

    // Remove previous votes from this user
    for (const option of poll.options) {
      option.votes = option.votes.filter(v => v !== userId);
    }

    // Add new votes
    for (const optId of optionIds) {
      const option = poll.options.find(o => o.id === optId);
      if (!option) throw new Error(`Invalid option: ${optId}`);
      option.votes.push(userId);
    }

    return poll;
  }

  async getPollResults(pollId: string): Promise<{ poll: Poll; results: Array<{ optionId: string; text: string; votes: number; percentage: number }> }> {
    const poll = this.polls.get(pollId);
    if (!poll) throw new Error('Poll not found');

    const totalVoters = new Set(poll.options.flatMap(o => o.votes)).size;
    const results = poll.options.map(o => ({
      optionId: o.id,
      text: o.text,
      votes: o.votes.length,
      percentage: totalVoters > 0 ? Math.round((o.votes.length / totalVoters) * 100) : 0,
    }));

    return { poll, results };
  }

  async createTodoList(chatId: string, creatorId: string, title: string): Promise<TodoList> {
    if (!title || title.trim().length === 0) throw new Error('Title is required');

    const listId = `todo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const todoList: TodoList = {
      id: listId,
      chatId,
      creatorId,
      title: title.trim(),
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.todoLists.set(listId, todoList);
    return todoList;
  }

  async addTodoItem(listId: string, userId: string, text: string, assignedTo?: string): Promise<TodoList> {
    const list = this.todoLists.get(listId);
    if (!list) throw new Error('Todo list not found');
    if (!text || text.trim().length === 0) throw new Error('Item text is required');

    if (list.items.length >= 50) throw new Error('Maximum 50 items per list');

    const item: TodoItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: text.trim(),
      completed: false,
      assignedTo: assignedTo || null,
      completedBy: null,
      completedAt: null,
      createdAt: new Date(),
    };

    list.items.push(item);
    list.updatedAt = new Date();
    return list;
  }

  async completeTodo(listId: string, itemId: string, userId: string): Promise<TodoList> {
    const list = this.todoLists.get(listId);
    if (!list) throw new Error('Todo list not found');

    const item = list.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    item.completed = !item.completed;
    item.completedBy = item.completed ? userId : null;
    item.completedAt = item.completed ? new Date() : null;
    list.updatedAt = new Date();

    return list;
  }

  async startGame(gameId: string, chatId: string, userId: string): Promise<GameSession> {
    const app = this.apps.get(gameId);
    if (!app || app.category !== 'games') throw new Error('Game not found');

    const sessionId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const session: GameSession = {
      id: sessionId,
      gameId,
      chatId,
      players: [{ userId, score: 0, joinedAt: new Date() }],
      status: 'waiting',
      state: this.initGameState(gameId),
      winnerId: null,
      startedAt: new Date(),
      endedAt: null,
    };

    this.gameSessions.set(sessionId, session);
    return session;
  }

  async joinGame(sessionId: string, userId: string): Promise<GameSession> {
    const session = this.gameSessions.get(sessionId);
    if (!session) throw new Error('Game session not found');
    if (session.status !== 'waiting') throw new Error('Game already started');
    if (session.players.find(p => p.userId === userId)) throw new Error('Already in game');
    if (session.players.length >= 8) throw new Error('Game is full');

    session.players.push({ userId, score: 0, joinedAt: new Date() });

    if (session.players.length >= 2) {
      session.status = 'in_progress';
    }

    return session;
  }

  async endGame(sessionId: string, winnerId?: string): Promise<GameSession> {
    const session = this.gameSessions.get(sessionId);
    if (!session) throw new Error('Game session not found');

    session.status = 'completed';
    session.endedAt = new Date();
    session.winnerId = winnerId || session.players.sort((a, b) => b.score - a.score)[0]?.userId || null;

    // Update leaderboard
    if (session.winnerId) {
      this.updateLeaderboard(session.gameId, session.winnerId, session.players);
    }

    return session;
  }

  async getLeaderboard(gameId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const entries = this.leaderboards.get(gameId) || [];
    return entries.sort((a, b) => b.wins - a.wins).slice(0, limit);
  }

  private initGameState(gameId: string): Record<string, any> {
    switch (gameId) {
      case 'trivia': return { currentQuestion: 0, totalQuestions: 10, category: 'general' };
      case 'wordle': return { word: 'HELLO', guesses: [], maxGuesses: 6 };
      default: return { round: 1 };
    }
  }

  private updateLeaderboard(gameId: string, winnerId: string, players: GamePlayer[]): void {
    const entries = this.leaderboards.get(gameId) || [];

    for (const player of players) {
      let entry = entries.find(e => e.userId === player.userId);
      if (!entry) {
        entry = { userId: player.userId, gameId, wins: 0, gamesPlayed: 0, highScore: 0 };
        entries.push(entry);
      }
      entry.gamesPlayed++;
      if (player.userId === winnerId) entry.wins++;
      entry.highScore = Math.max(entry.highScore, player.score);
    }

    this.leaderboards.set(gameId, entries);
  }
}

export const miniAppsService = new MiniAppsService();
