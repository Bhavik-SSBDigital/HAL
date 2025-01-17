import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { ImageConfig } from '../../config/ImageConfig';
import img from '../../assets/images/folder.png';
import { json, useParams } from 'react-router-dom';
// import styles from './Filefolders.module.css'

function App(props) {
  // console.log(JSON.stringify(props.selection) + "selections");
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [fileSystemData, setFileSystemData] = useState([]);
  useEffect(() => {
    fetchProjectsData(); // Initially load the projects data
  }, [id]);

  async function fetchProjectsData() {
    const url = `${backendUrl}/${
      id ? 'getRootDocumentsForEdit' : 'getProjects'
    }`;
    const accessToken = sessionStorage.getItem('accessToken');
    try {
      const response = await axios.post(url, id ? { role: id } : null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.data.children) {
        throw new Error('Invalid projects data');
      }

      // Add isOpen: false to each object in the array
      const dataWithIsOpen = response.data.children.map((item) => ({
        ...item,
        isOpen: false,
      }));

      setFileSystemData(dataWithIsOpen);
      if (response.data) {
        setLoading(false);
        if (id) {
          props.setSelection({
            selectedView: response.data.selectedView.map((item) => item),
            selectedDownload: response.data.selectedDownload.map(
              (item) => item,
            ),
            selectedUpload: response.data.selectedUpload.map((item) => item),
            fullAccess: response.data.fullAccess.map((item) => item),
          });
        }
      }
    } catch (error) {
      setLoading(false);
      console.error('Error fetching projects data:', error);
    }
  }

  async function fetchFileSystemData(folderId, folderPath) {
    const url = `${backendUrl}/${
      id ? 'getDocumentDetailsOnTheBasisOfPathForEdit' : 'accessFolder'
    }`;

    const accessToken = sessionStorage.getItem('accessToken');
    try {
      const response = await axios.post(
        url,
        {
          path: `${folderPath}`,
          role: id ? id : null,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const updatedData = [...fileSystemData];
      const folder = findFolderById(updatedData, folderId);
      if (folder && folder.type === 'folder') {
        folder.isOpen = !folder.isOpen;

        if (folder.isOpen && folder.children.length === 0) {
          // Remove the unnecessary "children" key here
          folder.children = response.data.children;
        }
        setFileSystemData(updatedData);
      }
      if (response.data) {
        if (id) {
          props.setSelection({
            selectedView: [
              ...props.selection.selectedView,
              ...response.data.selectedView,
            ],
            selectedDownload: [
              ...props.selection.selectedDownload,
              ...response.data.selectedDownload,
            ],
            selectedUpload: [
              ...props.selection.selectedUpload,
              ...response.data.selectedUpload,
            ],
            fullAccess: [
              ...(props.selection.fullAccess || []),
              ...(response.data.fullAccess || []),
            ],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching folder children:', error);
    }
  }

  function handleFolderClick(folderId, e, folderPath) {
    fetchFileSystemData(folderId, folderPath);
    e.stopPropagation();
  }

  function findFolderById(data, folderId) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].id === folderId) {
        return data[i];
      }
      if (data[i].children) {
        const folder = findFolderById(data[i].children, folderId);
        if (folder) {
          return folder;
        }
      }
    }
    return null;
  }

  const handleViewCheckboxChange = (item, name, checked) => {
    props.setSelection((prev) => {
      const fullAccessArray = Array.isArray(prev.fullAccess)
        ? prev.fullAccess
        : [];

      // Check if the ID is not in fullAccess
      if (!fullAccessArray.some((accessItem) => accessItem.id === item.id)) {
        // Add the ID to selectedView based on the checked value
        if (checked) {
          return {
            ...prev,
            selectedView: [...prev.selectedView, item.id],
          };
        } else {
          return {
            ...prev,
            selectedView: prev.selectedView.filter((id) => id !== item.id),
          };
        }
      }

      // Update fullAccess
      const updatedFullAccess = fullAccessArray.map((fullAccessItem) => {
        if (fullAccessItem.id === item.id) {
          return {
            ...fullAccessItem,
            [name]: checked,
          };
        }
        return fullAccessItem;
      });

      return {
        ...prev,
        fullAccess: updatedFullAccess,
      };
    });
  };

  const handleDownloadCheckboxChange = (item, name, checked) => {
    props.setSelection((prev) => {
      const fullAccessArray = Array.isArray(prev.fullAccess)
        ? prev.fullAccess
        : [];

      // Check if the ID is not in fullAccess
      if (!fullAccessArray.some((accessItem) => accessItem.id === item.id)) {
        // Add the ID to selectedDownload based on the checked value
        if (checked) {
          return {
            ...prev,
            selectedDownload: [...prev.selectedDownload, item.id],
          };
        } else {
          return {
            ...prev,
            selectedDownload: prev.selectedDownload.filter(
              (id) => id !== item.id,
            ),
          };
        }
      }

      // Update fullAccess
      const updatedFullAccess = fullAccessArray.map((fullAccessItem) => {
        if (fullAccessItem.id === item.id) {
          return {
            ...fullAccessItem,
            [name]: checked,
          };
        }
        return fullAccessItem;
      });

      return {
        ...prev,
        fullAccess: updatedFullAccess,
      };
    });
  };

  const handleUploadCheckboxChange = (item, name, checked) => {
    props.setSelection((prev) => {
      const fullAccessArray = Array.isArray(prev.fullAccess)
        ? prev.fullAccess
        : [];

      // Check if the ID is not in fullAccess
      if (!fullAccessArray.some((accessItem) => accessItem.id === item.id)) {
        // Add the ID to selectedUpload based on the checked value
        if (checked) {
          return {
            ...prev,
            selectedUpload: [...prev.selectedUpload, item.id],
          };
        } else {
          return {
            ...prev,
            selectedUpload: prev.selectedUpload.filter((id) => id !== item.id),
          };
        }
      }

      // Update fullAccess
      const updatedFullAccess = fullAccessArray.map((fullAccessItem) => {
        if (fullAccessItem.id === item.id) {
          return {
            ...fullAccessItem,
            [name]: checked,
          };
        }
        return fullAccessItem;
      });

      return {
        ...prev,
        fullAccess: updatedFullAccess,
      };
    });
  };
  const handleFullPermissionCheckboxChange = (item, isChecked) => {
    props.setSelection((prev) => {
      if (isChecked) {
        // Create a new object with fullAccess and item ID
        const newItem = {
          id: item.id,
          view: false,
          upload: false,
          download: false,
        };

        // Remove the item with the same ID from selectedView, selectedDownload, and selectedUpload
        const updatedSelectedView = prev.selectedView.filter(
          (id) => id !== item.id,
        );
        const updatedSelectedDownload = prev.selectedDownload.filter(
          (id) => id !== item.id,
        );
        const updatedSelectedUpload = prev.selectedUpload.filter(
          (id) => id !== item.id,
        );

        return {
          ...prev,
          fullAccess: [...prev.fullAccess, newItem],
          selectedView: updatedSelectedView,
          selectedDownload: updatedSelectedDownload,
          selectedUpload: updatedSelectedUpload,
        };
      } else {
        // Remove the item with the same ID from fullAccess, selectedView, selectedDownload, and selectedUpload
        const updatedFullAccess = prev.fullAccess.filter(
          (access) => access.id !== item.id,
        );
        const updatedSelectedView = prev.selectedView.filter(
          (id) => id !== item.id,
        );
        const updatedSelectedDownload = prev.selectedDownload.filter(
          (id) => id !== item.id,
        );
        const updatedSelectedUpload = prev.selectedUpload.filter(
          (id) => id !== item.id,
        );

        return {
          ...prev,
          fullAccess: updatedFullAccess,
          selectedView: updatedSelectedView,
          selectedDownload: updatedSelectedDownload,
          selectedUpload: updatedSelectedUpload,
        };
      }
    });
  };

  // css
  const containerStyle = {
    padding: '10px',
    maxHeight: '400px',
    // overflow: "auto"
  };

  const folderStyle = {
    display: 'grid',
    alignItems: 'center',
    gridTemplateColumns: '1fr 1fr',
  };

  function renderFileSystem(
    data,
    level = 0,
    parentFullAccess,
    parentViewSelected,
  ) {
    if (!data || data.length === 0) {
      if (loading) {
        return <div>Loading...</div>;
      } else {
        return <div style={{ textAlign: 'center' }}>No content</div>;
      }
    }

    return (
      <div style={{ paddingBottom: '10px' }}>
        {data.map((item) => {
          // Check if the parent folder has Full Permission and View selected
          const isParentFullAccessAndViewSelected =
            parentFullAccess && parentViewSelected;

          // Check if the item is a folder and if it should have View disabled
          const isFolderWithDisabledView =
            isParentFullAccessAndViewSelected && item.type === 'folder';

          return (
            <div
              key={item.id}
              style={{
                border: '1px solid #ddd',
                marginBottom: '10px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#F9F9F9',
                padding: '2px',
              }}
            >
              <div
                style={{
                  padding: '10px 15px',
                  backgroundColor: item.type === 'folder' ? '#f9f9f9' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '15px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    flexWrap: 'wrap',
                  }}
                >
                  {item.type === 'folder' ? (
                    <span
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onClick={(e) => handleFolderClick(item.id, e, item.path)}
                    >
                      {item.isOpen ? (
                        <KeyboardArrowUpIcon />
                      ) : (
                        <KeyboardArrowDownIcon />
                      )}
                      <img
                        style={{
                          width: '20px',
                          height: '20px',
                          marginLeft: '5px',
                        }}
                        src={img}
                        alt="folderIcon"
                      />
                    </span>
                  ) : (
                    <img
                      style={{ width: '20px', height: '20px' }}
                      src={
                        ImageConfig[item.name.split('.')[1]] ||
                        ImageConfig['default']
                      }
                      alt="fileIcon"
                    />
                  )}
                  <p style={{ margin: 0, fontWeight: 500 }}>{item.name}</p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    flexWrap: 'wrap',
                  }}
                >
                  {item.type === 'folder' ? (
                    <>
                      <input
                        type="checkbox"
                        id={`permission-${item.id}`}
                        style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                        checked={props?.selection?.fullAccess?.some(
                          (check) => check.id === item.id,
                        )}
                        onChange={(e) =>
                          handleFullPermissionCheckboxChange(
                            item,
                            e.target.checked,
                          )
                        }
                      />
                      <label htmlFor={`permission-${item.id}`}>
                        Full Permission
                      </label>
                    </>
                  ) : null}

                  <input
                    type="checkbox"
                    id={`view-${item.id}`}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    name="view"
                    checked={
                      props?.selection?.selectedView?.includes(item.id) ||
                      (item.type === 'folder' &&
                        props?.selection?.fullAccess?.some(
                          (check) => check.id === item.id && check.view,
                        ))
                    }
                    onChange={(e) =>
                      handleViewCheckboxChange(
                        item,
                        e.target.name,
                        e.target.checked,
                      )
                    }
                    disabled={isFolderWithDisabledView}
                  />
                  <label htmlFor={`view-${item.id}`}>View</label>

                  <input
                    type="checkbox"
                    id={`upload-${item.id}`}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    name="upload"
                    checked={
                      props?.selection?.selectedUpload?.includes(item.id) ||
                      (item.type === 'folder' &&
                        props?.selection?.fullAccess?.some(
                          (check) => check.id === item.id && check.upload,
                        ))
                    }
                    onChange={(e) =>
                      handleUploadCheckboxChange(
                        item,
                        e.target.name,
                        e.target.checked,
                      )
                    }
                  />
                  <label htmlFor={`upload-${item.id}`}>Upload</label>

                  <input
                    type="checkbox"
                    id={`download-${item.id}`}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    name="download"
                    checked={
                      props?.selection?.selectedDownload?.includes(item.id) ||
                      (item.type === 'folder' &&
                        props?.selection?.fullAccess?.some(
                          (check) => check.id === item.id && check.download,
                        ))
                    }
                    onChange={(e) =>
                      handleDownloadCheckboxChange(
                        item,
                        e.target.name,
                        e.target.checked,
                      )
                    }
                  />
                  <label htmlFor={`download-${item.id}`}>Download</label>
                </div>
              </div>

              {item.isOpen && item.children.length > 0 && (
                <div style={{ paddingLeft: `${(level + 1) * 30}px` }}>
                  {renderFileSystem(
                    item.children,
                    level + 1,
                    item.type === 'folder'
                      ? item.fullAccess &&
                          item.fullAccess.view &&
                          item.fullAccess.upload
                      : false,
                    item.type === 'folder'
                      ? item.selectedView && item.selectedUpload
                      : false,
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <div style={containerStyle}>{renderFileSystem(fileSystemData)}</div>;
}
export default App;
