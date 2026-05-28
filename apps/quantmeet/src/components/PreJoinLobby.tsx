'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@quant/shared-ui';

interface PreJoinLobbyProps {
  onJoin: (displayName: string) => void;
  meetingTitle?: string;
}

const CAMERA_OPTIONS = [
  { value: 'default', label: 'Default Camera' },
  { value: 'none', label: 'No Camera' },
];

const MIC_OPTIONS = [
  { value: 'default', label: 'Default Microphone' },
  { value: 'none', label: 'No Microphone' },
];

const SPEAKER_OPTIONS = [{ value: 'default', label: 'Default Speaker' }];

export function PreJoinLobby({ onJoin, meetingTitle }: PreJoinLobbyProps) {
  const [displayName, setDisplayName] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [camera, setCamera] = useState('default');
  const [mic, setMic] = useState('default');
  const [speaker, setSpeaker] = useState('default');

  const handleJoin = () => {
    if (displayName.trim()) {
      onJoin(displayName.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <div className="w-full max-w-lg space-y-6">
        {meetingTitle && <h1 className="text-2xl font-bold text-center">{meetingTitle}</h1>}

        <div
          className="relative w-full aspect-video rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden"
          aria-label="Camera preview"
        >
          {videoEnabled ? (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Camera preview</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-2xl text-gray-300">
                  {displayName ? displayName[0].toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-gray-400 text-sm">Camera off</span>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <Button
            variant={audioEnabled ? 'primary' : 'secondary'}
            onClick={() => setAudioEnabled(!audioEnabled)}
            aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            aria-pressed={audioEnabled}
          >
            {audioEnabled ? 'Mic On' : 'Mic Off'}
          </Button>
          <Button
            variant={videoEnabled ? 'primary' : 'secondary'}
            onClick={() => setVideoEnabled(!videoEnabled)}
            aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            aria-pressed={videoEnabled}
          >
            {videoEnabled ? 'Cam On' : 'Cam Off'}
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="camera-select" className="block text-sm font-medium mb-1">
              Camera
            </label>
            <Select
              id="camera-select"
              options={CAMERA_OPTIONS}
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              aria-label="Select camera"
            />
          </div>
          <div>
            <label htmlFor="mic-select" className="block text-sm font-medium mb-1">
              Microphone
            </label>
            <Select
              id="mic-select"
              options={MIC_OPTIONS}
              value={mic}
              onChange={(e) => setMic(e.target.value)}
              aria-label="Select microphone"
            />
          </div>
          <div>
            <label htmlFor="speaker-select" className="block text-sm font-medium mb-1">
              Speaker
            </label>
            <Select
              id="speaker-select"
              options={SPEAKER_OPTIONS}
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
              aria-label="Select speaker"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            aria-label="Display name"
          />
          <Button
            variant="primary"
            onClick={handleJoin}
            disabled={!displayName.trim()}
            className="w-full"
          >
            Join Meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
