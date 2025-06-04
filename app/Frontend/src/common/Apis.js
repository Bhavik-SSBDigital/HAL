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
export const getDepartmentsHierarchy = async () => {
  return apiClient.get('/getDepartmentsHierarchy');
};
export const getDepartmentbyID = async (id) => {
  return apiClient.get(`/getDepartment/${id}`);
};
export const createDepartment = async (data) => {
  return apiClient.post(`/addDepartment`, data);
};
export const editDepartment = async (id, data) => {
  return apiClient.put(`/editDepartment/${id}`, data);
};
export const deleteDepartment = async (id) => {
  return apiClient.delete(`/deleteDepartment/${id}`);
};

// users endpoints
export const getUsers = async () => {
  return apiClient.get('/getUsers', { params: { isRootLevel: false } });
};
export const getAllUsers = async () => {
  return apiClient.get('/getUsers');
};
export const getRootLevelUsers = async () => {
  return apiClient.get('/getUsers', { params: { isRootLevel: true } });
};
export const CreateUser = async (data) => {
  return apiClient.post('/signup', data);
};
export const EditUser = async (id, data) => {
  return apiClient.put(`/editUser/${id}`, data);
};
export const DeleteUser = async (id) => {
  return apiClient.post(`/deleteUser/${id}`);
};
export const GetUser = async (id) => {
  return apiClient.get(`/getUser/${id}`);
};
export const GetUsersWithDetails = async () => {
  return apiClient.get('/getUsersWithDetails');
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
  return apiClient.post(`/addRole`, data);
};
export const deleteRole = async (id) => {
  return apiClient.delete(`/deleteRole/${id}`);
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
export const deleteWorkflow = async (id) => {
  return apiClient.delete(`/workflows/deleteWorkflow/${id}`);
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
export const RejectDocument = async (
  processId,
  documentId,
  processStepInstanceId,
  reason,
) => {
  return apiClient.post('/rejectDocument', {
    processId,
    documentId,
    processStepInstanceId,
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
export const SignRevoke = async (processId, documentId) => {
  return apiClient.post('/revokeSign', {
    processId,
    documentId,
  });
};
export const RevokeRejection = async (processId, documentId) => {
  return apiClient.post('/revokeRejection', {
    processId,
    documentId,
  });
};
export const DownloadFolder = async (folderPath, folderName) => {
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
export const CutPaste = async (body) => {
  return apiClient.post('/cutFile', body);
};
export const CopyPaste = async (body) => {
  return apiClient.post('/copyFile', body);
};
export const CreateFolder = async (path, folder) => {
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
export const CreateQuery = async (data) => {
  return apiClient.post('/queries/createQuery', data);
};
export const removeProcessNotification = async (id) => {
  return apiClient.post(`/removeProcessNotification/${id}`);
};

// file and folders
export const GetFolderData = async (path) => {
  return apiClient.post('/accessFolder', { path });
};
export const GetRootFolders = async () => {
  return apiClient.post('/getProjects');
};

// profile
export const GetSignature = async () => {
  return apiClient.get('/getUserSignature', { responseType: 'blob' });
};
export const GetProfilePic = async () => {
  return apiClient.get('/getUserProfilePic', { responseType: 'blob' });
};
export const GetProfileData = async () => {
  return apiClient.get('/getUserProfileData');
};

// branches endpoints
export const getAllBranches = async () => {
  return apiClient.post('/getAllBranches');
};
export const deleteBranch = async (id) => {
  return apiClient.post(`/deleteBranch/${id}`);
};

// signin endpoints
export const signIn = async (data) => {
  return apiClient.post(`/login`, data);
};

// signUp endpoints
export const changePassword = async (data) => {
  return apiClient.post(`/changePassword`, data);
};

// viewer endpoints
export const storeSignCoordinates = async (data) => {
  return apiClient.post(`/storeSignCoordinates`, data);
};
export const removeCoordinates = async (data) => {
  return apiClient.post(`/removeCoordinates`, data);
};
export const getHighlightsInFile = async (docId) => {
  return apiClient.get(`/getHighlightsInFile/${docId}`);
};
export const getSignCoordinatesForCurrentStep = async (docId) => {
  return apiClient.post(`/getSignCoordinatesForCurrentStep/${docId}`);
};
export const postHighlightInFile = async (data) => {
  return apiClient.post(`/postHighlightInFile`, data);
};

// recommend endpoints
export const createRecommend = async (data) => {
  return apiClient.post('/recommendations/createRecommendation', data);
};
export const getRecommendations = async () => {
  return apiClient.get('/recommendations/getRecommendations');
};
export const getRecommendationDetails = async (id) => {
  return apiClient.get(`/recommendations/${id}`);
};
export const signRecommendDocument = async (data) => {
  return apiClient.post(`/recommendations/signDocument`, data);
};
export const respondRecommendation = async (data) => {
  return apiClient.post(`/recommendations/respond`, data);
};

// logs
export const GetUserLogs = async () => {
  return apiClient.get('/logs/getUserLogs');
};
export const viewLog = async (id) => {
  return apiClient.get(`/logs/${id}`);
};
