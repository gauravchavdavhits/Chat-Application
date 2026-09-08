import apiClient from './apiClient';
import { CallRecord } from '../types/chat.types';

export const getUserCallHistoryApi = async (userId: string): Promise<{ success: boolean; data: CallRecord[] }> => {
  const res = await apiClient.get(`/calls/history/${userId}`);
  return res.data;
};

export const getDirectCallHistoryApi = async (user1Id: string, user2Id: string): Promise<{ success: boolean; data: CallRecord[] }> => {
  const res = await apiClient.get(`/calls/conversation/${user1Id}/${user2Id}`);
  return res.data;
};


