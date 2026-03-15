import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import moment from 'moment';
import { Controller, useForm } from 'react-hook-form';

// APIs & Config
import {
  ArchiveFile, BookmarkDocument, CopyPaste, CreateFolder,
  createPhysicalRequest, CutPaste, DeleteFile, DownloadFile,
  DownloadFileWithWaterMark, DownloadFolder, getDepartments,
  GetFolderData, GetRootFolders, RemoveBookmark, ViewDocument,
} from '../../common/Apis';
import { copy, cut } from '../../Slices/PathSlice';
import { upload } from '../../components/drop-file-input/FileUploadDownload';
import { ImageConfig } from '../../config/ImageConfig';

// UI Components
import ComponentLoader from '../../common/Loader/ComponentLoader';
import TopLoader from '../../common/Loader/TopLoader';
import PathBar from '../../components/path/PathBar';
import ViewFile from '../view/View';
import CustomModal from '../../CustomComponents/CustomModal';
import CustomButton from '../../CustomComponents/CustomButton';
import CustomTextField from '../../CustomComponents/CustomTextField';
import ModalWithField from '../../components/ModalWithField';

// Icons
import {
  IconDotsVertical, IconFilter, IconSquareLetterX, IconDownload,
  IconEye, IconCopy, IconArchive, IconTrash, IconScript,
  IconBookmark, IconBookmarkFilled, IconSettings, IconChevronRight,
  IconFolder, IconFolderPlus, IconUpload, IconLayoutSidebar, IconFolderOpen
} from '@tabler/icons-react';

