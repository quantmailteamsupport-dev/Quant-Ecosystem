// ============================================================================
// QuantNeon - Fundraiser Service
// Fundraiser creation, donations, progress tracking, payouts
// ============================================================================

interface Fundraiser {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  currency: string;
  beneficiary: string;
  beneficiaryType: 'personal' | 'nonprofit' | 'community';
  coverImageUrl: string;
  status: 'active' | 'ended' | 'withdrawn' | 'cancelled';
  donors: Donation[];
  startedAt: string;
  endsAt: string;
  endedAt?: string;
  category: string;
  shareCount: number;
  updates: FundraiserUpdate[];
}

interface Donation {
  id: string;
  fundraiserId: string;
  donorId: string;
  donorName: string;
  amount: number;
  message?: string;
  isAnonymous: boolean;
  createdAt: string;
}

interface FundraiserUpdate {
  id: string;
  content: string;
  mediaUrl?: string;
  createdAt: string;
}

interface FundraiserProgress {
  fundraiserId: string;
  goal: number;
  raised: number;
  percentage: number;
  donorCount: number;
  avgDonation: number;
  daysRemaining: number;
  projectedTotal: number;
  milestones: { amount: number; reached: boolean; reachedAt?: string }[];
}

interface WithdrawRequest {
  id: string;
  fundraiserId: string;
  amount: number;
  destinationAccount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  fees: number;
  netAmount: number;
}

class FundraiserService {
  private fundraisers: Map<string, Fundraiser> = new Map();
  private userFundraisers: Map<string, string[]> = new Map();
  private withdrawals: Map<string, WithdrawRequest[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async create(creatorId: string, title: string, goal: number, beneficiary: string, options?: { description?: string; category?: string; durationDays?: number; beneficiaryType?: Fundraiser['beneficiaryType'] }): Promise<Fundraiser> {
    if (goal < 50) throw new Error('Goal must be at least $50');
    if (goal > 1000000) throw new Error('Goal cannot exceed $1,000,000');
    if (title.length < 5 || title.length > 200) throw new Error('Title must be 5-200 characters');

    const durationDays = options?.durationDays || 30;
    if (durationDays < 1 || durationDays > 90) throw new Error('Duration must be 1-90 days');

    const fundraiser: Fundraiser = {
      id: this.genId('fund'),
      creatorId,
      title: title.trim(),
      description: options?.description || '',
      goal,
      raised: 0,
      currency: 'USD',
      beneficiary,
      beneficiaryType: options?.beneficiaryType || 'personal',
      coverImageUrl: `https://cdn.quant.neon/fundraisers/${this.genId('img')}.jpg`,
      status: 'active',
      donors: [],
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + durationDays * 86400000).toISOString(),
      category: options?.category || 'general',
      shareCount: 0,
      updates: [],
    };

    this.fundraisers.set(fundraiser.id, fundraiser);
    const userList = this.userFundraisers.get(creatorId) || [];
    userList.push(fundraiser.id);
    this.userFundraisers.set(creatorId, userList);

    return fundraiser;
  }

  async donate(fundraiserId: string, donorId: string, donorName: string, amount: number, options?: { message?: string; isAnonymous?: boolean }): Promise<Donation> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');
    if (fundraiser.status !== 'active') throw new Error('Fundraiser is not active');
    if (amount < 1) throw new Error('Minimum donation is $1');
    if (amount > 50000) throw new Error('Maximum single donation is $50,000');

    const donation: Donation = {
      id: this.genId('don'),
      fundraiserId,
      donorId,
      donorName: options?.isAnonymous ? 'Anonymous' : donorName,
      amount: Math.round(amount * 100) / 100,
      message: options?.message?.substring(0, 500),
      isAnonymous: options?.isAnonymous || false,
      createdAt: new Date().toISOString(),
    };

    fundraiser.donors.push(donation);
    fundraiser.raised += donation.amount;

    if (fundraiser.raised >= fundraiser.goal) {
      fundraiser.updates.push({
        id: this.genId('upd'),
        content: `Goal of $${fundraiser.goal} reached! Thank you to all donors!`,
        createdAt: new Date().toISOString(),
      });
    }

