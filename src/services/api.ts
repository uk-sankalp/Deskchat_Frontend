import axios from 'axios';
import { BASE_URL } from '../config';

// Integrated absolute URL for production readiness
export const API_BASE_URL = BASE_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createRoom = async (maxUsers: number = 10, durationMinutes: number = 60, password?: string) => {
  const response = await api.post('/rooms', { maxUsers, durationMinutes, password });
  return response.data; // { roomCode, hostToken, expiresAt, maxUsers, locked }
};

export const joinRoom = async (code: string, sessionId: string, password?: string, hostToken?: string) => {
  const response = await api.post(`/rooms/${code}/join`, { sessionId, password, hostToken });
  return response.data; // { participantId, nickName, avatarColor, isHost, isMuted }
};

export const fetchMessages = async (code: string) => {
  const response = await api.get(`/rooms/${code}/messages`);
  return response.data;
};

export const fetchOnlineParticipants = async (code: string) => {
  const response = await api.get(`/rooms/${code}/participants/online`);
  return response.data;
};

// Host Controls
export const lockRoom = async (code: string, hostToken: string) => {
  await api.post(`/rooms/${code}/lock`, {}, { headers: { 'X-Host-Token': hostToken } });
};

export const unlockRoom = async (code: string, hostToken: string) => {
  await api.post(`/rooms/${code}/unlock`, {}, { headers: { 'X-Host-Token': hostToken } });
};

export const clearChat = async (code: string, hostToken: string) => {
  await api.post(`/rooms/${code}/clear`, {}, { headers: { 'X-Host-Token': hostToken } });
};

export const kickUser = async (code: string, participantId: number, hostToken: string) => {
  await api.post(`/rooms/${code}/kick/${participantId}`, {}, { headers: { 'X-Host-Token': hostToken } });
};

export const muteUser = async (code: string, participantId: number, hostToken: string, minutes: number = 60) => {
  await api.post(`/rooms/${code}/mute/${participantId}`, { minutes }, { headers: { 'X-Host-Token': hostToken } });
};

export const unmuteUser = async (code: string, participantId: number, hostToken: string) => {
  await api.post(`/rooms/${code}/unmute/${participantId}`, {}, { headers: { 'X-Host-Token': hostToken } });
};

export const extendRoom = async (code: string, hostToken: string, extendMinutes: number) => {
  const response = await api.post(`/rooms/${code}/extend`, { extendMinutes }, { headers: { 'X-Host-Token': hostToken } });
  return response.data; // returns new LocalDateTime string
};

export const uploadFile = async (participantId: number, file: File) => {
  const formData = new FormData();
  formData.append('participantId', participantId.toString());
  formData.append('file', file);
  
  const response = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data; // FileResponse { id, fileUrl, originalName, size }
};

export const deleteMessage = async (code: string, messageId: number, hostToken: string) => {
  await api.delete(`/rooms/${code}/messages/${messageId}`, { headers: { 'X-Host-Token': hostToken } });
};

export const updateMaxUsers = async (code: string, hostToken: string, maxUsers: number) => {
  await api.post(`/rooms/${code}/update-user-count`, { maxUsers }, { headers: { 'X-Host-Token': hostToken } });
};
