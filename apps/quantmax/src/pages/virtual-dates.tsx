// ============================================================================
// QuantMax - Virtual Date Activities
// Activity picker cards (Watch Together/Play Game/Cook Together/Trivia),
// synchronized video player, mini-game area, shared whiteboard canvas,
// rate date modal (stars + comment)
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface DateActivity {
  id: string;
  name: string;
  icon: string;
  description: string;
  duration: string;
  category: 'watch' | 'play' | 'cook' | 'trivia' | 'creative';
}

interface VideoContent {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  category: string;
}

interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface WhiteboardStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  userId: string;
}

interface DatePartner {
  id: string;
  displayName: string;
  avatarUrl: string;
}

interface DateRating {
  stars: number;
  comment: string;
}

type DateState = 'picker' | 'activity' | 'rating';
type ActiveActivity = 'watch' | 'game' | 'cook' | 'trivia' | 'whiteboard' | null;

const DATE_ACTIVITIES: DateActivity[] = [
  { id: 'watch', name: 'Watch Together', icon: '🎬', description: 'Watch videos, movies or shows together in sync', duration: '15-60 min', category: 'watch' },
  { id: 'game', name: 'Play a Game', icon: '🎮', description: 'Fun mini-games to play together and compete', duration: '5-20 min', category: 'play' },
  { id: 'cook', name: 'Cook Together', icon: '🍳', description: 'Follow recipes together and show off your skills', duration: '30-60 min', category: 'cook' },
  { id: 'trivia', name: 'Trivia Night', icon: '🧠', description: 'Test your knowledge with fun trivia questions', duration: '10-30 min', category: 'trivia' },
  { id: 'whiteboard', name: 'Draw Together', icon: '🎨', description: 'Shared whiteboard for drawing, doodling, or pictionary', duration: '10-30 min', category: 'creative' },
];

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  { id: 'q1', question: 'What is the tallest mountain in the world?', options: ['K2', 'Mount Everest', 'Kangchenjunga', 'Makalu'], correctIndex: 1 },
  { id: 'q2', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correctIndex: 2 },
  { id: 'q3', question: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Rembrandt'], correctIndex: 1 },
  { id: 'q4', question: 'What year did the internet become publicly available?', options: ['1989', '1991', '1993', '1995'], correctIndex: 1 },
  { id: 'q5', question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correctIndex: 2 },
];

const CANVAS_COLORS = ['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#ff6600', '#9900cc'];

