import axios from 'axios';
import {
  download,
  upload,
} from '../components/drop-file-input/FileUploadDownload';
import { toast } from 'react-toastify';

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
export const CreateUser = (data) => {
  return apiClient.post('/signup', data);
};
export const EditUser = (id, data) => {
  return apiClient.put(`/editUser/${id}`, data);
};
export const DeleteUser = (id) => {
  return apiClient.post(`/deleteUser/${id}`);
};
export const GetUser = (id) => {
  return apiClient.get(`/getUser/${id}`);
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
export const EditRoleById = async (id, data) => {
  return apiClient.put(`/editRole/${id}`, data);
};
export const AddRole = async (data) => {
  return apiClient.put(`/AddRole`, data);
};

// workflow endpoints
export const CreateWorkflow = async (data) => {
  return apiClient.post('/workflows/addWorkflow', data);
};
export const EditWorkflow = async (id, data) => {
  return apiClient.put(`/workflows/editWorkflow/${id}`, data);
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
export const RejectDocument = async (processId, documentId, reason) => {
  return apiClient.post('/rejectDocument', {
    processId,
    documentId,
    reason,
  });
};
export const SignDocument = async (
  processId,
  processStepInstanceId,
  documentId,
  remarks,
) => {
  return apiClient.post('/signDocument', {
    processId,
    processStepInstanceId,
    documentId,
    remarks,
  });
};
export const DownloadFolder = (folderPath, folderName) => {
  return apiClient.post(
    '/downloadFolder',
    {
      folderPath,
      folderName,
    },
    { responseType: 'arraybuffer' },
  );
};
export const DownloadFile = async (name, path) => {
  try {
    await download(name, path);
  } catch (error) {
    toast.error(error?.response?.data?.message || error?.messsage);
  }
};
export const CutPaste = (body) => {
  console.log(body);
  return apiClient.post('/cutFile', body);
};
export const CopyPaste = (body) => {
  return apiClient.post('/copyFile', body);
};
export const CreateFolder = (path, folder) => {
  return apiClient.post('/createFolder', { path: `${path}/${folder}` });
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
export const CompleteProcess = async (id) => {
  return apiClient.post(`/completeStep`, { stepInstanceId: id });
};
export const ClaimProcess = async (processId, stepInstanceId) => {
  return apiClient.post('/claimProcessStep', { processId, stepInstanceId });
};

// file and folders
export const GetFolderData = (path) => {
  return apiClient.post('/accessFolder', { path });
};
export const GetRootFolders = () => {
  return apiClient.post('/getProjects');
};

// profile
export const GetSignature = () => {
  return apiClient.get('/getUserSignature', { responseType: 'blob' });
};
export const GetProfilePic = () => {
  return apiClient.get('/getUserProfilePic', { responseType: 'blob' });
};
export const GetProfileData = () => {
  return apiClient.get('/getUserProfileData');
};
