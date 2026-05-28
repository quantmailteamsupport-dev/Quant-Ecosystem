'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMeeting } from '../../../hooks/useMeeting';
import { useParticipants } from '../../../hooks/useParticipants';
import { PreJoinLobby } from '../../../components/PreJoinLobby';
import { ParticipantGrid } from '../../../components/ParticipantGrid';
import { ControlBar } from '../../../components/ControlBar';
import { ChatPanel } from '../../../components/ChatPanel';
import { ParticipantList } from '../../../components/ParticipantList';
import { MeetingEnded } from '../../../components/MeetingEnded';
import type { VideoTileProps, ChatMessage } from '../../../types/components';

type MeetingState = 'lobby' | 'meeting' | 'ended';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { data: meeting } = useMeeting(roomId);
  const { data: participants } = useParticipants(roomId);

  const [meetingState, setMeetingState] = useState<MeetingState>('lobby');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [localParticipantId] = useState(() => crypto.randomUUID());

  const handleJoin = useCallback(() => {
    setMeetingState('meeting');
  }, []);

  const handleLeave = useCallback(() => {
    setMeetingState('ended');
  }, []);

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        participantId: localParticipantId,
        displayName: 'You',
        content,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, newMessage]);
    },
    [localParticipantId],
  );

  const handleRejoin = useCallback(() => {
    setMeetingState('lobby');
  }, []);

  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  if (meetingState === 'lobby') {
    return <PreJoinLobby onJoin={handleJoin} meetingTitle={meeting?.title} />;
  }

  if (meetingState === 'ended') {
    return (
      <MeetingEnded
        meetingTitle={meeting?.title}
        participantCount={participants?.length}
        hasRecording={recordingActive}
        onRejoin={handleRejoin}
        onGoHome={handleGoHome}
      />
    );
  }

  const videoParticipants: VideoTileProps[] = (participants ?? []).map((p) => ({
    participantId: p.id,
    stream: null,
    displayName: p.displayName,
    audioEnabled: p.audioEnabled,
    videoEnabled: p.videoEnabled,
    isSpeaking: p.isSpeaking,
    isPinned: false,
    isScreenShare: p.isScreenSharing,
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0">
          <ParticipantGrid
            participants={videoParticipants}
            layout="grid"
            activeSpeakerId={null}
            pinnedParticipantId={null}
          />
        </main>

        {showChat && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            participantId={localParticipantId}
          />
        )}

        {showParticipants && !showChat && (
          <ParticipantList participants={participants ?? []} hostId={meeting?.hostId ?? null} />
        )}
      </div>

      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        screenShareEnabled={screenShareEnabled}
        recordingActive={recordingActive}
        onToggleAudio={() => setAudioEnabled((prev) => !prev)}
        onToggleVideo={() => setVideoEnabled((prev) => !prev)}
        onToggleScreenShare={() => setScreenShareEnabled((prev) => !prev)}
        onToggleRecording={() => setRecordingActive((prev) => !prev)}
        onLeave={handleLeave}
        onOpenChat={() => {
          setShowChat((prev) => !prev);
          setShowParticipants(false);
        }}
        onOpenTranscript={() => {
          setShowParticipants((prev) => !prev);
          setShowChat(false);
        }}
      />
    </div>
  );
}
