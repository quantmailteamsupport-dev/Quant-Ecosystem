// ============================================================================
// QuantMax - Creator Fund Dashboard
// Total earnings card, daily breakdown bar chart (7 days), video performance
// table (title/views/revenue), payout history, eligibility status panel,
// next payout date countdown
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface DailyEarning {
  date: string;
  amount: number;
  views: number;
  engagement: number;
}

interface VideoPerformance {
  id: string;
  title: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  revenue: number;
  publishedAt: string;
  cpm: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  method: string;
  date: string;
  transactionId: string;
}

interface EligibilityStatus {
  isEligible: boolean;
  followerCount: number;
  followerRequired: number;
  viewCount: number;
  viewRequired: number;
  accountAge: number;
  accountAgeRequired: number;
  communityGuidelines: boolean;
  originalContent: boolean;
}

interface CreatorStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalViews: number;
  avgCpm: number;
  engagementRate: number;
  topPerformingVideoId: string;
}

const CreatorFundPage: React.FC = () => {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [videos, setVideos] = useState<VideoPerformance[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'payouts' | 'eligibility'>('overview');
  const [videoSort, setVideoSort] = useState<'views' | 'revenue' | 'recent'>('revenue');
  const [nextPayoutDate, setNextPayoutDate] = useState<Date>(new Date(Date.now() + 12 * 24 * 60 * 60 * 1000));
  const [timeToNextPayout, setTimeToNextPayout] = useState<string>('');

  useEffect(() => {
    loadCreatorData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextPayoutDate.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeToNextPayout('Processing...');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeToNextPayout(`${days}d ${hours}h ${minutes}m`);
    }, 60000);
    // Initial calculation
    const now = new Date();
    const diff = nextPayoutDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    setTimeToNextPayout(`${days}d ${hours}h ${minutes}m`);
    return () => clearInterval(interval);
  }, [nextPayoutDate]);

  const loadCreatorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));

      // Stats
      setStats({
        totalEarnings: 12450.75,
        thisMonthEarnings: 2340.50,
        lastMonthEarnings: 1890.25,
        totalViews: 8500000,
        avgCpm: 3.20,
        engagementRate: 8.5,
        topPerformingVideoId: 'video-3',
      });

      // Daily earnings (7 days)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      setDailyEarnings(days.map((day, i) => ({
        date: day,
        amount: 200 + Math.floor(Math.random() * 300),
        views: 50000 + Math.floor(Math.random() * 100000),
        engagement: 5 + Math.random() * 8,
      })));

      // Video performances
      setVideos(Array.from({ length: 15 }, (_, i) => ({
        id: `video-${i}`,
        title: [`Morning Routine ${i + 1}`, `Dance Challenge #${i + 1}`, `How To Cook ${i + 1}`, `Travel Vlog ${i + 1}`, `Funny Prank ${i + 1}`][i % 5],
        thumbnailUrl: `https://cdn.quantmax.app/creator-fund/thumbs/${i}.jpg`,
        views: Math.floor(Math.random() * 2000000) + 10000,
        likes: Math.floor(Math.random() * 200000),
        comments: Math.floor(Math.random() * 10000),
        shares: Math.floor(Math.random() * 50000),
        revenue: Math.random() * 500 + 10,
        publishedAt: `${Math.floor(Math.random() * 30) + 1} days ago`,
        cpm: 1.5 + Math.random() * 4,
      })));

      // Payout history
      setPayouts(Array.from({ length: 6 }, (_, i) => ({
        id: `payout-${i}`,
        amount: 1000 + Math.floor(Math.random() * 2000),
        status: i === 0 ? 'processing' : 'completed',
        method: i % 2 === 0 ? 'Bank Transfer' : 'PayPal',
        date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        transactionId: `TXN${Date.now() - i * 1000000}`,
      })));

      // Eligibility
      setEligibility({
        isEligible: true,
        followerCount: 25000,
        followerRequired: 10000,
        viewCount: 450000,
        viewRequired: 100000,
        accountAge: 120,
        accountAgeRequired: 30,
        communityGuidelines: true,
        originalContent: true,
      });
    } catch (err) {
      setError('Failed to load creator fund data');
    } finally {
      setLoading(false);
    }
  }, []);

  const sortedVideos = useMemo(() => {
    const sorted = [...videos];
    switch (videoSort) {
      case 'views': sorted.sort((a, b) => b.views - a.views); break;
      case 'revenue': sorted.sort((a, b) => b.revenue - a.revenue); break;
      case 'recent': break; // Already in order
    }
    return sorted;
  }, [videos, videoSort]);

  const maxDailyEarning = useMemo(() => {
    return Math.max(...dailyEarnings.map(d => d.amount), 1);
  }, [dailyEarnings]);

  const monthGrowth = useMemo(() => {
    if (!stats) return 0;
    if (stats.lastMonthEarnings === 0) return 100;
    return ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings) * 100;
  }, [stats]);

  const formatCurrency = useCallback((amount: number): string => {
    return `$${amount.toFixed(2)}`;
  }, []);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  if (loading) {
    return (
      <div className="creator-fund-loading">
        <div className="loading-spinner" />
        <p>Loading your earnings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="creator-fund-error">
        <p>{error}</p>
        <button className="retry-btn" onClick={loadCreatorData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="creator-fund-page">
      {/* Header */}
      <div className="cf-header">
        <h1 className="page-title">Creator Fund</h1>
        <div className="next-payout">
          <span className="payout-label">Next payout in</span>
          <span className="payout-countdown">{timeToNextPayout}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="cf-tabs">
        {(['overview', 'videos', 'payouts', 'eligibility'] as const).map(tab => (
          <button
            key={tab}
            className={`cf-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="overview-section">
          {/* Total Earnings Card */}
          <div className="earnings-card">
            <h2 className="earnings-label">Total Earnings</h2>
            <span className="earnings-amount">{formatCurrency(stats.totalEarnings)}</span>
            <div className="earnings-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-label">This Month</span>
                <span className="breakdown-value">{formatCurrency(stats.thisMonthEarnings)}</span>
                <span className={`growth ${monthGrowth >= 0 ? 'positive' : 'negative'}`}>
                  {monthGrowth >= 0 ? '+' : ''}{monthGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-label">Last Month</span>
                <span className="breakdown-value">{formatCurrency(stats.lastMonthEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-card">
              <span className="stat-value">{formatCount(stats.totalViews)}</span>
              <span className="stat-label">Total Views</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">${stats.avgCpm.toFixed(2)}</span>
              <span className="stat-label">Avg CPM</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.engagementRate.toFixed(1)}%</span>
              <span className="stat-label">Engagement</span>
            </div>
          </div>

          {/* Daily Breakdown Bar Chart */}
          <div className="daily-chart-section">
            <h3 className="section-title">Last 7 Days</h3>
            <div className="bar-chart">
              {dailyEarnings.map(day => (
                <div key={day.date} className="bar-column">
                  <div className="bar-wrapper">
                    <div
                      className="bar-fill"
                      style={{ height: `${(day.amount / maxDailyEarning) * 100}%` }}
                    />
                  </div>
                  <span className="bar-label">{day.date}</span>
                  <span className="bar-value">${day.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="videos-section">
          <div className="videos-header">
            <h3>Video Performance</h3>
            <div className="sort-options">
              {(['revenue', 'views', 'recent'] as const).map(s => (
                <button key={s} className={`sort-btn ${videoSort === s ? 'active' : ''}`} onClick={() => setVideoSort(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="videos-table">
            <div className="table-header">
              <span className="col-title">Video</span>
              <span className="col-views">Views</span>
              <span className="col-revenue">Revenue</span>
              <span className="col-cpm">CPM</span>
            </div>
            {sortedVideos.map(video => (
              <div key={video.id} className="video-row">
                <div className="video-info-cell">
                  <img className="video-thumb" src={video.thumbnailUrl} alt={video.title} />
                  <div className="video-meta">
                    <span className="video-title">{video.title}</span>
                    <span className="video-date">{video.publishedAt}</span>
                  </div>
                </div>
                <div className="views-cell">
                  <span className="views-count">{formatCount(video.views)}</span>
                  <div className="engagement-mini">
                    <span>&#10084; {formatCount(video.likes)}</span>
                    <span>&#128172; {formatCount(video.comments)}</span>
                  </div>
                </div>
                <span className="revenue-cell">{formatCurrency(video.revenue)}</span>
                <span className="cpm-cell">${video.cpm.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="payouts-section">
          <h3 className="section-title">Payout History</h3>
          <div className="payouts-list">
            {payouts.map(payout => (
              <div key={payout.id} className={`payout-item ${payout.status}`}>
                <div className="payout-main">
                  <span className="payout-amount">{formatCurrency(payout.amount)}</span>
                  <span className={`payout-status-badge ${payout.status}`}>
                    {payout.status}
                  </span>
                </div>
                <div className="payout-details">
                  <span className="payout-method">{payout.method}</span>
                  <span className="payout-date">{payout.date}</span>
                </div>
                <span className="payout-txn">ID: {payout.transactionId}</span>
              </div>
            ))}
          </div>
          <div className="payout-info-card">
            <h4>Payout Schedule</h4>
            <p>Payouts are processed monthly on the 15th for balances over $50.</p>
            <p>Next payout: <strong>{timeToNextPayout}</strong></p>
          </div>
        </div>
      )}

      {/* Eligibility Tab */}
      {activeTab === 'eligibility' && eligibility && (
        <div className="eligibility-section">
          <div className={`eligibility-status-card ${eligibility.isEligible ? 'eligible' : 'not-eligible'}`}>
            <span className="status-icon">{eligibility.isEligible ? '&#10003;' : '&#10005;'}</span>
            <h3>{eligibility.isEligible ? 'You are eligible!' : 'Not yet eligible'}</h3>
            <p>{eligibility.isEligible ? 'You are currently enrolled in the Creator Fund.' : 'Meet the requirements below to join.'}</p>
          </div>

          <div className="requirements-list">
            <h3>Requirements</h3>

            {/* Followers */}
            <div className="requirement-item">
              <div className="requirement-header">
                <span className="requirement-label">Followers</span>
                <span className={`requirement-status ${eligibility.followerCount >= eligibility.followerRequired ? 'met' : 'unmet'}`}>
                  {eligibility.followerCount >= eligibility.followerRequired ? '&#10003;' : '&#10005;'}
                </span>
              </div>
              <div className="requirement-progress">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (eligibility.followerCount / eligibility.followerRequired) * 100)}%` }} />
                </div>
                <span className="progress-text">{formatCount(eligibility.followerCount)} / {formatCount(eligibility.followerRequired)} required</span>
              </div>
            </div>

            {/* Views */}
            <div className="requirement-item">
              <div className="requirement-header">
                <span className="requirement-label">Video Views (last 30 days)</span>
                <span className={`requirement-status ${eligibility.viewCount >= eligibility.viewRequired ? 'met' : 'unmet'}`}>
                  {eligibility.viewCount >= eligibility.viewRequired ? '&#10003;' : '&#10005;'}
                </span>
              </div>
              <div className="requirement-progress">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(100, (eligibility.viewCount / eligibility.viewRequired) * 100)}%` }} />
                </div>
                <span className="progress-text">{formatCount(eligibility.viewCount)} / {formatCount(eligibility.viewRequired)} required</span>
              </div>
            </div>

            {/* Account Age */}
            <div className="requirement-item">
              <div className="requirement-header">
                <span className="requirement-label">Account Age</span>
                <span className={`requirement-status ${eligibility.accountAge >= eligibility.accountAgeRequired ? 'met' : 'unmet'}`}>
                  {eligibility.accountAge >= eligibility.accountAgeRequired ? '&#10003;' : '&#10005;'}
                </span>
              </div>
              <span className="requirement-detail">{eligibility.accountAge} days (min {eligibility.accountAgeRequired} required)</span>
            </div>

            {/* Community Guidelines */}
            <div className="requirement-item">
              <div className="requirement-header">
                <span className="requirement-label">Community Guidelines</span>
                <span className={`requirement-status ${eligibility.communityGuidelines ? 'met' : 'unmet'}`}>
                  {eligibility.communityGuidelines ? '&#10003;' : '&#10005;'}
                </span>
              </div>
              <span className="requirement-detail">{eligibility.communityGuidelines ? 'No violations' : 'Violations detected'}</span>
            </div>

            {/* Original Content */}
            <div className="requirement-item">
              <div className="requirement-header">
                <span className="requirement-label">Original Content</span>
                <span className={`requirement-status ${eligibility.originalContent ? 'met' : 'unmet'}`}>
                  {eligibility.originalContent ? '&#10003;' : '&#10005;'}
                </span>
              </div>
              <span className="requirement-detail">{eligibility.originalContent ? 'Content verified as original' : 'Copyright claims detected'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorFundPage;
