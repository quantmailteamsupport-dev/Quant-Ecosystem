// ============================================================================
// QuantSync - Verification Service
// Application submission, review workflow, badge types, eligibility, revocation
// ============================================================================

type BadgeType = 'blue' | 'gold' | 'gray';
type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

interface VerificationApplication {
  id: string;
  userId: string;
  badgeType: BadgeType;
  category: string;
  reason: string;
  links: string[];
  status: ApplicationStatus;
  reviewerId?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  appliedAt: string;
  reviewedAt?: string;
  expiresAt?: string;
}

interface VerificationRequirements {
  minFollowers: number;
  minPosts: number;
  accountAgeDays: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  noRecentViolations: boolean;
}

interface UserEligibility {
  userId: string;
  followers: number;
  posts: number;
  accountAgeDays: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  violationsCount: number;
  meetsRequirements: boolean;
}

interface VerifiedUser {
  userId: string;
  badgeType: BadgeType;
  verifiedAt: string;
  verifiedBy: string;
  category: string;
  isActive: boolean;
  revokedAt?: string;
  revokedReason?: string;
}

interface VerificationStore {
  applications: Map<string, VerificationApplication>;
  verifiedUsers: Map<string, VerifiedUser>;
  requirements: VerificationRequirements;
}

const store: VerificationStore = {
  applications: new Map(),
  verifiedUsers: new Map(),
  requirements: {
    minFollowers: 1000,
    minPosts: 50,
    accountAgeDays: 90,
    emailVerified: true,
    phoneVerified: true,
    profileComplete: true,
    noRecentViolations: true,
  },
};

function generateId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export class VerificationService {
  async getRequirements(): Promise<VerificationRequirements> {
    return { ...store.requirements };
  }

  async checkEligibility(userId: string, userProfile: { followers: number; posts: number; accountAgeDays: number; emailVerified: boolean; phoneVerified: boolean; profileComplete: boolean; violationsCount: number }): Promise<UserEligibility> {
    const req = store.requirements;
    const meetsRequirements =
      userProfile.followers >= req.minFollowers &&
      userProfile.posts >= req.minPosts &&
      userProfile.accountAgeDays >= req.accountAgeDays &&
      userProfile.emailVerified === req.emailVerified &&
      userProfile.phoneVerified === req.phoneVerified &&
      userProfile.profileComplete === req.profileComplete &&
      userProfile.violationsCount === 0;

    return { userId, ...userProfile, meetsRequirements };
  }

  async getStatus(userId: string): Promise<{ hasApplied: boolean; status: string; badgeType?: BadgeType; appliedAt?: string; reviewedAt?: string; rejectionReason?: string }> {
    const verified = store.verifiedUsers.get(userId);
    if (verified && verified.isActive) {
      return { hasApplied: true, status: 'approved', badgeType: verified.badgeType, reviewedAt: verified.verifiedAt };
    }

    const applications = Array.from(store.applications.values()).filter(a => a.userId === userId);
    const latest = applications.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())[0];

    if (!latest) return { hasApplied: false, status: 'none' };

    return {
      hasApplied: true,
      status: latest.status,
      badgeType: latest.badgeType,
      appliedAt: latest.appliedAt,
      reviewedAt: latest.reviewedAt,
      rejectionReason: latest.rejectionReason,
    };
  }

  async submitApplication(userId: string, data: { badgeType: BadgeType; category: string; reason: string; links: string[] }): Promise<VerificationApplication> {
    const existingPending = Array.from(store.applications.values()).find(a => a.userId === userId && (a.status === 'pending' || a.status === 'under_review'));
    if (existingPending) throw new Error('You already have a pending application');

    const alreadyVerified = store.verifiedUsers.get(userId);
    if (alreadyVerified?.isActive) throw new Error('Account is already verified');

    const application: VerificationApplication = {
      id: generateId(),
      userId,
      badgeType: data.badgeType,
      category: data.category,
      reason: data.reason,
      links: data.links,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };

    store.applications.set(application.id, application);
    return application;
  }

  async reviewApplication(applicationId: string, reviewerId: string, decision: { approved: boolean; notes?: string; rejectionReason?: string }): Promise<VerificationApplication> {
    const application = store.applications.get(applicationId);
    if (!application) throw new Error('Application not found');
    if (application.status !== 'pending' && application.status !== 'under_review') {
      throw new Error('Application already reviewed');
    }

    application.reviewerId = reviewerId;
    application.reviewNotes = decision.notes;
    application.reviewedAt = new Date().toISOString();

    if (decision.approved) {
      application.status = 'approved';
      const verifiedUser: VerifiedUser = {
        userId: application.userId,
        badgeType: application.badgeType,
        verifiedAt: new Date().toISOString(),
        verifiedBy: reviewerId,
        category: application.category,
        isActive: true,
      };
      store.verifiedUsers.set(application.userId, verifiedUser);
    } else {
      application.status = 'rejected';
      application.rejectionReason = decision.rejectionReason || 'Does not meet requirements';
    }

    return application;
  }

  async revokeBadge(userId: string, reason: string, revokedBy: string): Promise<void> {
    const verified = store.verifiedUsers.get(userId);
    if (!verified) throw new Error('User is not verified');
    verified.isActive = false;
    verified.revokedAt = new Date().toISOString();
    verified.revokedReason = reason;
  }

  async isVerified(userId: string): Promise<{ verified: boolean; badgeType?: BadgeType; verifiedAt?: string }> {
    const verified = store.verifiedUsers.get(userId);
    if (verified && verified.isActive) {
      return { verified: true, badgeType: verified.badgeType, verifiedAt: verified.verifiedAt };
    }
    return { verified: false };
  }

  async getPendingApplications(limit: number = 50): Promise<VerificationApplication[]> {
    return Array.from(store.applications.values())
      .filter(a => a.status === 'pending' || a.status === 'under_review')
      .sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())
      .slice(0, limit);
  }

  async getApplicationHistory(userId: string): Promise<VerificationApplication[]> {
    return Array.from(store.applications.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }
}

export const verificationService = new VerificationService();
