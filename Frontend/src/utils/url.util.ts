/**
 * Utility to safely resolve static asset URLs (such as /uploads/...)
 * to point to the backend server (Render in production, localhost in development).
 */
export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return '';
  
  // If it's already an absolute URL (e.g. data:image, blob:, http://, https://)
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Determine base backend URL
  const backendBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : '';

  // If it's a relative path like /uploads/...
  if (url.startsWith('/')) {
    return backendBase ? `${backendBase}${url}` : url;
  }

  return backendBase ? `${backendBase}/${url}` : `/${url}`;
};
