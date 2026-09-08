import apiClient from './apiClient';
import { UserProfile, ChatMessage, RecentChatUser } from '../types/chat.types';

export const searchUsersApi = async (username: string): Promise<{ success: boolean; data: UserProfile[] }> => {
  const res = await apiClient.get(`/users/search?username=${encodeURIComponent(username)}`);
  return res.data;
};

export const getAllUsersApi = async (): Promise<{ success: boolean; data: UserProfile[] }> => {
  const res = await apiClient.get('/users/all');
  return res.data;
};

export const getUserByIdApi = async (userId: string): Promise<{ success: boolean; data: UserProfile }> => {
  const res = await apiClient.get(`/users/${userId}`);
  return res.data;
};

export const getRecentChatUsersApi = async (userId: string): Promise<{ success: boolean; data: RecentChatUser[] }> => {
  const res = await apiClient.get(`/users/recent/${userId}`);
  return res.data;
};

export const fetchConversationMessagesApi = async (
  conversationId: string,
  page: number = 1,
  userId?: string
): Promise<{ success: boolean; data: ChatMessage[]; page: number }> => {
  const url = `/chat/messages/${conversationId}?page=${page}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`;
  const res = await apiClient.get(url);
  return res.data;
};

export const uploadFileApi = async (file: File): Promise<{
  success: boolean;
  message: string;
  data: { fileUrl: string; fileName: string; fileType: string };
}> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await apiClient.post('/chat/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const updateAvatarApi = async (userId: string, avatarUrl: string): Promise<{
  success: boolean;
  data: UserProfile;
}> => {
  const res = await apiClient.post('/users/avatar', { userId, avatar: avatarUrl });
  return res.data;
};

export const updateProfileApi = async (userId: string, username: string, email: string): Promise<{
  success: boolean;
  message?: string;
  data: UserProfile;
}> => {
  const res = await apiClient.put('/users/profile', { userId, username, email });
  return res.data;
};

export const sendEmailOtpApi = async (userId: string, email: string): Promise<{
  success: boolean;
  message: string;
}> => {
  const res = await apiClient.post('/users/send-otp', { userId, email });
  return res.data;
};

export const verifyEmailOtpApi = async (userId: string, otp: string): Promise<{
  success: boolean;
  message: string;
  data?: UserProfile;
}> => {
  const res = await apiClient.post('/users/verify-otp', { userId, otp });
  return res.data;
};




