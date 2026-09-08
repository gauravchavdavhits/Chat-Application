import apiClient from './apiClient';
import { GroupProfile, RecentGroup } from '../types/chat.types';

export const createGroupApi = async (name: string, adminId: string, members: string[], avatar?: string): Promise<{ success: boolean; data: GroupProfile }> => {
  const res = await apiClient.post('/groups', { name, adminId, members, avatar });
  return res.data;
};

export const getUserGroupsApi = async (userId: string): Promise<{ success: boolean; data: RecentGroup[] }> => {
  const res = await apiClient.get(`/groups/my-groups/${userId}`);
  return res.data;
};

export const updateGroupApi = async (groupId: string, data: Partial<GroupProfile> & { adminId: string }): Promise<{ success: boolean; data: GroupProfile }> => {
  const res = await apiClient.put(`/groups/${groupId}`, data);
  return res.data;
};

export const leaveGroupApi = async (groupId: string, userId: string): Promise<{ success: boolean; message: string }> => {
  const res = await apiClient.post(`/groups/${groupId}/leave`, { userId });
  return res.data;
};

