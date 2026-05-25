// ============================================================================
// QuantMax - Discover Page
// Trending sounds (horizontal scroll with play preview), hashtag challenges
// (banner cards), creator spotlights carousel, category tabs with video grids
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface TrendingSound {
  id: string;
  name: string;
  artistName: string;
  coverUrl: string;
  videoCount: number;
  previewUrl: string;
  duration: number;
  isPlaying: boolean;
}

interface HashtagChallenge {
  id: string;
  hashtag: string;
  title: string;
  description: string;
  bannerUrl: string;
  videoCount: number;
  participantCount: number;
  prizePool: string | null;
  endsAt: string;
  sponsored: boolean;
}

interface CreatorSpotlight {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  followerCount: number;
  videoCount: number;
  isVerified: boolean;
  category: string;
}

interface DiscoverVideo {
  id: string;
  thumbnailUrl: string;
  viewCount: number;
  likes: number;
  creatorUsername: string;
  caption: string;
  duration: number;
}

type CategoryTab = 'Comedy' | 'Dance' | 'Food' | 'Sports' | 'Fashion' | 'Music' | 'Gaming' | 'Education';

const CATEGORY_TABS: CategoryTab[] = ['Comedy', 'Dance', 'Food', 'Sports', 'Fashion', 'Music', 'Gaming', 'Education'];

