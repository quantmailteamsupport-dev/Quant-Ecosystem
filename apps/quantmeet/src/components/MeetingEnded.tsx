'use client';

import { Button } from '@quant/shared-ui';

interface MeetingEndedProps {
  meetingTitle?: string;
  duration?: string;
  participantCount?: number;
  hasRecording?: boolean;
  hasTranscript?: boolean;
  onRejoin: () => void;
  onGoHome: () => void;
}

export function MeetingEnded({
  meetingTitle,
  duration,
  participantCount,
  hasRecording,
  hasTranscript,
  onRejoin,
  onGoHome,
}: MeetingEndedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-4xl" aria-hidden="true">
          &#x1F44B;
        </div>
        <h1 className="text-2xl font-bold">Meeting Ended</h1>
        {meetingTitle && <p className="text-[var(--quant-muted-foreground)]">{meetingTitle}</p>}

        <div className="bg-[var(--quant-muted)] rounded-lg p-4 space-y-2 text-sm">
          {duration && (
            <div className="flex justify-between">
              <span className="text-[var(--quant-muted-foreground)]">Duration</span>
              <span className="font-medium">{duration}</span>
            </div>
          )}
          {participantCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-[var(--quant-muted-foreground)]">Participants</span>
              <span className="font-medium">{participantCount}</span>
            </div>
          )}
        </div>

        {(hasRecording || hasTranscript) && (
          <div className="space-y-2">
            {hasRecording && (
              <p className="text-sm text-[var(--quant-muted-foreground)]">
                Recording is being processed and will be available soon.
              </p>
            )}
            {hasTranscript && (
              <p className="text-sm text-[var(--quant-muted-foreground)]">
                Transcript is available for download.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" onClick={onRejoin}>
            Rejoin
          </Button>
          <Button variant="secondary" onClick={onGoHome}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
