import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const getAccessToken = () => sessionStorage.getItem('accessToken');

const apiClient = axios.create({
  baseURL: backendUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// department endpoints
export const getDepartments = async () => {
  return apiClient.get('/getdepartments', { params: { type: 'department' } });
};

// users endpoints
export const getUsers = async () => {
  return apiClient.get('/getUsers', { params: { isRootUser: true } });
};

// roles endpoints
export const getRoles = async () => {
  return apiClient.get('/getRoles', { params: { isRootUser: true } });
};
