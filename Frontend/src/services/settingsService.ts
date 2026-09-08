import apiClient from './apiClient';
import { UserSettings } from '../types/chat.types';

export const updateSettingsApi = async (userId: string, settings: UserSettings): Promise<{ success: boolean; data: UserSettings }> => {
  const res = await apiClient.put(`/settings/update/${userId}`, { settings });
  return res.data;
};

export const clearChatHistoryApi = async (userId: string): Promise<{ success: boolean }> => {
  try {
    const res = await apiClient.post(`/settings/clear-chat/${userId}`);
    return res.data;
  } catch (err) {
    const res = await apiClient.post(`/chat/clear-chat/${userId}`);
    return res.data;
  }
};

