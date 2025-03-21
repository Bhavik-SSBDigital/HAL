import axios from 'axios';
import {
  download,
  upload,
} from '../components/drop-file-input/FileUploadDownload';

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
export const CreateUser = (url, data) => {
  return apiClient.post(url, data);
};
export const EditUser = (url, data) => {
  return apiClient.post(url, data);
};
export const DeleteUser = (id) => {
  return apiClient.post(`/deleteUser/${id}`);
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
export const GetRoleDetailsById = async (id) => {
  return apiClient.get(`/getRole/${id}`);
};
export const EditRoleById = async (id, data) =>{
  return apiClient.put(`/editRole/${id}`, data)
}

// workflow endpoints
export const CreateWorkflow = async (data) => {
  return apiClient.post('/workflows/addWorkflow', data);
};
export const GetWorkflows = async () => {
  return apiClient.get('/workflows/getWorkflows');
};

// usernames endpoints
export const GetUsersWithDetails = async () => {
  return apiClient.get('/getUsersWithDetails');
};

// documents apis
export const uploadDocumentInProcess = async (fileList, name, tags) => {
  const res = await upload(fileList, '../check', name, true, tags);
  return res;
};
export const ViewDocument = async (name, path) => {
  const res = await download(name, path, true);
  return res;
};

// processes endpoints
export const ProcessInitiate = async (data) => {
  return apiClient.post('/initiateProcess', data);
};
export const GetProcessesList = async () => {
  return apiClient.get('/getUserProcesses');
};
export const GetProcessData = async (id) => {
  return apiClient.get(`/viewProcess/${id}`);
};
export const ClaimProcess = async (processId, stepInstanceId) => {
  return apiClient.post('/claimProcessStep', { processId, stepInstanceId });
};
