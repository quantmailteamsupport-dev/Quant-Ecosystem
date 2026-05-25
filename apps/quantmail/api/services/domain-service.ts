// ============================================================================
// QuantMail - Domain Service
// Custom domain management, DNS verification, MX records, aliases, SPF/DKIM/DMARC
// ============================================================================

interface DomainRecord {
  id: string;
  userId: string;
  domain: string;
  status: 'pending' | 'verifying' | 'verified' | 'failed' | 'expired';
  mxConfigured: boolean;
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  verificationToken: string;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DomainAlias {
  id: string;
  domainId: string;
  userId: string;
  alias: string;
  forwardsTo: string;
  isActive: boolean;
  receivedCount: number;
  createdAt: Date;
}

interface DNSRecord {
  type: 'MX' | 'TXT' | 'CNAME' | 'A';
  name: string;
  value: string;
  priority?: number;
  ttl: number;
}

interface DomainStats {
  totalEmails: number;
  aliasCount: number;
  lastActivity: Date | null;
  spaceUsed: number;
}

export class DomainService {
  private domains: Map<string, DomainRecord> = new Map();
  private aliases: Map<string, DomainAlias> = new Map();
  private userDomainIndex: Map<string, string[]> = new Map();
  private domainAliasIndex: Map<string, string[]> = new Map();

  async addDomain(userId: string, domain: string): Promise<DomainRecord> {
    if (!domain || !this.isValidDomain(domain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain already registered
    for (const d of this.domains.values()) {
      if (d.domain === domain.toLowerCase()) {
        throw new Error('Domain already registered');
      }
    }

    const domainId = `dom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const verificationToken = `quant-verify-${this.generateToken(32)}`;

    const record: DomainRecord = {
      id: domainId,
      userId,
      domain: domain.toLowerCase(),
      status: 'pending',
      mxConfigured: false,
      spfValid: false,
      dkimValid: false,
      dmarcValid: false,
      verificationToken,
      verifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.domains.set(domainId, record);
    const userDomains = this.userDomainIndex.get(userId) || [];
    userDomains.push(domainId);
    this.userDomainIndex.set(userId, userDomains);

    return record;
  }

  async verifyDNS(domainId: string, userId: string): Promise<{ verified: boolean; checks: Record<string, boolean>; requiredRecords: DNSRecord[] }> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');
    if (domain.userId !== userId) throw new Error('Access denied');

    domain.status = 'verifying';
    domain.updatedAt = new Date();

    // Simulate DNS verification
    const txtVerified = Math.random() > 0.3;
    const mxVerified = Math.random() > 0.4;

    const requiredRecords: DNSRecord[] = [
      { type: 'TXT', name: domain.domain, value: domain.verificationToken, ttl: 3600 },
      { type: 'MX', name: domain.domain, value: 'mx1.quantmail.com', priority: 10, ttl: 3600 },
      { type: 'MX', name: domain.domain, value: 'mx2.quantmail.com', priority: 20, ttl: 3600 },
      { type: 'TXT', name: domain.domain, value: `v=spf1 include:quantmail.com ~all`, ttl: 3600 },
    ];

    if (txtVerified) {
      domain.status = 'verified';
      domain.verifiedAt = new Date();
      domain.mxConfigured = mxVerified;
    } else {
      domain.status = 'pending';
    }

    domain.updatedAt = new Date();

    return {
      verified: txtVerified,
      checks: { txt: txtVerified, mx: mxVerified },
      requiredRecords,
    };
  }

  async configureMX(domainId: string, userId: string): Promise<{ configured: boolean; records: DNSRecord[] }> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');
    if (domain.userId !== userId) throw new Error('Access denied');
    if (domain.status !== 'verified') throw new Error('Domain must be verified first');

    const records: DNSRecord[] = [
      { type: 'MX', name: domain.domain, value: 'mx1.quantmail.com', priority: 10, ttl: 3600 },
      { type: 'MX', name: domain.domain, value: 'mx2.quantmail.com', priority: 20, ttl: 3600 },
      { type: 'CNAME', name: `mail.${domain.domain}`, value: 'mail.quantmail.com', ttl: 3600 },
    ];

    domain.mxConfigured = true;
    domain.updatedAt = new Date();

    return { configured: true, records };
  }

  async getDomains(userId: string): Promise<DomainRecord[]> {
    const domainIds = this.userDomainIndex.get(userId) || [];
    return domainIds
      .map(id => this.domains.get(id))
      .filter((d): d is DomainRecord => d !== undefined);
  }

  async createAlias(domainId: string, userId: string, alias: string, forwardsTo: string): Promise<DomainAlias> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');
    if (domain.userId !== userId) throw new Error('Access denied');
    if (domain.status !== 'verified') throw new Error('Domain must be verified');

    if (!alias || !this.isValidLocalPart(alias)) {
      throw new Error('Invalid alias format');
    }

    const fullAlias = `${alias}@${domain.domain}`;
    // Check for duplicates
    for (const a of this.aliases.values()) {
      if (a.alias === fullAlias) throw new Error('Alias already exists');
    }

    const aliasId = `alias_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const aliasRecord: DomainAlias = {
      id: aliasId,
      domainId,
      userId,
      alias: fullAlias,
      forwardsTo,
      isActive: true,
      receivedCount: 0,
      createdAt: new Date(),
    };

    this.aliases.set(aliasId, aliasRecord);
    const domainAliases = this.domainAliasIndex.get(domainId) || [];
    domainAliases.push(aliasId);
    this.domainAliasIndex.set(domainId, domainAliases);

    return aliasRecord;
  }

  async deleteAlias(aliasId: string, userId: string): Promise<void> {
    const alias = this.aliases.get(aliasId);
    if (!alias) throw new Error('Alias not found');
    if (alias.userId !== userId) throw new Error('Access denied');

    this.aliases.delete(aliasId);
    const domainAliases = this.domainAliasIndex.get(alias.domainId) || [];
    this.domainAliasIndex.set(alias.domainId, domainAliases.filter(id => id !== aliasId));
  }

  async listAliases(domainId: string, userId: string): Promise<DomainAlias[]> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');
    if (domain.userId !== userId) throw new Error('Access denied');

    const aliasIds = this.domainAliasIndex.get(domainId) || [];
    return aliasIds
      .map(id => this.aliases.get(id))
      .filter((a): a is DomainAlias => a !== undefined);
  }

  async validatePlusAddress(email: string): Promise<{ valid: boolean; baseAddress: string; tag: string }> {
    const plusIndex = email.indexOf('+');
    const atIndex = email.indexOf('@');

    if (plusIndex === -1 || atIndex === -1 || plusIndex > atIndex) {
      return { valid: false, baseAddress: email, tag: '' };
    }

    const localPart = email.substring(0, plusIndex);
    const tag = email.substring(plusIndex + 1, atIndex);
    const domainPart = email.substring(atIndex);
    const baseAddress = localPart + domainPart;

    return { valid: true, baseAddress, tag };
  }

  async getCustomDomainStats(domainId: string, userId: string): Promise<DomainStats> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');
    if (domain.userId !== userId) throw new Error('Access denied');

    const aliasIds = this.domainAliasIndex.get(domainId) || [];
    const totalEmails = aliasIds.reduce((sum, id) => {
      const alias = this.aliases.get(id);
      return sum + (alias?.receivedCount || 0);
    }, 0);

    return {
      totalEmails,
      aliasCount: aliasIds.length,
      lastActivity: domain.updatedAt,
      spaceUsed: totalEmails * 15000, // avg 15KB per email
    };
  }

