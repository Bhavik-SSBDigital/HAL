import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import { useSelector } from 'react-redux';
import styles from './drop-file-input.module.css';
import { ImageConfig } from '../../config/ImageConfig';
import uploadImg from '../../assets/cloud-upload-regular-240.png';

import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import PopupState, { bindTrigger, bindPopover } from 'material-ui-popup-state';

import {
  download,
  getFileSize,
  upload,
  uploadFileWithChunks,
  getContentTypeFromExtension,
} from './FileUploadDownload';
import { toast } from 'react-toastify';
import { IconCloudUpload } from '@tabler/icons-react';

const DropFileInput = (props) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const wrapperRef = useRef(null);

  const [fileList, setFileList] = useState([]);
  const [error, setError] = useState(null);
  const pathValue = useSelector((state) => state.path.value);
  const onDragEnter = () => wrapperRef.current.classList.add('dragover');

  const onDragLeave = () => wrapperRef.current.classList.remove('dragover');

  const onDrop = () => wrapperRef.current.classList.remove('dragover');

  const onFileDrop = (e) => {
    const newFile = e.target.files[0];
    if (newFile) {
      const fileName = newFile.name;
      const fileNameWithoutExtension = fileName.replace(/\.[^.]+$/, '');
      const hasSpecialCharacters = /^[a-zA-Z0-9_\-()\[\]\s]*$/.test(
        fileNameWithoutExtension,
      );

      if (!hasSpecialCharacters) {
        toast.warn('File name must not contain special characters');
      } else {
        const updatedList = [...fileList, newFile];
        setFileList(updatedList);
        props.onFileChange(updatedList);
      }
    }
  };

  const fileRemove = (file) => {
    const updatedList = [...fileList];
    updatedList.splice(fileList.indexOf(file), 1);
    setFileList(updatedList);
    props.onFileChange(updatedList);
  };

  const url = backendUrl + '/createPermissions';
  const endpoint = backendUrl + '/getUsernames';
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await axios.get(endpoint);
      // console.log(data.usernames)
      setUserList(data.users);
    };
    fetchData();
  }, []);
  const [userList, setUserList] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const handlePermissionChange = (e, user, filename) => {
    if (!e.target.checked) {
      const matchingPermission = permissions.find(
        (item) => item.filename === selectedFile,
      );
      if (matchingPermission) {
        if (e.target.name === 'read') {
          const updatedReadArray = matchingPermission.read.filter(
            (item) => item !== user,
          );
          setPermissions((prev) =>
            prev.map((permission) =>
              permission.filename === selectedFile
                ? { ...permission, read: updatedReadArray }
                : permission,
            ),
          );
        } else {
          const updatedReadArray = matchingPermission.write.filter(
            (item) => item !== user,
          );
          setPermissions((prev) =>
            prev.map((permission) =>
              permission.filename === selectedFile
                ? { ...permission, write: updatedReadArray }
                : permission,
            ),
          );
        }
      }
    } else {
      const check = permissions.find((item) => item.filename === filename);
      if (check) {
        if (e.target.name === 'read') {
          setPermissions((prev) =>
            prev.map((item) =>
              item.filename === filename
                ? {
                    ...item,
                    read: item.read.includes(user)
                      ? item.read
                      : [...item.read, user],
                  }
                : item,
            ),
          );
        } else {
          setPermissions((prev) =>
            prev.map((item) =>
              item.filename === filename
                ? {
                    ...item,
                    write: item.write.includes(user)
                      ? item.write
                      : [...item.write, user],
                  }
                : item,
            ),
          );
        }
      } else {
        const newPermission = {
          filename: filename,
          filePath: `${pathValue}/${filename}`,
          read: e.target.name === 'read' ? [user] : [],
          write: e.target.name === 'write' ? [user] : [],
        };
        setPermissions((prev) => [...prev, newPermission]);
      }
    }
  };
  const handleHitBackPoint = async () => {
    await axios.post(url, { permissions: permissions });
    setPermissions([]);
  };
  const [loading, setLoading] = useState(false);
  const handleUpload = async () => {
    try {
      setLoading(true);
      await upload(fileList, pathValue, props.getData);
      await handleHitBackPoint();
      setLoading(false);
      props.setOpen(false);
    } catch (error) {
      setLoading(false);
      props.setOpen(false);
      toast.error(error.message);
    }
  };
  const handleSelectedFileChange = (name) => {
    setSelectedFile(name);
  };
  function formatSize(sizeInBytes) {
    if (sizeInBytes < 1024) {
      return sizeInBytes + ' bytes';
    } else if (sizeInBytes < 1024 * 1024) {
      return (sizeInBytes / 1024).toFixed(1) + ' KB';
    } else {
      return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  }
  const truncateFileName = (fname, maxLength = 10) => {
    if (fname.length <= maxLength) {
      return fname;
    } else {
      const [baseName, extension] = fname.split('.').reduce(
        (result, part, index, array) => {
          if (index === array.length - 1) {
            result[1] = part;
          } else {
            result[0] += part;
          }
          return result;
        },
        ['', ''],
      );
      const truncatedName = `${baseName.slice(0, 8)}..${baseName.slice(-3)}`;
      return `${truncatedName}.${extension}`;
    }
  };
  return (
    <>
      <div
        ref={wrapperRef}
        className={styles['drop-file-input']}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: '2px dashed #ccc',
          borderRadius: '5px',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div className={styles['drop-file-input__label']}>
          <IconCloudUpload
            color="#4E327E"
            size={35}
            style={{ marginLeft: 'auto', marginRight: 'auto' }}
          />
          <Typography
            sx={{ fontSize: '16px', fontWeight: 'bold', color: 'black', mt: 1 }}
          >
            Drag & Drop files here
          </Typography>
          <Divider sx={{ my: 1 }}>OR</Divider>
          <Typography
            variant="h6"
            sx={{ color: 'blue', textDecoration: 'underline' }}
          >
            Browse
          </Typography>
        </div>
        <input type="file" value="" onChange={onFileDrop} />
      </div>
      {fileList.length > 0 ? (
        <>
          <div className={styles['drop-file-preview']}>
            {fileList.map((item, index) => (
              <>
                <Stack
                  sx={{
                    // backgroundColor: '#f5f8ff',
                    alignItems: 'center',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    key={index}
                    className={styles['drop-file-preview__item']}
                  >
                    <img
                      src={
                        ImageConfig[item.name.split('.')[1]] ||
                        ImageConfig['default']
                      }
                      alt=""
                    />
                    <div className={styles['drop-file-preview__item__info']}>
                      <p>{truncateFileName(item.name)}</p>
                      <p>{formatSize(item.size)}</p>
                    </div>
                    <span
                      className={styles['drop-file-preview__item__del']}
                      onClick={() => (loading ? null : fileRemove(item))}
                    >
                      x
                    </span>
                  </div>
                  <PopupState variant="popover" popupId="demo-popup-popover">
                    {(popupState) => (
                      <Box>
                        <Button
                          variant="text"
                          {...bindTrigger(popupState)}
                          sx={{ mb: '10px' }}
                          onClick={(e) => {
                            popupState.open();
                            handleSelectedFileChange(item.name);
                          }}
                        >
                          ADD USER ACCESS
                        </Button>
                        <Popover
                          {...bindPopover(popupState)}
                          anchorOrigin={{
                            vertical: 'center',
                            horizontal: 'center',
                          }}
                          transformOrigin={{
                            vertical: 'center',
                            horizontal: 'center',
                          }}
                        >
                          <Box sx={{ padding: '10px' }}>
                            <Typography variant="body1">{item.name}</Typography>
                            <TableContainer
                              sx={{ border: '1px solid', maxHeight: '300px' }}
                            >
                              <Table>
                                <TableRow>
                                  <TableCell
                                    sx={{
                                      border: '1px solid lightgray',
                                      fontWeight: 600,
                                    }}
                                  >
                                    SR_NO
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      border: '1px solid lightgray',
                                      fontWeight: 600,
                                    }}
                                  >
                                    User
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      border: '1px solid lightgray',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Read
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>
                                    write
                                  </TableCell>
                                </TableRow>
                                {userList?.map((user, index) => (
                                  <>
                                    <TableRow
                                      flexDirection="row"
                                      gap={1}
                                      padding="4px"
                                      justifyContent="space-between"
                                    >
                                      <TableCell
                                        sx={{
                                          borderRight: '1px solid lightgray',
                                        }}
                                      >
                                        {index + 1}
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          borderRight: '1px solid lightgray',
                                        }}
                                      >
                                        {user.username}
                                      </TableCell>
                                      <TableCell
                                        sx={{
                                          borderRight: '1px solid lightgray',
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          name="read"
                                          checked={permissions
                                            .filter(
                                              (ele) =>
                                                ele.filename === selectedFile,
                                            )[0]
                                            ?.read.includes(user.username)}
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              e,
                                              user.username,
                                              item.name,
                                            )
                                          }
                                        />
                                        Read
                                      </TableCell>
                                      <TableCell>
                                        <input
                                          type="checkbox"
                                          name="write"
                                          checked={permissions
                                            .filter(
                                              (ele) =>
                                                ele.filename === selectedFile,
                                            )[0]
                                            ?.write.includes(user.username)}
                                          onChange={(e) =>
                                            handlePermissionChange(
                                              e,
                                              user.username,
                                              item.name,
                                            )
                                          }
                                        />
                                        Write
                                      </TableCell>
                                    </TableRow>
                                  </>
                                ))}
                              </Table>
                            </TableContainer>
                            <Stack
                              flexDirection="row"
                              justifyContent="center"
                              mt={1}
                            >
                              <Box>
                                <Button
                                  variant="contained"
                                  color="success"
                                  onClick={popupState.close}
                                >
                                  ok
                                </Button>
                              </Box>
                            </Stack>
                          </Box>
                        </Popover>
                      </Box>
                    )}
                  </PopupState>
                </Stack>
              </>
            ))}
          </div>
          <Button
            variant="outlined"
            onClick={handleUpload}
            className={styles['upload-button']}
            disabled={loading}
          >
            {loading ? <CircularProgress size={22} /> : 'Upload'}
          </Button>
        </>
      ) : null}
    </>
  );
};

DropFileInput.propTypes = {
  onFileChange: PropTypes.func,
};

export default DropFileInput;