    return donation;
  }

  async getProgress(fundraiserId: string): Promise<FundraiserProgress> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');

    const percentage = Math.min(100, Math.round((fundraiser.raised / fundraiser.goal) * 10000) / 100);
    const donorCount = fundraiser.donors.length;
    const avgDonation = donorCount > 0 ? fundraiser.raised / donorCount : 0;
    const daysElapsed = (Date.now() - new Date(fundraiser.startedAt).getTime()) / 86400000;
    const daysRemaining = Math.max(0, Math.ceil((new Date(fundraiser.endsAt).getTime() - Date.now()) / 86400000));
    const dailyRate = daysElapsed > 0 ? fundraiser.raised / daysElapsed : 0;
    const projectedTotal = fundraiser.raised + (dailyRate * daysRemaining);

    const milestones = [25, 50, 75, 100].map(pct => {
      const amount = fundraiser.goal * (pct / 100);
      return { amount, reached: fundraiser.raised >= amount, reachedAt: fundraiser.raised >= amount ? new Date().toISOString() : undefined };
    });

    return { fundraiserId, goal: fundraiser.goal, raised: fundraiser.raised, percentage, donorCount, avgDonation: Math.round(avgDonation * 100) / 100, daysRemaining, projectedTotal: Math.round(projectedTotal * 100) / 100, milestones };
  }

  async endFundraiser(fundraiserId: string, creatorId: string): Promise<Fundraiser> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');
    if (fundraiser.creatorId !== creatorId) throw new Error('Only creator can end fundraiser');
    if (fundraiser.status !== 'active') throw new Error('Fundraiser is not active');

    fundraiser.status = 'ended';
    fundraiser.endedAt = new Date().toISOString();
    return fundraiser;
  }

  async extend(fundraiserId: string, additionalDays: number): Promise<Fundraiser> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');
    if (fundraiser.status !== 'active') throw new Error('Can only extend active fundraisers');
    if (additionalDays < 1 || additionalDays > 30) throw new Error('Can extend 1-30 days');

    const currentEnd = new Date(fundraiser.endsAt).getTime();
    fundraiser.endsAt = new Date(currentEnd + additionalDays * 86400000).toISOString();
    return fundraiser;
  }

  async shareToFeed(fundraiserId: string): Promise<{ shared: boolean; postUrl: string }> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');
    fundraiser.shareCount++;
    return { shared: true, postUrl: `https://quant.neon/fundraiser/${fundraiserId}` };
  }

  async getDonors(fundraiserId: string, opts?: { limit?: number; offset?: number; sort?: 'recent' | 'amount' }): Promise<{ donors: Donation[]; total: number }> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');

    let donors = [...fundraiser.donors];
    if (opts?.sort === 'amount') donors.sort((a, b) => b.amount - a.amount);
    else donors.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = donors.length;
    const offset = opts?.offset || 0;
    const limit = opts?.limit || 20;
    return { donors: donors.slice(offset, offset + limit), total };
  }

  async withdraw(fundraiserId: string, creatorId: string, amount: number, destinationAccount: string): Promise<WithdrawRequest> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');
    if (fundraiser.creatorId !== creatorId) throw new Error('Only creator can withdraw');
    if (amount > fundraiser.raised) throw new Error('Insufficient funds');
    if (amount < 10) throw new Error('Minimum withdrawal is $10');

    const fees = Math.round(amount * 0.029 * 100) / 100;
    const netAmount = Math.round((amount - fees) * 100) / 100;

    const request: WithdrawRequest = {
      id: this.genId('wd'),
      fundraiserId,
      amount,
      destinationAccount,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      fees,
      netAmount,
    };

    const list = this.withdrawals.get(fundraiserId) || [];
    list.push(request);
    this.withdrawals.set(fundraiserId, list);
    fundraiser.raised -= amount;

    return request;
  }

  async sendThankYou(fundraiserId: string, donorId: string, message: string): Promise<{ sent: boolean }> {
    const fundraiser = this.fundraisers.get(fundraiserId);
    if (!fundraiser) throw new Error('Fundraiser not found');
    const donor = fundraiser.donors.find(d => d.donorId === donorId);
    if (!donor) throw new Error('Donor not found');
    return { sent: true };
  }
}

export const fundraiserService = new FundraiserService();
export { FundraiserService };
