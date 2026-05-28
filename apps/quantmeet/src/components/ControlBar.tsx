'use client';

import { Button } from '@quant/shared-ui';
import type { ControlBarProps } from '../types/components';

export function ControlBar({
  audioEnabled,
  videoEnabled,
  screenShareEnabled,
  recordingActive,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onLeave,
  onOpenChat,
  onOpenTranscript,
}: ControlBarProps) {
  return (
    <div
      className="flex items-center justify-center gap-2 md:gap-3 p-3 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700"
      role="toolbar"
      aria-label="Meeting controls"
    >
      <Button
        variant={audioEnabled ? 'secondary' : 'primary'}
        onClick={onToggleAudio}
        aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={audioEnabled}
      >
        {audioEnabled ? 'Mic' : 'Muted'}
      </Button>

      <Button
        variant={videoEnabled ? 'secondary' : 'primary'}
        onClick={onToggleVideo}
        aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        aria-pressed={videoEnabled}
      >
        {videoEnabled ? 'Cam' : 'Cam Off'}
      </Button>

      <Button
        variant={screenShareEnabled ? 'primary' : 'secondary'}
        onClick={onToggleScreenShare}
        aria-label={screenShareEnabled ? 'Stop screen share' : 'Share screen'}
        aria-pressed={screenShareEnabled}
      >
        {screenShareEnabled ? 'Sharing' : 'Share'}
      </Button>

      <Button
        variant={recordingActive ? 'primary' : 'secondary'}
        onClick={onToggleRecording}
        aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
        aria-pressed={recordingActive}
      >
        {recordingActive ? 'Rec' : 'Record'}
      </Button>

      <Button variant="secondary" onClick={onOpenChat} aria-label="Open chat">
        Chat
      </Button>

      <Button variant="secondary" onClick={onOpenTranscript} aria-label="Open transcript">
        Transcript
      </Button>

      <Button variant="danger" onClick={onLeave} aria-label="Leave meeting">
        Leave
      </Button>
    </div>
  );
}
