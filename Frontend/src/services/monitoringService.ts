import apiClient from './apiClient';
import { ScreenshotItem, UserProfile } from '../types/chat.types';

export interface MonitoringStats {
  totalUsers: number;
  onlineCount: number;
  onlineUsers: UserProfile[];
  totalScreenshots: number;
}

export const getMonitoringStatsApi = async (): Promise<{ success: boolean; data: MonitoringStats }> => {
  const res = await apiClient.get('/monitoring/stats');
  return res.data;
};

export const saveScreenshotApi = async (payload: {
  targetUserId: string;
  targetUsername: string;
  capturedBy: string;
  capturedByName: string;
  base64Image: string;
  captureType: 'manual' | 'interval';
  intervalSeconds?: number;
}): Promise<{ success: boolean; data: ScreenshotItem }> => {
  const res = await apiClient.post('/monitoring/snapshot', payload);
  return res.data;
};

export const getUserScreenshotsApi = async (
  userId: string,
  page: number = 1,
  limit: number = 30
): Promise<{ success: boolean; count: number; total: number; data: ScreenshotItem[] }> => {
  const res = await apiClient.get(`/monitoring/snapshots/${userId}?page=${page}&limit=${limit}`);
  return res.data;
};

export const deleteScreenshotApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.delete(`/monitoring/snapshots/${id}`);
  return res.data;
};