const DiscoverPage: React.FC = () => {
  const [trendingSounds, setTrendingSounds] = useState<TrendingSound[]>([]);
  const [challenges, setChallenges] = useState<HashtagChallenge[]>([]);
  const [spotlights, setSpotlights] = useState<CreatorSpotlight[]>([]);
  const [categoryVideos, setCategoryVideos] = useState<DiscoverVideo[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('Comedy');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);

  useEffect(() => {
    loadDiscoverData();
  }, []);

  useEffect(() => {
    loadCategoryVideos(activeCategory);
  }, [activeCategory]);

  const loadDiscoverData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trending Sounds
      const sounds: TrendingSound[] = Array.from({ length: 12 }, (_, i) => ({
        id: `sound-${i}`,
        name: `Trending Track ${i + 1}`,
        artistName: `Artist ${i + 1}`,
        coverUrl: `https://cdn.quantmax.app/sounds/covers/${i}.jpg`,
        videoCount: Math.floor(Math.random() * 500000) + 10000,
        previewUrl: `https://cdn.quantmax.app/sounds/preview/${i}.mp3`,
        duration: 15 + Math.floor(Math.random() * 30),
        isPlaying: false,
      }));
      setTrendingSounds(sounds);

      // Challenges
      const chals: HashtagChallenge[] = Array.from({ length: 6 }, (_, i) => ({
        id: `challenge-${i}`,
        hashtag: `#${['DanceChallenge', 'FunnyFaces', 'CookWith Me', 'FitnessGoals', 'OOTDCheck', 'DuetThis'][i]}`,
        title: ['Show Your Moves', 'Make Us Laugh', 'Cook Something New', 'Push Your Limits', 'Style Challenge', 'Duet Time'][i],
        description: `Join the ${['dance', 'comedy', 'cooking', 'fitness', 'fashion', 'duet'][i]} challenge and show your skills!`,
        bannerUrl: `https://cdn.quantmax.app/challenges/banners/${i}.jpg`,
        videoCount: Math.floor(Math.random() * 1000000) + 50000,
        participantCount: Math.floor(Math.random() * 100000) + 5000,
        prizePool: i % 2 === 0 ? `$${(i + 1) * 1000}` : null,
        endsAt: `${Math.floor(Math.random() * 7) + 1} days`,
        sponsored: i % 3 === 0,
      }));
      setChallenges(chals);

      // Creator Spotlights
      const creators: CreatorSpotlight[] = Array.from({ length: 8 }, (_, i) => ({
        id: `creator-${i}`,
        username: `creator_${i}`,
        displayName: `Creative Star ${i + 1}`,
        avatarUrl: `https://cdn.quantmax.app/creators/${i}.jpg`,
        bio: `Content creator specializing in ${CATEGORY_TABS[i % CATEGORY_TABS.length]}`,
        followerCount: Math.floor(Math.random() * 5000000) + 100000,
        videoCount: Math.floor(Math.random() * 500) + 50,
        isVerified: i < 5,
        category: CATEGORY_TABS[i % CATEGORY_TABS.length],
      }));
      setSpotlights(creators);
    } catch (err) {
      setError('Failed to load discover content');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategoryVideos = useCallback(async (category: CategoryTab) => {
    const videos: DiscoverVideo[] = Array.from({ length: 12 }, (_, i) => ({
      id: `${category}-video-${i}`,
      thumbnailUrl: `https://cdn.quantmax.app/discover/${category.toLowerCase()}/${i}.jpg`,
      viewCount: Math.floor(Math.random() * 2000000) + 10000,
      likes: Math.floor(Math.random() * 500000) + 1000,
      creatorUsername: `creator_${i}`,
      caption: `Amazing ${category.toLowerCase()} content #${category.toLowerCase()}`,
      duration: 15 + Math.floor(Math.random() * 45),
    }));
    setCategoryVideos(videos);
  }, []);

  const handlePlaySound = useCallback((soundId: string) => {
    setPlayingSoundId(prev => prev === soundId ? null : soundId);
  }, []);

  const handleNextSpotlight = useCallback(() => {
    setSpotlightIndex(prev => (prev + 1) % spotlights.length);
  }, [spotlights.length]);

  const handlePrevSpotlight = useCallback(() => {
    setSpotlightIndex(prev => prev === 0 ? spotlights.length - 1 : prev - 1);
  }, [spotlights.length]);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  const currentSpotlight = useMemo(() => spotlights[spotlightIndex] || null, [spotlights, spotlightIndex]);

  if (loading) {
    return (
      <div className="discover-loading">
        <div className="loading-spinner" />
        <p>Discovering trending content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="discover-error">
        <p className="error-msg">{error}</p>
        <button className="retry-btn" onClick={loadDiscoverData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="discover-page">
      {/* Search Bar */}
      <div className="discover-search">
        <input
          className="search-input"
          placeholder="Search sounds, hashtags, creators..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(e.target.value.length > 0); }}
        />
        {showSearchResults && (
          <div className="search-results-dropdown">
            <div className="search-section">
              <h4>Sounds</h4>
              {trendingSounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(sound => (
                <div key={sound.id} className="search-result-item">
                  <span className="result-icon">🎵</span>
                  <span>{sound.name}</span>
                </div>
              ))}
            </div>
            <div className="search-section">
              <h4>Hashtags</h4>
              {challenges.filter(c => c.hashtag.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3).map(challenge => (
                <div key={challenge.id} className="search-result-item">
                  <span className="result-icon">#</span>
                  <span>{challenge.hashtag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trending Sounds - Horizontal Scroll */}
      <section className="trending-sounds-section">
        <div className="section-header">
          <h2 className="section-title">Trending Sounds</h2>
          <button className="see-all-btn">See All</button>
        </div>
        <div className="sounds-scroll">
          {trendingSounds.map(sound => (
            <div key={sound.id} className={`sound-card ${playingSoundId === sound.id ? 'playing' : ''}`}>
              <div className="sound-cover-wrapper" onClick={() => handlePlaySound(sound.id)}>
                <img className="sound-cover" src={sound.coverUrl} alt={sound.name} />
                <div className="play-overlay">
                  <span className="play-btn-icon">{playingSoundId === sound.id ? '⏸' : '▶'}</span>
                </div>
              </div>
              <span className="sound-name">{sound.name}</span>
              <span className="sound-artist">{sound.artistName}</span>
              <span className="sound-videos">{formatCount(sound.videoCount)} videos</span>
            </div>
          ))}
        </div>
      </section>

      {/* Hashtag Challenges */}
      <section className="challenges-section">
        <div className="section-header">
          <h2 className="section-title">Challenges</h2>
          <button className="see-all-btn">See All</button>
        </div>
        <div className="challenges-scroll">
          {challenges.map(challenge => (
            <div key={challenge.id} className="challenge-banner-card">
              <img className="challenge-banner" src={challenge.bannerUrl} alt={challenge.title} />
              <div className="challenge-overlay">
                {challenge.sponsored && <span className="sponsored-badge">Sponsored</span>}
                <h3 className="challenge-hashtag">{challenge.hashtag}</h3>
                <p className="challenge-title">{challenge.title}</p>
                <div className="challenge-stats">
                  <span className="challenge-videos">{formatCount(challenge.videoCount)} videos</span>
                  <span className="challenge-participants">{formatCount(challenge.participantCount)} creators</span>
                </div>
                {challenge.prizePool && (
                  <span className="prize-badge">Prize: {challenge.prizePool}</span>
                )}
                <button className="participate-btn">Participate</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Creator Spotlights Carousel */}
      <section className="spotlights-section">
        <div className="section-header">
          <h2 className="section-title">Creator Spotlights</h2>
        </div>
        {currentSpotlight && (
          <div className="spotlight-carousel">
            <button className="carousel-prev" onClick={handlePrevSpotlight}>&lt;</button>
            <div className="spotlight-card">
              <img className="spotlight-avatar" src={currentSpotlight.avatarUrl} alt={currentSpotlight.displayName} />
              <div className="spotlight-info">
                <div className="spotlight-name-row">
                  <h3 className="spotlight-name">{currentSpotlight.displayName}</h3>
                  {currentSpotlight.isVerified && <span className="verified-icon">&#10003;</span>}
                </div>
                <span className="spotlight-username">@{currentSpotlight.username}</span>
                <p className="spotlight-bio">{currentSpotlight.bio}</p>
                <div className="spotlight-stats">
                  <span>{formatCount(currentSpotlight.followerCount)} followers</span>
                  <span>{currentSpotlight.videoCount} videos</span>
                </div>
                <span className="spotlight-category">{currentSpotlight.category}</span>
                <button className="follow-spotlight-btn">Follow</button>
              </div>
            </div>
            <button className="carousel-next" onClick={handleNextSpotlight}>&gt;</button>
            <div className="carousel-dots">
              {spotlights.map((_, idx) => (
                <span key={idx} className={`carousel-dot ${idx === spotlightIndex ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Category Tabs + Video Grid */}
      <section className="categories-section">
        <div className="category-tabs">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab}
              className={`category-tab ${activeCategory === tab ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="category-video-grid">
          {categoryVideos.map(video => (
            <div key={video.id} className="discover-video-card">
              <div className="video-thumbnail-wrapper">
                <img className="video-thumbnail" src={video.thumbnailUrl} alt={video.caption} />
                <span className="video-duration">{video.duration}s</span>
                <span className="video-views">{formatCount(video.viewCount)}</span>
              </div>
              <div className="video-card-info">
                <span className="video-creator">@{video.creatorUsername}</span>
                <span className="video-likes">&#10084; {formatCount(video.likes)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DiscoverPage;
