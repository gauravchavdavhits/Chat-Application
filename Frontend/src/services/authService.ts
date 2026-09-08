import axios from 'axios';
import { UserProfile } from '../types/chat.types';

const API_BASE_URL = '/api';

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  data: UserProfile;
}

export const registerApi = async (
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await axios.post(`${API_BASE_URL}/auth/register`, { username, email, password }, { withCredentials: true });
  const token = res.data.accessToken || res.data.token;
  const refreshToken = res.data.refreshToken;

  if (token) {
    localStorage.setItem('auth_token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=900; SameSite=Lax`;
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
  }
  return res.data;
};

export const loginApi = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password }, { withCredentials: true });
  const token = res.data.accessToken || res.data.token;
  const refreshToken = res.data.refreshToken;

  if (token) {
    localStorage.setItem('auth_token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=900; SameSite=Lax`;
  }
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
    document.cookie = `refresh_token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
  }
  return res.data;
};

export const refreshAccessTokenApi = async (): Promise<string | null> => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
    const newAccessToken = res.data.accessToken || res.data.token;
    const newRefreshToken = res.data.refreshToken;

    if (newAccessToken) {
      localStorage.setItem('auth_token', newAccessToken);
      document.cookie = `auth_token=${newAccessToken}; path=/; max-age=900; SameSite=Lax`;
    }
    if (newRefreshToken) {
      localStorage.setItem('refresh_token', newRefreshToken);
      document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=604800; SameSite=Lax`;
    }
    return newAccessToken || null;
  } catch (error) {
    return null;
  }
};

export const logoutApi = async (): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/auth/logout`, {}, { withCredentials: true });
  } catch {}
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  document.cookie = `auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  document.cookie = `refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
};

