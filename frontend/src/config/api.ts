const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8080';

export default BACKEND_URL;

