import axios from 'axios';

const rawBaseURL =
     import.meta.env.VITE_API_BASE_URL ||
     import.meta.env.VITE_BASEURL ||
     import.meta.env.VITE_BASE_URL

if (!rawBaseURL) {
     throw new Error('VITE_API_BASE_URL is not configured')
}

const api = axios.create({
     baseURL: rawBaseURL.replace(/\/+$/, ''),
})

export default api;
