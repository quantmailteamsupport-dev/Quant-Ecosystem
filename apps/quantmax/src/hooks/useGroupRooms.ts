// ============================================================================
// QuantMax - useGroupRooms Hook
// Group video rooms state: room management, participants, chat
// ============================================================================

import { useState, useCallback } from 'react';

interface Room {
  id: string;
  topic: string;
  hostId: string;
  hostName: string;
  participants: Participant[];
  maxParticipants: number;
  spectators: number;
  isPrivate: boolean;
  createdAt: number;
  tags: string[];
}

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isHost: boolean;
  joinedAt: number;
}

interface RoomChat {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

interface UseGroupRoomsReturn {
  rooms: Room[];
  currentRoom: Room | null;
  chat: RoomChat[];
  isInRoom: boolean;
  isLoading: boolean;
  loadRooms: () => Promise<void>;
  createRoom: (topic: string, maxParticipants: number, isPrivate: boolean, tags: string[]) => Promise<Room>;
  joinRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendMessage: (message: string) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  kickParticipant: (userId: string) => void;
}

export function useGroupRooms(userId: string): UseGroupRoomsReturn {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [chat, setChat] = useState<RoomChat[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const mockRooms: Room[] = Array.from({ length: 8 }, (_, i) => ({
      id: `room-${i}`, topic: ['Friday Night Hangout', 'Music Lovers', 'Gaming Squad', 'Study Group', 'Cooking Class', 'Movie Discussion', 'Language Exchange', 'Art & Design'][i],
      hostId: `user-${i}`, hostName: `Host${i + 1}`, maxParticipants: [4, 6, 8, 4, 6, 8, 4, 6][i],
      participants: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({ id: `p-${i}-${j}`, name: `User${j + 1}`, avatar: '', isMuted: j > 2, isCameraOff: j > 3, isHost: j === 0, joinedAt: Date.now() - j * 60000 })),
      spectators: Math.floor(Math.random() * 20), isPrivate: i % 4 === 0, createdAt: Date.now() - i * 3600000, tags: [['social', 'fun'], ['music'], ['gaming', 'esports'], ['study', 'productivity']][i % 4],
    }));
    setRooms(mockRooms);
    setIsLoading(false);
  }, []);

  const createRoom = useCallback(async (topic: string, maxParticipants: number, isPrivate: boolean, tags: string[]): Promise<Room> => {
    const room: Room = {
      id: `room-${Date.now()}`, topic, hostId: userId, hostName: 'You', maxParticipants, isPrivate, createdAt: Date.now(), tags, spectators: 0,
      participants: [{ id: userId, name: 'You', avatar: '', isMuted: false, isCameraOff: false, isHost: true, joinedAt: Date.now() }],
    };
    setRooms(prev => [room, ...prev]);
    setCurrentRoom(room);
    setChat([{ id: 'sys-1', userId: 'system', userName: 'System', message: `Room "${topic}" created!`, timestamp: Date.now() }]);
    return room;
  }, [userId]);

  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return false;
    if (room.participants.length >= room.maxParticipants) return false;
    const me: Participant = { id: userId, name: 'You', avatar: '', isMuted: false, isCameraOff: false, isHost: false, joinedAt: Date.now() };
    const updatedRoom = { ...room, participants: [...room.participants, me] };
    setCurrentRoom(updatedRoom);
    setRooms(prev => prev.map(r => r.id === roomId ? updatedRoom : r));
    setChat([{ id: 'sys-join', userId: 'system', userName: 'System', message: 'You joined the room!', timestamp: Date.now() }]);
    return true;
  }, [rooms, userId]);

  const leaveRoom = useCallback(() => {
    if (!currentRoom) return;
    setRooms(prev => prev.map(r => r.id === currentRoom.id ? { ...r, participants: r.participants.filter(p => p.id !== userId) } : r));
    setCurrentRoom(null);
    setChat([]);
  }, [currentRoom, userId]);

  const sendMessage = useCallback((message: string) => {
    const msg: RoomChat = { id: `msg-${Date.now()}`, userId, userName: 'You', message, timestamp: Date.now() };
    setChat(prev => [...prev, msg]);
  }, [userId]);

  const toggleMute = useCallback(() => {
    if (!currentRoom) return;
    setCurrentRoom(prev => prev ? { ...prev, participants: prev.participants.map(p => p.id === userId ? { ...p, isMuted: !p.isMuted } : p) } : null);
  }, [currentRoom, userId]);

  const toggleCamera = useCallback(() => {
    if (!currentRoom) return;
    setCurrentRoom(prev => prev ? { ...prev, participants: prev.participants.map(p => p.id === userId ? { ...p, isCameraOff: !p.isCameraOff } : p) } : null);
  }, [currentRoom, userId]);

  const kickParticipant = useCallback((targetId: string) => {
    if (!currentRoom) return;
    setCurrentRoom(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.id !== targetId) } : null);
  }, [currentRoom]);

  return { rooms, currentRoom, chat, isInRoom: !!currentRoom, isLoading, loadRooms, createRoom, joinRoom, leaveRoom, sendMessage, toggleMute, toggleCamera, kickParticipant };
}

export default useGroupRooms;
