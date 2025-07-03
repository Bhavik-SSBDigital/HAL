import React, { useCallback, useEffect, useState } from 'react';
import CustomCard from '../../CustomComponents/CustomCard';
import folderIcon from '../../assets/images/folder.png';
import { Await, useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import {
  ArchiveFile,
  CopyPaste,
  CreateFolder,
  CutPaste,
  DeleteFile,
  DownloadFile,
  DownloadFolder,
  GetFolderData,
  GetRootFolders,
  ViewDocument,
} from '../../common/Apis';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import PathBar from '../../components/path/PathBar';
import { ImageConfig } from '../../config/ImageConfig';
import {
  IconDotsVertical,
  IconFilter,
  IconSquareLetterX,
  IconDownload,
  IconEye,
  IconCopy,
  IconClipboardCheck,
  IconScissors,
  IconSettings,
  IconArchive,
  IconTrash,
} from '@tabler/icons-react';
import ViewFile from '../view/View';
import CustomModal from '../../CustomComponents/CustomModal';
import CustomButton from '../../CustomComponents/CustomButton';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { copy, cut } from '../../Slices/PathSlice';
import TopLoader from '../../common/Loader/TopLoader';
import moment from 'moment';
import { useForm } from 'react-hook-form';
import { upload } from '../../components/drop-file-input/FileUploadDownload';
import { Tooltip } from '@mui/material';

export default function FileSysten() {
  // States
  const dispatch = useDispatch();
  const username = sessionStorage.getItem('username');
  const [fileType, setFileType] = useState('all');
  const [showUploadFileModal, setUploadFileModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [fileView, setFileView] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('name');
  const [documentsType, setDocumentsType] = useState(false);
  const [sortOrder, setSortOrder] = useState('asc');
  const [isMenuOpen, setIsMenuOpen] = useState(false); // New state for action menu
  const [currentPath, setCurrentPath] = useState(
    sessionStorage.getItem('path') || '..',
  );
  const fileName = useSelector((state) => state.path.fileName);
  const sourcePath = useSelector((state) => state.path.sourcePath);
  const method = useSelector((state) => state.path.method);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigate = useNavigate();

  // Filtering and sorting data
  const filteredData = data
    .filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item?.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    )
    .filter((item) => {
      if (documentsType === 'normal') return true; // Show all documents
      if (documentsType === 'rejected') return item.isRejected;
      if (documentsType === 'achieved') return item.isAchieved;
      return true;
    })
    .filter((item) => {
      if (fileType === 'all') return true; // Show all file types
      return item.type === fileType; // Match the selected file type
    })
    .sort((a, b) => {
      if (sortType === 'size') {
        // Sort by size (numeric comparison)
        return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
      } else {
        // Sort by string-based properties (name or type)
        return sortOrder === 'asc'
          ? a[sortType].localeCompare(b[sortType])
          : b[sortType].localeCompare(a[sortType]);
      }
    });

  // Context Menu component
  const ContextMenu = ({ xPos, yPos, handlePaste }) => {
    return (
      <CustomCard className="fixed z-50 !p-2" style={{ top: yPos, left: xPos }}>
        <button
          className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-100 rounded-md"
          onClick={handlePaste}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 20H5V8h5V6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6h-2v6z" />
            <path d="M14 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 14H8V4h5v5h5v7z" />
          </svg>
          Paste
        </button>
      </CustomCard>
    );
  };

  // search
  const handleSearchChange = useCallback(
    debounce((value) => setSearchQuery(value), 300), // 300ms debounce to optimize performance
    [],
  );

  // Reset Filters
  const resetFilters = () => {
    setFileType('all');
    setSortType('name');
    setDocumentsType('normal');
    setSortOrder('asc');
  };

  // Handle folder click
  const handleFolderClick = (item) => {
    setSearchQuery('');
    setSelectedItem(item);
    if (item.type === 'folder') {
      let newPath = item.path;
      if (!newPath.startsWith('..')) {
        newPath = '..' + newPath;
      }
      setCurrentPath(`${newPath}/${item.name}`);
      sessionStorage.setItem('path', `${newPath}/${item.name}`);
    }
    resetFilters();
  };
  // Handler view file
  const handleViewFile = async (name, path, fileId, type, isEditing) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  // handler download folder
  const handleDownloadFolder = async (name, path) => {
    setActionsLoading(true);
    try {
      const response = await DownloadFolder(path, name);
      setIsMenuOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  // handler download file
  const handleDownload = (name, path) => {
    setActionsLoading(true);
    DownloadFile(name, path);
    setIsMenuOpen(false);
    setActionsLoading(false);
  };

  // right click handler
  const handleContextMenu = (event) => {
    event.preventDefault();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    setContextMenuPos({ x: event.clientX, y: event.clientY });
    setIsContextMenuOpen(true);
  };

  // handler copy file
  const handleCopy = (name, path) => {
    dispatch(copy({ name, pathValue: currentPath, method: 'copy' }));
    setIsContextMenuOpen(false);
    toast.success(`${name} Copied`);
    setIsMenuOpen(false);
  };

  // handler cut file
  const handleCut = (name, path) => {
    dispatch(cut({ name, pathValue: currentPath, method: 'cut' }));
    setIsContextMenuOpen(false);
    toast.success(`${name} Cut Successfully`);
    setIsMenuOpen(false);
  };

  // Fetch data
  const getData = async (updatedPath) => {
    setLoading(true);
    try {
      const response =
        updatedPath === '..'
          ? await GetRootFolders()
          : await GetFolderData(updatedPath);
      setData(response?.data?.children || []);
    } catch (error) {
      console.log(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  // handler paste file
  const handlePaste = async () => {
    if (!fileName || !sourcePath || !method) {
      toast.error('No file to paste');
      return;
    }
    setIsContextMenuOpen(false);
    setActionsLoading(true);
    try {
      const body = { sourcePath, name: fileName, destinationPath: currentPath };
      const response = await (method == 'copy'
        ? CopyPaste(body)
        : CutPaste(body));
      toast.success(response?.data?.message);
      await getData(currentPath);
      // Reset Redux state after paste
      dispatch(copy({ name: '', pathValue: '', method: '' }));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  // handler for archive file
  const handleArchive = async (item) => {
    try {
      const response = await ArchiveFile(item.id);
      toast.success(response?.data?.message);
      setData((prev) => prev.filter((file) => file.id !== item.id));
      setIsMenuOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };
  // handler to delete file
  const handleDelete = async (item) => {
    try {
      const response = await DeleteFile(item.id);
      toast.success(response?.data?.message);
      setData((prev) => prev.filter((file) => file.id !== item.id));
      setIsMenuOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  // create folder
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  const handleCreateFolder = async (data) => {
    setActionsLoading(true);
    try {
      const response = await CreateFolder(currentPath, {
        path: `${currentPath}/${data.folderName}`,
        ...(currentPath === '..' ? { isProject: true } : {}),
      });
      toast.success(response?.data?.message);

      const currentDate = new Date();
      const currentDateTimeString = currentDate.toString();
      setData((prev) => [
        ...prev,
        {
          createdOn: currentDateTimeString,
          name: data.folderName,
          type: 'folder',
          path: currentPath,
        },
      ]);
      setShowFolderModal(false);
      reset();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  // upload file
  const {
    register: registerFile,
    handleSubmit: handleSubmitFile,
    formState: { errors: fileErrors, isSubmitting: isSubmittingFile },
    reset: resetFile,
  } = useForm();

  // function to create metadata of newly uploaded file
  const createUploadedFileMetadata = (file, uploadPath, createdBy, fileExt) => {
    const now = new Date().toISOString();

    return {
      id: Date.now(), // or from backend if available
      path: uploadPath,
      name: file.name,
      type: fileExt,
      createdOn: now,
      lastUpdated: now,
      lastAccessed: now,
      size: file.size,
      isInvolvedInProcess: false,
      createdBy,
      isUploadable: false,
      isDownloadable: true,
      isRejected: false,
      children: [], // Only relevant for folders, but keep empty for consistency
    };
  };

  const handleFileUpload = async (data) => {
    setActionsLoading(true);
    try {
      const selectedFile = data.file[0]; // Assuming this is from react-hook-form or similar
      const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      const fileExt = selectedFile.name.split('.').pop();

      const uploadResult = await upload(
        [selectedFile], // File array
        currentPath, // Target path
        `${fileName}.${fileExt}`, // Final file name
        false, // Overwrite = true
      );
      setUploadFileModal(false);
      toast.success('File Uploaded');
      const newFileData = createUploadedFileMetadata(
        selectedFile,
        currentPath,
        username,
        fileExt,
      );

      // Update your state (e.g., file list, folder contents)
      setData((prev) => [...prev, newFileData]);
      resetFile();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  useEffect(() => {
    getData(currentPath);
  }, [currentPath]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isContextMenuOpen && !event.target.closest('.context-menu')) {
        setIsContextMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isContextMenuOpen]);

  if (loading) {
    return <ComponentLoader />;
  }

  return (
    <>
      {actionsLoading && <TopLoader />}
      <PathBar
        pathValue={currentPath}
        setCurrentPath={setCurrentPath}
        state={'path'}
        reset={resetFilters}
      />
      {/* Sidebar and Filter Button */}
      <div className="relative flex flex-col md:flex-row h-[calc(100vh-160px)] gap-1 mt-1">
        {/* Mobile Filter Button - Floating */}
        {!isSidebarOpen && (
          <button
            className="absolute bottom-0 border right-4 rounded-full p-2 shadow-xl md:hidden z-10"
            onClick={() => setIsSidebarOpen(true)}
          >
            <IconFilter size={22} />
          </button>
        )}

        {/* Sidebar */}
        <CustomCard
          className={`overflow-auto fixed md:relative md:w-64 p-4 bg-white rounded-lg transition-transform transform z-10 
    h-auto md:h-full bottom-1 md:bottom-auto left-1 right-1 md:left-0 
    ${isSidebarOpen ? 'translate-y-0' : 'translate-y-[110%] md:translate-y-0'} 
    max-h-[500px] md:max-h-full`}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-800 text-lg">Filters</h2>
            <button
              className="md:hidden p-1 text-gray-600 hover:text-gray-800"
              onClick={() => setIsSidebarOpen(false)}
            >
              <IconSquareLetterX size={22} />
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Type to search..."
              className="border rounded-md px-3 py-2 w-full mt-1"
              // value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={!data?.length}
            />
          </div>

          {/* Sorting */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">Sort By</label>
            <select
              className="border rounded-md px-3 py-2 w-full mt-1"
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              disabled={!filteredData?.length}
            >
              <option value="name">Name</option>
              <option value="type">Type</option>
              <option value="size">Size</option> {/* Added Size option */}
            </select>
          </div>

          {/* type */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">
              File Type
            </label>
            <select
              className="border rounded-md px-3 py-2 w-full mt-1"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              disabled={!data?.length}
            >
              {[
                'all',
                'pdf',
                'doc',
                'docx',
                'xls',
                'xlsx',
                'ppt',
                'pptx',
                'txt',
                'csv',
                'img',
                'jpg',
                'png',
                'gif',
                'svg',
                'zip',
                'rar',
                'json',
              ].map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All' : type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Document Type */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">
              Document Type
            </label>
            <select
              className="border rounded-md px-3 py-2 w-full mt-1"
              value={documentsType}
              onChange={(e) => setDocumentsType(e.target.value)}
              disabled={!data?.length}
            >
              <option value="normal">Normal Documents</option>
              <option value="rejected">Rejected Documents</option>
              <option value="achieved">Achieved</option>
            </select>
          </div>

          {/* Order */}
          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700">Order</label>
            <select
              className="border rounded-md px-3 py-2 w-full mt-1"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={!filteredData?.length}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <CustomButton
              text="Create Folder"
              click={() => setShowFolderModal(true)}
            />
            <CustomButton
              text="Upload File"
              click={() => setUploadFileModal(true)}
              variant={'success'}
            />
            <CustomButton
              text={'Reset Filters'}
              variant={'secondary'}
              click={resetFilters}
            />
          </div>
        </CustomCard>

        {/* Folder and File Display */}
        <div
          onContextMenu={(e) => handleContextMenu(e)}
          className="flex-1 max-h-[calc(100vh-160px)] overflow-auto"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <div key={item.id} className="relative">
                  <CustomCard
                    // title={item.name}
                    className="flex flex-row items-center justify-center p-4 hover:shadow-lg cursor-pointer relative"
                    click={() =>
                      item.type == 'folder' ? handleFolderClick(item) : null
                    }
                    onDoubleClick={() =>
                      item.type == 'folder'
                        ? null
                        : handleViewFile(
                            item.name,
                            item.path,
                            item.id,
                            item.type,
                            false,
                          )
                    }
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setIsMenuOpen(true); // Open action menu
                      }}
                      className="absolute top-1 right-0 hover:bg-blue-50 p-1 rounded-[50%] z-9"
                    >
                      <IconDotsVertical size={22} />
                    </button>
                    <img
                      src={
                        item.type !== 'folder'
                          ? ImageConfig[item.type] || ImageConfig['default']
                          : folderIcon
                      }
                      className="h-12 p-2"
                      alt={item.type}
                    />
                    <Tooltip title={item.name}>
                      <h2 className="cursor-text font-semibold truncate w-full text-center">
                        {item.name}
                      </h2>
                    </Tooltip>
                  </CustomCard>
                </div>
              ))
            ) : (
              <CustomCard className="w-full text-center">
                <h2 className="font-semibold">No results found</h2>
              </CustomCard>
            )}
          </div>
        </div>
      </div>

      {/* Action Menu (Popup) */}
      {selectedItem ? (
        <CustomModal isOpen={isMenuOpen && selectedItem}>
          <h3 className="font-semibold mb-3">{selectedItem?.name}</h3>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {selectedItem?.type !== 'folder' ? (
              <>
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconEye size={18} /> View
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() =>
                    handleViewFile(
                      selectedItem.name,
                      selectedItem.path,
                      selectedItem.id,
                      selectedItem.type,
                      false,
                    )
                  }
                  disabled={actionsLoading}
                />

                {/* <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconDownload size={18} /> Download
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() =>
                    handleDownload(selectedItem.name, selectedItem.path)
                  }
                  disabled={actionsLoading}
                /> */}

                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconCopy size={18} /> Copy
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() => handleCopy(selectedItem.name, selectedItem.path)}
                  disabled={actionsLoading}
                />
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconScissors size={18} /> Cut
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() => handleCut(selectedItem.name, selectedItem.path)}
                  disabled={actionsLoading}
                />
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconArchive size={18} /> Archive
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() => handleArchive(selectedItem)}
                  disabled={actionsLoading}
                />
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconTrash size={18} /> Delete
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() => handleDelete(selectedItem)}
                  disabled={actionsLoading}
                />
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconSettings size={18} /> Properties
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() => {
                    setIsMenuOpen(false);
                    setShowProperties(true); // Open properties modal
                  }}
                  disabled={actionsLoading}
                />
              </>
            ) : (
              <>
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconDownload size={18} /> Download ZIP
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() =>
                    handleDownloadFolder(selectedItem.name, selectedItem.path)
                  }
                  disabled={actionsLoading}
                />
                <CustomButton
                  variant="none"
                  text={
                    <>
                      <IconSettings size={18} /> Properties
                    </>
                  }
                  className="w-full flex items-center gap-2"
                  click={() => {
                    setIsMenuOpen(false);
                    setShowProperties(true); // Open properties modal
                  }}
                  disabled={actionsLoading}
                />
              </>
            )}
          </div>

          {/* Close Button */}
          <CustomButton
            variant="danger"
            text={
              <>
                <IconSquareLetterX size={18} /> Close
              </>
            }
            className="w-full flex items-center gap-2 mt-4"
            click={() => setIsMenuOpen(false)}
            disabled={actionsLoading}
          />
        </CustomModal>
      ) : null}

      {/* Paste button */}
      {isContextMenuOpen && fileName && (
        <ContextMenu
          xPos={contextMenuPos.x}
          yPos={contextMenuPos.y}
          handlePaste={handlePaste}
        />
      )}

      {/* Properties Modal */}
      <CustomModal isOpen={showProperties}>
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-lg font-semibold">
            {selectedItem?.name} Properties
          </h2>
          <button
            onClick={() => setShowProperties(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <IconSquareLetterX className="hover:text-red-500" />
          </button>
        </div>
        <div className="space-y-2">
          <p className="flex justify-between">
            <span className="font-medium">Name:</span> {selectedItem?.name}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Path:</span> {selectedItem?.path}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Type:</span> {selectedItem?.type}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Size:</span> {selectedItem?.size}{' '}
            bytes
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Created On:</span>{' '}
            {moment(selectedItem?.createdOn).format('DD-MM-YYYY')}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Last Updated:</span>{' '}
            {moment(selectedItem?.lastUpdated).format('DD-MM-YYYY')}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Last Accessed:</span>{' '}
            {moment(selectedItem?.lastAccessed).format('DD-MM-YYYY')}
          </p>
          <p className="flex justify-between">
            <span className="font-medium">Rejected:</span>{' '}
            {selectedItem?.isRejected ? 'Yes' : 'No'}
          </p>
        </div>
      </CustomModal>

      {/* Create Folder Modal */}
      <CustomModal isOpen={showFolderModal}>
        <h2 className="text-lg font-semibold mb-4">Create Folder</h2>
        <form onSubmit={handleSubmit(handleCreateFolder)}>
          <input
            type="text"
            className="border p-2 w-full mb-2"
            placeholder="Folder Name"
            {...register('folderName', { required: 'Folder name is required' })}
          />
          {errors.folderName && (
            <p className="text-red-500 text-sm">{errors.folderName.message}</p>
          )}

          <div className="flex justify-end gap-2">
            <CustomButton
              variant={'danger'}
              text={'Cancel'}
              type={'button'}
              disabled={isSubmitting}
              click={() => setShowFolderModal(false)}
            />
            <CustomButton
              type="submit"
              text={'Create'}
              disabled={isSubmitting}
            />
          </div>
        </form>
      </CustomModal>

      {/* Upload File Modal */}
      <CustomModal isOpen={showUploadFileModal}>
        <h2 className="text-lg font-semibold mb-4">Upload File</h2>
        <form onSubmit={handleSubmitFile(handleFileUpload)}>
          <input
            type="file"
            className="border p-2 w-full mb-2"
            {...registerFile('file', { required: 'Please select a file' })}
          />
          {fileErrors.file && (
            <p className="text-red-500 text-sm">{fileErrors.file.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <CustomButton
              type="button"
              text="Cancel"
              variant={'danger'}
              click={() => setUploadFileModal(false)}
              disabled={isSubmittingFile}
            />
            <CustomButton
              type="submit"
              text="Upload"
              disabled={isSubmittingFile}
            />
          </div>
        </form>
      </CustomModal>

      {/* View File Modal */}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
    </>
  );
}
