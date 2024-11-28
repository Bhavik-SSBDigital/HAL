import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  TextField,
  CircularProgress,
  Typography,
  Tooltip,
  Fab,
  Dialog,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { useQuery, useQueryClient } from 'react-query';
import { setPath } from '../../../Slices/PathSlice';
import DropFileInput from '../../../components/drop-file-input/DropFileInput';
import ComponentLoader from '../../../common/Loader/ComponentLoader';
import Path from '../../../components/path/PathBar';
import { IconFolderPlus } from '@tabler/icons-react';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import AddIcon from '@mui/icons-material/Add';
import imageSrc from '../../../assets/images/folder.png';
import './MenuBar.css';
import styles from './FileSystem.module.css';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

const FileSystem = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const isAdmin = sessionStorage.getItem('username') === 'admin';
  const url = `${backendUrl}/getProjects`;
  const pathValue = useSelector((state) => state.path.value);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const [fileFolders, setFileFolders] = useState([]);
  const [modalContentFor, setModalContentFor] = useState(null);
  const [open, setOpen] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [error, setError] = useState('');

  // React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  const fetchProjects = async () => {
    const accessToken = sessionStorage.getItem('accessToken');
    const { data } = await axios.post(url, null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return data;
  };

  const {
    data: filesData,
    isLoading,
    isFetching,
  } = useQuery('Projects', fetchProjects, {
    onSuccess: (data) => setFileFolders(data.children),
    onError: () => setError('Something went wrong'),
    refetchOnMount: true,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const cachedData = queryClient.getQueryData('Projects');
    if (cachedData) setFileFolders(cachedData.children);
  }, [queryClient]);

  const navigate = useNavigate();
  const handleFolderClick = (name) => {
    dispatch(setPath(name));
    sessionStorage.setItem('path', `../${name}`);
    navigate(name);
  };

  const openModal = (action) => {
    setModalContentFor(action);
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const handlePlus = () => setShowButtons((prev) => !prev);

  const onFileChange = (files) => console.log(files);

  // Create Folder using React Hook Form
  const createFolder = async (data) => {
    try {
      const accessToken = sessionStorage.getItem('accessToken');
      const payload = {
        path: `${pathValue}/${data.folderName}`, // Data from React Hook Form
        isProject: pathValue === '..',
      };
      const { status } = await axios.post(
        `${backendUrl}/createFolder`,
        payload,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (status === 200) {
        const currentDate = new Date().toString();
        setFileFolders((prev) => [
          ...prev,
          {
            createdBy: accessToken,
            createdOn: currentDate,
            name: data.folderName,
            type: 'folder',
          },
        ]);
        closeModal();
        reset();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const truncateFileName = (fileName, maxLength = 10) => {
    return fileName.length > maxLength
      ? `${fileName.substring(0, maxLength - 3)}...`
      : fileName;
  };

  const renderModalContent = () => {
    if (modalContentFor === 'createFolder') {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2,
              background: '#402969',
              p: 1,
              borderRadius: '5px',
            }}
          >
            <IconFolderPlus color="white" style={{ marginRight: '3px' }} />
            <h2 style={{ color: 'white' }}>CREATE FOLDER</h2>
          </Box>
          <form onSubmit={handleSubmit(createFolder)}>
            <TextField
              fullWidth
              variant="outlined"
              label="Folder Name"
              {...register('folderName', {
                required: 'Folder name is required',
                pattern: {
                  value: /^[a-zA-Z0-9_\-()\[\]\s]*$/,
                  message:
                    'Field must contain only letters, numbers, and spaces.',
                },
              })}
              error={!!errors.folderName}
              helperText={errors.folderName ? errors.folderName.message : ''}
            />
            <Box mt={2}>
              <Button
                disabled={isSubmitting}
                type="submit"
                variant="contained"
                color="success"
              >
                {isSubmitting ? <CircularProgress size={22} /> : 'Create'}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={closeModal}
                sx={{ ml: 1 }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      );
    }
    return <DropFileInput setOpen={setOpen} onFileChange={onFileChange} />;
  };

  return (
    <>
      {isLoading ? (
        <ComponentLoader />
      ) : (
        <>
          <Path />
          <Stack
            mt={2}
            spacing={2}
            className={styles.small_scrollbar}
            sx={{ maxHeight: 'calc(100vh - 210px)', overflow: 'auto' }}
          >
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              {isFetching ? (
                <CircularProgress color="inherit" size={30} />
              ) : error ? (
                <Typography>{error}</Typography>
              ) : fileFolders.length === 0 ? (
                <p className={styles.noFolders}>No files or folders found</p>
              ) : (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {fileFolders.map((item, index) => (
                    <Button
                      key={index}
                      onClick={() => handleFolderClick(item.name)}
                      sx={{
                        flexDirection: 'column',
                        backgroundColor: 'white',
                        border: '1px solid lightgray',
                        flex: 1,
                        borderRadius: '15px',
                        height: { xs: '90px', md: '110px' },
                        maxWidth: { xs: '100px', md: '150px' },
                        minWidth: { xs: '90px', md: '110px' },
                        textTransform: 'none',
                        '&:hover': {
                          border: '1px solid blue',
                          background: 'white',
                        },
                      }}
                    >
                      <Tooltip title={item.name.length >= 10 ? item.name : ''}>
                        <Box
                          sx={{
                            height: { xs: 45, md: 60 },
                            width: { xs: 45, md: 60 },
                          }}
                        >
                          <img
                            src={imageSrc}
                            alt="Folder"
                            width="100%"
                            height="100%"
                          />
                        </Box>
                        <Typography variant="body2">
                          {truncateFileName(item.name)}
                        </Typography>
                      </Tooltip>
                    </Button>
                  ))}
                </Stack>
              )}
            </Box>
            <Dialog open={open}>
              <Box className="create-folder-modal-content-container">
                {renderModalContent()}
              </Box>
            </Dialog>
          </Stack>
          {isAdmin && (
            <Fab
              color="primary"
              onClick={handlePlus}
              aria-label="add"
              sx={{ position: 'fixed', bottom: '5%', right: '5%' }}
            >
              <AddIcon />
              {showButtons && (
                <Box sx={{ position: 'absolute', top: '-130%', right: 0 }}>
                  <Button
                    variant="contained"
                    color="info"
                    onClick={() => openModal('createFolder')}
                    sx={{ mb: 1 }}
                  >
                    <CreateNewFolderIcon sx={{ mr: 1 }} />
                    <Typography variant="caption" color="white">
                      New Project
                    </Typography>
                  </Button>
                </Box>
              )}
            </Fab>
          )}
        </>
      )}
    </>
  );
};

export default FileSystem;