const VirtualDatesPage: React.FC = () => {
  const [dateState, setDateState] = useState<DateState>('picker');
  const [activeActivity, setActiveActivity] = useState<ActiveActivity>(null);
  const [partner, setPartner] = useState<DatePartner | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Watch Together state
  const [videoContent, setVideoContent] = useState<VideoContent[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const [videoProgress, setVideoProgress] = useState<number>(0);

  // Game state
  const [gameScore, setGameScore] = useState<{ me: number; partner: number }>({ me: 0, partner: 0 });
  const [gameRound, setGameRound] = useState<number>(1);
  const [gameChoice, setGameChoice] = useState<string | null>(null);
  const [partnerChoice, setPartnerChoice] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<string | null>(null);

  // Trivia state
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [triviaScore, setTriviaScore] = useState<{ me: number; partner: number }>({ me: 0, partner: 0 });
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState<boolean>(false);

  // Whiteboard state
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawColor, setDrawColor] = useState<string>('#000000');
  const [drawWidth, setDrawWidth] = useState<number>(3);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);

  // Rating state
  const [rating, setRating] = useState<DateRating>({ stars: 0, comment: '' });
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Simulate having a partner
    setPartner({
      id: 'partner-1',
      displayName: 'Emma',
      avatarUrl: 'https://cdn.quantmax.app/dating/partner.jpg',
    });
    loadVideoContent();
  }, []);

  const loadVideoContent = useCallback(async () => {
    const videos: VideoContent[] = Array.from({ length: 8 }, (_, i) => ({
      id: `video-${i}`,
      title: ['Sunset Documentary', 'Travel Vlog', 'Cooking Show', 'Comedy Special', 'Nature Film', 'Music Concert', 'Art Tutorial', 'Funny Animals'][i],
      thumbnailUrl: `https://cdn.quantmax.app/watch-together/${i}.jpg`,
      duration: [45, 22, 35, 60, 50, 30, 25, 15][i],
      category: ['Documentary', 'Travel', 'Food', 'Comedy', 'Nature', 'Music', 'Art', 'Animals'][i],
    }));
    setVideoContent(videos);
  }, []);

  const handleSelectActivity = useCallback((activity: DateActivity) => {
    setActiveActivity(activity.id as ActiveActivity);
    setDateState('activity');
  }, []);

  const handleEndActivity = useCallback(() => {
    setDateState('rating');
  }, []);

  const handleBackToPicker = useCallback(() => {
    setActiveActivity(null);
    setDateState('picker');
    setVideoProgress(0);
    setIsVideoPlaying(false);
    setGameScore({ me: 0, partner: 0 });
    setGameRound(1);
    setTriviaIndex(0);
    setTriviaScore({ me: 0, partner: 0 });
    setStrokes([]);
  }, []);

  // Watch Together handlers
  const handleSelectVideo = useCallback((video: VideoContent) => {
    setSelectedVideo(video);
    setIsVideoPlaying(true);
    setVideoProgress(0);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsVideoPlaying(prev => !prev);
  }, []);

  // Game handlers (Rock Paper Scissors)
  const handleGameChoice = useCallback((choice: string) => {
    setGameChoice(choice);
    const partnerOptions = ['rock', 'paper', 'scissors'];
    const pChoice = partnerOptions[Math.floor(Math.random() * 3)];
    setPartnerChoice(pChoice);

    let result: string;
    if (choice === pChoice) result = 'Draw!';
    else if (
      (choice === 'rock' && pChoice === 'scissors') ||
      (choice === 'paper' && pChoice === 'rock') ||
      (choice === 'scissors' && pChoice === 'paper')
    ) {
      result = 'You win!';
      setGameScore(prev => ({ ...prev, me: prev.me + 1 }));
    } else {
      result = 'Partner wins!';
      setGameScore(prev => ({ ...prev, partner: prev.partner + 1 }));
    }
    setGameResult(result);
    setTimeout(() => {
      setGameChoice(null);
      setPartnerChoice(null);
      setGameResult(null);
      setGameRound(prev => prev + 1);
    }, 2000);
  }, []);

  // Trivia handlers
  const handleTriviaAnswer = useCallback((answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setAnswerRevealed(true);
    const currentQ = TRIVIA_QUESTIONS[triviaIndex];
    if (answerIndex === currentQ.correctIndex) {
      setTriviaScore(prev => ({ ...prev, me: prev.me + 1 }));
    }
    // Simulate partner score
    if (Math.random() > 0.5) {
      setTriviaScore(prev => ({ ...prev, partner: prev.partner + 1 }));
    }
    setTimeout(() => {
      setSelectedAnswer(null);
      setAnswerRevealed(false);
      if (triviaIndex < TRIVIA_QUESTIONS.length - 1) {
        setTriviaIndex(prev => prev + 1);
      }
    }, 2000);
  }, [triviaIndex]);

  // Whiteboard handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDrawing(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setCurrentStroke([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setCurrentStroke(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  }, [isDrawing]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      const newStroke: WhiteboardStroke = {
        id: `stroke-${Date.now()}`,
        points: currentStroke,
        color: drawColor,
        width: drawWidth,
        userId: 'me',
      };
      setStrokes(prev => [...prev, newStroke]);
      setCurrentStroke([]);
    }
  }, [isDrawing, currentStroke, drawColor, drawWidth]);

  const handleClearCanvas = useCallback(() => {
    setStrokes([]);
  }, []);

  // Rating handlers
  const handleSubmitRating = useCallback(() => {
    if (rating.stars === 0) return;
    setRatingSubmitted(true);
  }, [rating]);

  const currentTrivia = useMemo(() => TRIVIA_QUESTIONS[triviaIndex], [triviaIndex]);

  // Activity Picker
  if (dateState === 'picker') {
    return (
      <div className="virtual-dates-page picker">
        <div className="vd-header">
          <h1 className="page-title">Virtual Date</h1>
          {partner && (
            <div className="partner-info">
              <img className="partner-avatar" src={partner.avatarUrl} alt={partner.displayName} />
              <span className="partner-name">with {partner.displayName}</span>
            </div>
          )}
        </div>

        <p className="picker-subtitle">Choose an activity to do together!</p>

        <div className="activities-grid">
          {DATE_ACTIVITIES.map(activity => (
            <div key={activity.id} className="activity-card" onClick={() => handleSelectActivity(activity)}>
              <span className="activity-icon">{activity.icon}</span>
              <h3 className="activity-name">{activity.name}</h3>
              <p className="activity-desc">{activity.description}</p>
              <span className="activity-duration">{activity.duration}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Rating Screen
  if (dateState === 'rating') {
    return (
      <div className="virtual-dates-page rating-screen">
        {!ratingSubmitted ? (
          <div className="rating-card">
            <h2 className="rating-title">How was your date?</h2>
            {partner && (
              <div className="rating-partner">
                <img className="rating-partner-avatar" src={partner.avatarUrl} alt={partner.displayName} />
                <span>with {partner.displayName}</span>
              </div>
            )}
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  className={`star-btn ${star <= rating.stars ? 'active' : ''}`}
                  onClick={() => setRating(prev => ({ ...prev, stars: star }))}
                >
                  &#9733;
                </button>
              ))}
            </div>
            <textarea
              className="rating-comment"
              placeholder="Any thoughts about the date? (optional)"
              value={rating.comment}
              onChange={(e) => setRating(prev => ({ ...prev, comment: e.target.value }))}
              maxLength={200}
            />
            <div className="rating-actions">
              <button className="skip-rating-btn" onClick={handleBackToPicker}>Skip</button>
              <button className="submit-rating-btn" onClick={handleSubmitRating} disabled={rating.stars === 0}>Submit</button>
            </div>
          </div>
        ) : (
          <div className="rating-submitted">
            <span className="check-icon">&#10003;</span>
            <h2>Thanks for rating!</h2>
            <p>Your feedback helps improve matches.</p>
            <button className="back-btn" onClick={handleBackToPicker}>Try Another Activity</button>
          </div>
        )}
      </div>
    );
  }

  // Activity View
  return (
    <div className="virtual-dates-page activity">
      {/* Activity Header */}
      <div className="activity-header">
        <button className="back-btn" onClick={handleBackToPicker}>&larr;</button>
        <h2 className="activity-title">
          {DATE_ACTIVITIES.find(a => a.id === activeActivity)?.name}
        </h2>
        <button className="end-activity-btn" onClick={handleEndActivity}>End Date</button>
      </div>

      {/* Watch Together */}
      {activeActivity === 'watch' && (
        <div className="watch-together">
          {!selectedVideo ? (
            <div className="video-picker">
              <h3>Choose something to watch</h3>
              <div className="video-options">
                {videoContent.map(video => (
                  <div key={video.id} className="video-option-card" onClick={() => handleSelectVideo(video)}>
                    <img className="video-option-thumb" src={video.thumbnailUrl} alt={video.title} />
                    <div className="video-option-info">
                      <span className="video-option-title">{video.title}</span>
                      <span className="video-option-duration">{video.duration} min</span>
                      <span className="video-option-category">{video.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="sync-player">
              <div className="player-area">
                <img className="playing-thumbnail" src={selectedVideo.thumbnailUrl} alt={selectedVideo.title} />
                <div className="player-controls">
                  <button className="play-pause-btn" onClick={handleTogglePlay}>
                    {isVideoPlaying ? '⏸' : '▶'}
                  </button>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${videoProgress}%` }} />
                  </div>
                  <span className="video-time">{selectedVideo.duration} min</span>
                </div>
              </div>
              <p className="sync-indicator">Synchronized with {partner?.displayName}</p>
            </div>
          )}
        </div>
      )}

      {/* Play Game (Rock Paper Scissors) */}
      {activeActivity === 'game' && (
        <div className="game-area">
          <h3 className="game-title">Rock Paper Scissors</h3>
          <div className="game-score-board">
            <span className="my-score">You: {gameScore.me}</span>
            <span className="game-round">Round {gameRound}</span>
            <span className="partner-score">{partner?.displayName}: {gameScore.partner}</span>
          </div>

          {gameResult ? (
            <div className="game-result">
              <div className="choices-display">
                <span className="my-choice">You: {gameChoice}</span>
                <span className="vs">VS</span>
                <span className="partner-choice-display">{partner?.displayName}: {partnerChoice}</span>
              </div>
              <h3 className="result-text">{gameResult}</h3>
            </div>
          ) : (
            <div className="game-choices">
              <p>Make your choice!</p>
              <div className="choice-buttons">
                <button className="choice-btn" onClick={() => handleGameChoice('rock')}>
                  <span className="choice-icon">🪨</span>
                  <span>Rock</span>
                </button>
                <button className="choice-btn" onClick={() => handleGameChoice('paper')}>
                  <span className="choice-icon">📄</span>
                  <span>Paper</span>
                </button>
                <button className="choice-btn" onClick={() => handleGameChoice('scissors')}>
                  <span className="choice-icon">✂️</span>
                  <span>Scissors</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trivia */}
      {activeActivity === 'trivia' && currentTrivia && (
        <div className="trivia-area">
          <div className="trivia-header">
            <span className="trivia-progress">Question {triviaIndex + 1}/{TRIVIA_QUESTIONS.length}</span>
            <div className="trivia-scores">
              <span>You: {triviaScore.me}</span>
              <span>{partner?.displayName}: {triviaScore.partner}</span>
            </div>
          </div>
          <div className="trivia-question-card">
            <h3 className="trivia-question">{currentTrivia.question}</h3>
            <div className="trivia-options">
              {currentTrivia.options.map((option, idx) => (
                <button
                  key={idx}
                  className={`trivia-option ${selectedAnswer === idx ? 'selected' : ''} ${answerRevealed && idx === currentTrivia.correctIndex ? 'correct' : ''} ${answerRevealed && selectedAnswer === idx && idx !== currentTrivia.correctIndex ? 'wrong' : ''}`}
                  onClick={() => !answerRevealed && handleTriviaAnswer(idx)}
                  disabled={answerRevealed}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cook Together (recipe view) */}
      {activeActivity === 'cook' && (
        <div className="cook-together">
          <h3 className="cook-title">Cooking Together</h3>
          <div className="recipe-card">
            <h4>Simple Pasta Carbonara</h4>
            <div className="recipe-steps">
              <div className="recipe-step"><span className="step-num">1</span> Boil water and cook pasta al dente</div>
              <div className="recipe-step"><span className="step-num">2</span> Fry pancetta until crispy</div>
              <div className="recipe-step"><span className="step-num">3</span> Mix eggs, cheese, and pepper</div>
              <div className="recipe-step"><span className="step-num">4</span> Combine pasta with pancetta, add egg mixture off heat</div>
              <div className="recipe-step"><span className="step-num">5</span> Serve with extra cheese and pepper</div>
            </div>
            <div className="cook-timer">
              <span>Timer: 20 min</span>
              <button className="start-timer-btn">Start Timer</button>
            </div>
          </div>
          <p className="cook-note">Show your partner your cooking progress via video!</p>
        </div>
      )}

      {/* Shared Whiteboard */}
      {activeActivity === 'whiteboard' && (
        <div className="whiteboard-area">
          <div className="whiteboard-tools">
            <div className="color-picker">
              {CANVAS_COLORS.map(color => (
                <button
                  key={color}
                  className={`color-swatch ${drawColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setDrawColor(color)}
                />
              ))}
            </div>
            <div className="width-control">
              <label>Size: {drawWidth}px</label>
              <input type="range" min="1" max="20" value={drawWidth} onChange={(e) => setDrawWidth(Number(e.target.value))} />
            </div>
            <button className="clear-canvas-btn" onClick={handleClearCanvas}>Clear</button>
          </div>
          <div
            ref={canvasRef}
            className="whiteboard-canvas"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <svg className="canvas-svg" width="100%" height="100%">
              {strokes.map(stroke => (
                <polyline
                  key={stroke.id}
                  points={stroke.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {isDrawing && currentStroke.length > 0 && (
                <polyline
                  points={currentStroke.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={drawColor}
                  strokeWidth={drawWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
          <p className="whiteboard-note">Drawing is shared with {partner?.displayName} in real-time</p>
        </div>
      )}
    </div>
  );
};

export default VirtualDatesPage;