  async checkSPF(domainId: string): Promise<{ valid: boolean; record: string; issues: string[] }> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');

    const record = `v=spf1 include:quantmail.com ~all`;
    const valid = domain.spfValid;
    const issues: string[] = [];
    if (!valid) issues.push('SPF record not found or incorrect');

    return { valid, record, issues };
  }

  async checkDKIM(domainId: string): Promise<{ valid: boolean; selector: string; issues: string[] }> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');

    const valid = domain.dkimValid;
    const issues: string[] = [];
    if (!valid) issues.push('DKIM record not configured');

    return { valid, selector: 'quantmail._domainkey', issues };
  }

  async checkDMARC(domainId: string): Promise<{ valid: boolean; policy: string; issues: string[] }> {
    const domain = this.domains.get(domainId);
    if (!domain) throw new Error('Domain not found');

    const valid = domain.dmarcValid;
    const policy = `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain}`;
    const issues: string[] = [];
    if (!valid) issues.push('DMARC record not found');
    if (!domain.spfValid) issues.push('SPF must be configured before DMARC');
    if (!domain.dkimValid) issues.push('DKIM must be configured before DMARC');

    return { valid, policy, issues };
  }

  private isValidDomain(domain: string): boolean {
    const pattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    return pattern.test(domain);
  }

  private isValidLocalPart(local: string): boolean {
    return /^[a-zA-Z0-9._%+-]+$/.test(local) && local.length <= 64;
  }

  private generateToken(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}

export const domainService = new DomainService();
