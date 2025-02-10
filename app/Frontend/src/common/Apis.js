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
export const getRolesHierarchyInDepartment = async (id) => {
  return apiClient.get(`/getRolesHierarchyInDepartment/${id}`);
};
export const getDepartmentsHierarchy = () => {
  return apiClient.get('/getDepartmentsHierarchy');
};

// users endpoints
export const getUsers = async () => {
  return apiClient.get('/getUsers', { params: { isRootLevel: false } });
};
export const getAllUsers = async () => {
  return apiClient.get('/getUsers');
};
export const getRootLevelUsers = () => {
  return apiClient.get('/getUsers', { params: { isRootLevel: true } });
};

// roles endpoints
export const GetRoles = async () => {
  return apiClient.get('/getRoles', { params: { isRootLevel: false } });
};
export const GetAllRoles = async () => {
  return apiClient.get('/getRoles', { params: { isRootLevel: false } });
};
export const GetRootLevelRoles = async () => {
  return apiClient.get('/getRoles', { params: { isRootLevel: true } });
};