export default function FileSystem() {
  const dispatch = useDispatch();
  const username = sessionStorage.getItem('username');

  // --- Core State ---
  const [treeData, setTreeData] = useState([]); 
  const [mainData, setMainData] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [currentPath, setCurrentPath] = useState(sessionStorage.getItem('path') || '..');

  // --- UI & Drag State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(288); 
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, startWidth: 288 }); 

  const [selectedItem, setSelectedItem] = useState(null);
  const [fileView, setFileView] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadFileModal, setUploadFileModal] = useState(false);
  const [open, setOpen] = useState(null);

  // --- Context Menu State ---
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [fileType, setFileType] = useState('all');

  // --- Redux ---
  const { fileName, sourcePath, method } = useSelector((state) => state.path);

  // --- Forms ---
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
  
  // Updated File Form Destructuring to monitor selected file state
  const { 
    register: registerFile, 
    handleSubmit: handleSubmitFile, 
    watch: watchFile,
    setValue: setFileValue,
    formState: { errors: fileErrors, isSubmitting: isSubmittingFile }, 
    reset: resetFile 
  } = useForm();
  
  const selectedUploadFile = watchFile('file');

  const { register: registerDept, handleSubmit: handleSubmitDept, formState: { errors: deptErrors }, control: controlDept, reset: resetDept } = useForm({ defaultValues: { departmentId: '', reason: '' } });

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [rootRes, deptsRes] = await Promise.all([GetRootFolders(), getDepartments()]);
        setTreeData((rootRes?.data?.children || []).map(item => ({ ...item, isExpanded: false, childrenData: [] })));
        setDepartments(deptsRes?.data?.departments || []);
        fetchMainData(currentPath);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => { if (isContextMenuOpen && !e.target.closest('.context-menu')) setIsContextMenuOpen(false); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isContextMenuOpen]);

  // --- Smooth Resize Logic ---
  useEffect(() => {
    let animationFrameId;

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        const deltaX = e.clientX - dragInfo.current.startX;
        let newWidth = dragInfo.current.startWidth + deltaX;
        newWidth = Math.max(200, Math.min(newWidth, 600)); 
        setSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]);

  // --- Data Fetching ---
  const fetchMainData = async (path) => {
    setLoading(true);
    try {
      const response = path === '..' ? await GetRootFolders() : await GetFolderData(path);
      setMainData(response?.data?.children || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to fetch directory contents');
    } finally {
      setLoading(false);
    }
  };

  const updateTreeNode = (nodes, targetId, updaterFn) => {
    return nodes.map(node => {
      if (node.id === targetId) return updaterFn(node);
      if (node.childrenData?.length) return { ...node, childrenData: updateTreeNode(node.childrenData, targetId, updaterFn) };
      return node;
    });
  };

  // --- Handlers ---
  const handleSidebarFolderClick = async (folder, toggleExpand = true) => {
    let fetchPath = folder.path.startsWith('..') ? folder.path : '..' + folder.path;
    fetchPath = `${fetchPath}/${folder.name}`;
    setCurrentPath(fetchPath);
    sessionStorage.setItem('path', fetchPath);
    fetchMainData(fetchPath);

    if (toggleExpand) {
      if (folder.isExpanded) {
        setTreeData(prev => updateTreeNode(prev, folder.id, n => ({ ...n, isExpanded: false })));
      } else if (!folder.childrenData?.length) {
        try {
          const res = await GetFolderData(fetchPath);
          const children = (res?.data?.children || []).filter(c => c.type === 'folder').map(c => ({ ...c, isExpanded: false, childrenData: [] }));
          setTreeData(prev => updateTreeNode(prev, folder.id, n => ({ ...n, isExpanded: true, childrenData: children })));
        } catch (e) { console.error(e); }
      } else {
        setTreeData(prev => updateTreeNode(prev, folder.id, n => ({ ...n, isExpanded: true })));
      }
    }
  };

  const handleMainItemClick = (item) => {
    if (item.type === 'folder') handleSidebarFolderClick(item, false);
    else handleViewFile(item.name, item.path, item.id, item.type);
  };

  const executeAction = async (actionFn, ...args) => {
    setActionsLoading(true);
    try { await actionFn(...args); }
    catch (error) { toast.error(error?.response?.data?.message || error?.message); }
    finally { setActionsLoading(false); setIsMenuOpen(false); }
  };

  // --- File Operations ---
  const handleViewFile = (name, path, id, type) => executeAction(async () => setFileView(await ViewDocument(name, path, type, id)));
  const handleDownloadFolder = (name, path) => executeAction(() => DownloadFolder(path, name));
  const handleDownloadWithWatermark = async (data) => {
    try {
      const res = await DownloadFileWithWaterMark(selectedItem.id, data.fieldValue, data.watermark, false);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', selectedItem?.name);
      document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch (e) { toast.error(e?.response?.data?.message || e?.message); }
  };

  const handleArchive = (item) => executeAction(async () => {
    await ArchiveFile(item.id); toast.success('Archived');
    setMainData(prev => prev.filter(n => n.id !== item.id));
  });
  const handleDelete = (item) => executeAction(async () => {
    await DeleteFile(item.id); toast.success('Deleted');
    setMainData(prev => prev.filter(n => n.id !== item.id));
  });
  const toggleBookmark = async (id, isBookmarked) => {
    try {
      await (isBookmarked ? RemoveBookmark(id) : BookmarkDocument(id));
      setMainData(prev => prev.map(n => n.id === id ? { ...n, isDocumentBookmarked: !isBookmarked } : n));
      toast.success(isBookmarked ? 'Bookmark removed' : 'Bookmarked');
    } catch (e) { toast.error(e?.response?.data?.error || e?.message); }
  };

  const handleCopy = (name, path) => { dispatch(copy({ name, pathValue: currentPath, method: 'copy' })); setIsMenuOpen(false); toast.success('Copied'); };
  const handleCut = (name, path) => { dispatch(cut({ name, pathValue: currentPath, method: 'cut' })); setIsMenuOpen(false); toast.success('Cut'); };
  const handlePaste = async () => {
    if (!fileName || !sourcePath || !method) return toast.error('No file to paste');
    setIsContextMenuOpen(false);
    executeAction(async () => {
      const body = { sourcePath, name: fileName, destinationPath: currentPath };
      const res = method === 'copy' ? await CopyPaste(body) : await CutPaste(body);
      toast.success(res?.data?.message);
      fetchMainData(currentPath);
      dispatch(copy({ name: '', pathValue: '', method: '' }));
    });
  };

  const onSubmitDept = async (data) => executeAction(async () => {
    await createPhysicalRequest({ ...data, documentId: selectedItem?.id });
    toast.success('Request sent'); resetDept(); setOpen(false);
  });

  const handleCreateFolder = async (data) => executeAction(async () => {
    await CreateFolder(currentPath, { path: `${currentPath}/${data.folderName}`, ...(currentPath === '..' ? { isProject: true } : {}) });
    toast.success('Folder Created');
    fetchMainData(currentPath); setShowFolderModal(false); reset();
  });

  const handleFileUpload = async (data) => executeAction(async () => {
    const selectedFile = data.file[0];
    const fileNameStr = selectedFile.name.split('.').slice(0, -1).join('.');
    const fileExt = selectedFile.name.split('.').pop();
    await upload([selectedFile], currentPath, `${fileNameStr}.${fileExt}`, false);
    fetchMainData(currentPath); setUploadFileModal(false); resetFile(); toast.success('Uploaded');
  });

  // --- Processors ---
  const handleSearchChange = useCallback(debounce((value) => setSearchQuery(value), 300), []);
  const resetFilters = () => { setFileType('all'); setSortType('name'); setSortOrder('asc'); setSearchQuery(''); };
  
  const processedMainData = mainData
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item?.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    .filter(item => fileType === 'all' || item.type === 'folder' || item.type === fileType)
    .sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      if (sortType === 'size') return sortOrder === 'asc' ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0);
      return sortOrder === 'asc' ? a[sortType]?.localeCompare(b[sortType]) : b[sortType]?.localeCompare(a[sortType]);
    });

  // --- Highly Scalable Tree Sidebar Component ---
  const SidebarNode = ({ node, depth = 0 }) => {
    const isActive = currentPath.endsWith(node.name);
    const hasChildren = node.childrenData && node.childrenData.length > 0;
    
    const PADDING_PER_LEVEL = 16;
    const BASE_PADDING = 12;

    return (
      <div className="flex flex-col w-full">
        {/* Node Row */}
        <div 
          className={`group flex items-center py-1.5 pr-4 w-full cursor-pointer transition-colors duration-200 select-none outline-none
            ${isActive 
              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-[inset_3px_0_0_0_rgba(79,70,229,1)]' 
              : 'hover:bg-slate-200/50 text-slate-600 hover:text-slate-900 font-normal'}
          `}
          style={{ paddingLeft: `${depth * PADDING_PER_LEVEL + BASE_PADDING}px` }}
          onClick={() => handleSidebarFolderClick(node)}
        >
          {/* Chevron */}
          <div className="w-5 h-5 flex justify-center items-center flex-shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
            <IconChevronRight 
              size={14} stroke={2.5} 
              className={`transition-transform duration-200 ease-out ${node.isExpanded ? 'rotate-90 text-indigo-400' : 'rotate-0'}`} 
            />
          </div>

          {/* Icon */}
          <div className="mr-2 flex-shrink-0">
            {node.isExpanded ? (
              <IconFolderOpen size={16} stroke={isActive ? 2 : 1.5} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
            ) : (
              <IconFolder size={16} stroke={isActive ? 2 : 1.5} className={isActive ? 'text-indigo-600 fill-indigo-100' : 'text-slate-400 fill-slate-100'} />
            )}
          </div>

          {/* Label */}
          <span className="text-sm tracking-tight whitespace-nowrap">
            {node.name}
          </span>
        </div>

        {/* Nested Children */}
        {node.isExpanded && hasChildren && (
          <div className="flex flex-col w-full relative">
            <div 
              className="absolute top-0 bottom-0 w-px bg-slate-200/80 pointer-events-none" 
              style={{ left: `${depth * PADDING_PER_LEVEL + BASE_PADDING + 10}px` }}
            />
            {node.childrenData.map(child => (
              <SidebarNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading && !treeData.length) return <ComponentLoader />;

  return (
    <div className="flex h-[calc(100vh-60px)] bg-slate-50 font-sans antialiased text-slate-800 rounded-xl border border-slate-200/80 shadow-2xl overflow-hidden m-4">
      {actionsLoading && <TopLoader />}

      {/* --- LEFT PANE (Elegant Directory Tree) --- */}
      {isSidebarOpen && (
        <aside 
          className="flex-shrink-0 bg-[#F8FAFC] flex flex-col overflow-hidden z-10 border-r border-slate-200/60 relative"
          style={{ width: `${sidebarWidth}px`, transition: isDragging ? 'none' : 'width 0.2s ease-out' }} 
        >
          <div className="pt-6 pb-4 px-6 flex justify-between items-center flex-shrink-0">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <IconLayoutSidebar size={14} /> Explorer
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-indigo-500 transition-colors outline-none"><IconLayoutSidebar size={18} stroke={1.5}/></button>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="min-w-max flex flex-col pb-4">
               {/* Root Directory Base Node */}
               <div 
                  className={`group flex items-center py-2 pr-4 w-full cursor-pointer transition-colors duration-200 select-none outline-none
                    ${currentPath === '..' ? 'bg-indigo-50 text-indigo-700 shadow-[inset_3px_0_0_0_rgba(79,70,229,1)] font-medium' : 'hover:bg-slate-200/50 text-slate-700'}`}
                  style={{ paddingLeft: '12px' }}
                  onClick={() => { setCurrentPath('..'); sessionStorage.setItem('path', '..'); fetchMainData('..'); }}
                >
                  <div className="w-5 flex-shrink-0" /> 
                  <IconFolderOpen size={18} className={`mr-2 flex-shrink-0 ${currentPath === '..' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="text-sm tracking-tight whitespace-nowrap">Root Directory</span>
                </div>
              
              {/* Tree Rendering */}
              {treeData.filter(n => n.type === 'folder').map(node => <SidebarNode key={node.id} node={node} depth={0} />)}
            </div>
          </div>

          {/* Resizer Handle */}
          <div
            className={`absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-400/50 transition-colors z-50 flex items-center justify-center ${isDragging ? 'bg-indigo-500/50' : 'bg-transparent'}`}
            onMouseDown={(e) => { 
              e.preventDefault(); 
              setIsDragging(true); 
              dragInfo.current = { startX: e.clientX, startWidth: sidebarWidth }; 
            }}
          >
             <div className={`w-0.5 h-8 bg-slate-300 rounded-full transition-opacity ${isDragging ? 'opacity-100 bg-white' : 'opacity-0'}`} />
          </div>
        </aside>
      )}

      {/* --- RIGHT PANE (Working Directory) --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-white z-20" onContextMenu={(e) => { e.preventDefault(); setContextMenuPos({ x: e.clientX, y: e.clientY }); setIsContextMenuOpen(true); }}>
        
        {/* Header / Path Bar */}
        <header className="px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/90 backdrop-blur-xl z-30 sticky top-0 border-b border-slate-100">
          <div className="flex items-center gap-4 w-full overflow-hidden">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors outline-none shadow-sm border border-transparent hover:border-indigo-100">
                <IconLayoutSidebar size={20} stroke={1.5}/>
              </button>
            )}
            <div className="flex-1 min-w-0"><PathBar pathValue={currentPath} setCurrentPath={setCurrentPath} state={'path'} reset={resetFilters} /></div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={() => setShowFolderModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm outline-none">
              <IconFolderPlus size={16} stroke={2} /> New Folder
            </button>
            <button onClick={() => setUploadFileModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 outline-none">
              <IconUpload size={16} stroke={2} /> Upload File
            </button>
          </div>
        </header>

        {/* Filters Bar */}
        <div className="px-8 py-3 border-b border-slate-100 flex items-center gap-6 text-xs bg-[#FAFAFC]">
          <div className="flex items-center gap-2 flex-1 max-w-md group bg-white border border-slate-200 px-3 py-1.5 rounded-md focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all shadow-sm">
             <IconFilter size={14} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors"/>
             <input type="text" placeholder="Filter this directory..." className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400" onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <div className="flex items-center gap-4 text-slate-600 font-medium ml-auto">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Sort:</span>
              <select className="bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors appearance-none pr-2 font-semibold" value={sortType} onChange={(e) => setSortType(e.target.value)}>
                <option value="name">Name</option><option value="size">Size</option><option value="type">Type</option>
              </select>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">View:</span>
              <select className="bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors appearance-none pr-2 font-semibold" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                <option value="all">All Types</option>
                {['pdf','doc','docx','xls','xlsx','img','jpg','png','zip'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* File Table */}
        <div className="flex-1 overflow-y-auto px-2">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-white/95 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_0_0_rgba(241,245,249,1)]">
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4 w-full">Name</th>
                <th className="px-6 py-4 hidden lg:table-cell">Date Modified</th>
                <th className="px-6 py-4 text-right hidden md:table-cell">Size</th>
                <th className="px-6 py-4 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {processedMainData.length > 0 ? processedMainData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 group cursor-pointer transition-colors" onDoubleClick={() => handleMainItemClick(item)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedItem(item); setContextMenuPos({ x: e.clientX, y: e.clientY }); setIsMenuOpen(true); }}>
                  <td className="px-6 py-3.5 flex items-center gap-4">
                    <div className="w-8 h-8 flex justify-center items-center flex-shrink-0 bg-slate-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                      {item.type === 'folder' ? <IconFolder size={20} stroke={1.5} className="text-indigo-500 fill-indigo-100" /> : <img src={ImageConfig[item.type] || ImageConfig['default']} className="w-5 h-5 object-contain drop-shadow-sm" alt={item.type} />}
                    </div>
                    <span className="text-sm font-medium text-slate-700 tracking-tight truncate select-none group-hover:text-indigo-700 transition-colors">{item.name}</span>
                    {item.isDocumentBookmarked && <IconBookmarkFilled size={14} className="text-amber-400 drop-shadow-sm ml-1" />}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell tracking-tight">{item.lastUpdated ? moment(item.lastUpdated).format('DD MMM YYYY, HH:mm') : '—'}</td>
                  <td className="px-6 py-3.5 text-xs text-slate-500 font-mono text-right hidden md:table-cell">{item.type !== 'folder' && item.size ? `${(item.size / 1024).toFixed(1)} KB` : '—'}</td>
                  <td className="px-6 py-3.5 text-center">
                     <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsMenuOpen(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none">
                      <IconDotsVertical size={18} stroke={2} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="text-center py-32 text-slate-400">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                         <IconFolderOpen size={40} stroke={1} className="text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-600">This folder is empty</p>
                      <p className="text-xs mt-1 text-slate-400">Drop files here or click Upload in the top right.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- Context Menus & Modals (macOS blur style) --- */}
      {isContextMenuOpen && fileName && (
        <div className="fixed z-[100] bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-xl border border-slate-200/50 p-1.5 w-56 context-menu" style={{ top: contextMenuPos.y, left: contextMenuPos.x }}>
          <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-sm font-medium text-slate-700 hover:bg-slate-100/80 hover:text-indigo-600 rounded-lg outline-none transition-colors" onClick={handlePaste}><IconCopy size={16} stroke={1.5} /> Paste Item</button>
        </div>
      )}

      <CustomModal isOpen={isMenuOpen && selectedItem} onClose={() => setIsMenuOpen(false)} size="sm">
        <div className="border-b border-slate-100 pb-3 mb-3 px-3"><h3 className="font-bold text-slate-800 truncate tracking-tight text-base">{selectedItem?.name}</h3></div>
        <div className="flex flex-col gap-1 px-1 pb-1">
          {selectedItem?.type !== 'folder' ? (
            <>
              <MenuBtn icon={<IconEye size={16}/>} text="View Content" onClick={() => handleViewFile(selectedItem.name, selectedItem.path, selectedItem.id, selectedItem.type)} />
              <MenuBtn icon={selectedItem?.isDocumentBookmarked ? <IconBookmarkFilled size={16} className="text-amber-500"/> : <IconBookmark size={16}/>} text={selectedItem?.isDocumentBookmarked ? "Remove Bookmark" : "Bookmark"} onClick={() => toggleBookmark(selectedItem.id, selectedItem.isDocumentBookmarked)} />
              {['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(selectedItem?.type) && <MenuBtn icon={<IconDownload size={16}/>} text="Download with Watermark" onClick={() => {setIsMenuOpen(false); setOpen('password');}} />}
              <MenuBtn icon={<IconCopy size={16}/>} text="Copy File" onClick={() => handleCopy(selectedItem.name, selectedItem.path)} />
              <MenuBtn icon={<IconScript size={16}/>} text="Request Physical Copy" onClick={() => {setIsMenuOpen(false); setOpen('physicalDocument');}} />
              <div className="h-px w-full bg-slate-100 my-1"></div>
              <MenuBtn icon={<IconArchive size={16}/>} text="Archive" onClick={() => handleArchive(selectedItem)} />
              <MenuBtn icon={<IconTrash size={16}/>} text="Delete" onClick={() => handleDelete(selectedItem)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" iconClass="text-rose-500" />
            </>
          ) : ( <MenuBtn icon={<IconDownload size={16}/>} text="Download ZIP" onClick={() => handleDownloadFolder(selectedItem.name, selectedItem.path)} /> )}
          <div className="h-px w-full bg-slate-100 my-1"></div>
          <MenuBtn icon={<IconSettings size={16}/>} text="Properties" onClick={() => { setIsMenuOpen(false); setShowProperties(true); }} />
        </div>
      </CustomModal>

      {/* Modern Properties Modal */}
      <CustomModal isOpen={showProperties} onClose={() => setShowProperties(false)}>
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Properties</h2>
            <button onClick={() => setShowProperties(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors outline-none"><IconSquareLetterX size={20} stroke={1.5} /></button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 text-sm bg-slate-50/50 p-6 rounded-xl border border-slate-100">
          <Prop label="Name" value={selectedItem?.name} className="col-span-2" />
          <Prop label="Location Path" value={selectedItem?.path} className="col-span-2" />
          <Prop label="Format Type" value={selectedItem?.type?.toUpperCase()} />
          <Prop label="File Size" value={selectedItem?.size ? `${selectedItem.size} bytes` : '—'} />
          <Prop label="Created By" value={selectedItem?.createdBy} />
          <Prop label="Creation Date" value={selectedItem?.createdOn ? moment(selectedItem.createdOn).format('DD MMM YYYY, HH:mm') : '—'} />
        </div>
      </CustomModal>

      {/* Forms */}
      <CustomModal isOpen={showFolderModal} onClose={() => setShowFolderModal(false)}>
        <h2 className="text-lg font-bold mb-5 tracking-tight text-slate-800">Create New Folder</h2>
        <form onSubmit={handleSubmit(handleCreateFolder)}>
          <input type="text" className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm mb-2 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Enter folder name..." {...register('folderName', { required: 'Required' })} />
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setShowFolderModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">Create</button>
          </div>
        </form>
      </CustomModal>

      <CustomModal isOpen={showUploadFileModal} onClose={() => { setUploadFileModal(false); resetFile(); }}>
        <h2 className="text-lg font-bold mb-5 tracking-tight text-slate-800">Upload File</h2>
        <form onSubmit={handleSubmitFile(handleFileUpload)}>
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 hover:border-indigo-400 transition-colors relative flex flex-col items-center justify-center min-h-[160px]">
             
             {(!selectedUploadFile || selectedUploadFile.length === 0) && (
               <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" {...registerFile('file', { required: 'Required' })} />
             )}

             {selectedUploadFile && selectedUploadFile.length > 0 ? (
               <div className="flex flex-col items-center justify-center text-center z-10 w-full">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3 text-indigo-600">
                    <IconScript size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{selectedUploadFile[0].name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(selectedUploadFile[0].size / 1024).toFixed(1)} KB</p>
                  <button type="button" className="text-xs text-rose-500 font-medium mt-4 px-3 py-1.5 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors" onClick={() => setFileValue('file', null)}>
                    Remove File
                  </button>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                  <IconUpload size={32} className="text-indigo-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click to select or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">Any file type is supported</p>
               </div>
             )}

          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => { setUploadFileModal(false); resetFile(); }} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
            <button type="submit" disabled={isSubmittingFile || !selectedUploadFile || selectedUploadFile.length === 0} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">Upload</button>
          </div>
        </form>
      </CustomModal>

      <CustomModal isOpen={open === 'physicalDocument'} onClose={() => { setOpen(false); resetDept(); }}>
        <h2 className="text-lg font-bold mb-5 tracking-tight text-slate-800">Request Physical Document</h2>
        <form onSubmit={handleSubmitDept(onSubmitDept)} className="space-y-5">
          <select {...registerDept('departmentId', { required: 'Required' })} className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-sm">
            <option value="">-- Select Department --</option>
            {departments.map((item) => <option key={item?.id} value={item?.id}>{item?.name}</option>)}
          </select>
          <Controller name="reason" control={controlDept} rules={{ required: 'Required' }} render={({ field }) => <CustomTextField {...field} label="Reason for request" error={deptErrors.reason?.message} />} />
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setOpen(false); resetDept(); }} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
            <button type="submit" disabled={actionsLoading} className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">Submit Request</button>
          </div>
        </form>
      </CustomModal>

      <ModalWithField open={open === 'password'} setOpen={setOpen} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading} fieldName="password" onSubmit={handleDownloadWithWatermark} defaultWatermark={`Uncontrolled Copy For Reference P.B.No ${username}`} />
      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}
    </div>
  );
}

const MenuBtn = ({ icon, text, onClick, className = '', iconClass = 'text-slate-400' }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-700 rounded-lg outline-none transition-colors ${className}`}>
    <span className={iconClass}>{icon}</span> <span>{text}</span>
  </button>
);

const Prop = ({ label, value, className = '' }) => (
  <div className={`flex flex-col ${className}`}>
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</span>
    <span className="text-sm font-semibold text-slate-800 break-words">{value || '—'}</span>
  </div>
);