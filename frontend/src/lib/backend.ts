export const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.protocol}//${host}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
};
