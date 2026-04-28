import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  DeleteFile,
  GenerateDocumentName,
  GetWorkflows,
  getWorkflowTemplates,
  ProcessInitiate,
  uploadDocumentInProcess,
  useTemplateDocument,
  ViewDocument,
  GetDraftForEditing,
  SaveOrUpdateDraft,
  SubmitDraft,
  deleteDraft,
  GetProcessesForCopy,
  GetProcessCopyDetails,
  DuplicateDocumentForCopy
} from '../../common/Apis';
import { toast } from 'react-toastify';
import { 
  IconInfoCircle, 
  IconLoader, 
  IconCopy, 
  IconCloudUpload, 
  IconFileText, 
  IconTrash, 
  IconEye, 
  IconSearch, 
  IconX,
  IconEdit,
  IconCheck,
  IconPencil,
  IconDatabaseImport,
  IconFolderPlus,
  IconSitemap,
  IconUsers,
  IconTarget,
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconShield,
  IconBuilding
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import ViewFile from '../view/View';
import Title from '../../CustomComponents/Title';

const InputClass = "w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 text-sm";
const LabelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

const Section = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
    <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-5">{title}</h3>
    {children}
  </div>
);

// --- COMPONENT: Metadata Modal ---
const MetadataOnlyModal = ({ isOpen, onClose, onSave, workflowId }) => {
  const [metaDoc, setMetaDoc] = useState({
    metaFileName: '', metaFileExtension: 'pdf', partNumber: '', issueNo: '', description: '', tags: [], preApproved: false, isSopDocument: true,
  });
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    if (!metaDoc.metaFileName.trim()) { toast.warning('Please provide a file name for the metadata entry'); return; }
    onSave({ ...metaDoc, isMetadataOnly: true });
    setMetaDoc({ metaFileName: '', metaFileExtension: 'pdf', partNumber: '', issueNo: '', description: '', tags: [], preApproved: false, isSopDocument: true });
    setTagInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><IconDatabaseImport size={20} className="text-blue-600" />Add Metadata Entry (No File)</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full"><IconX size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800"><strong>Note:</strong> This creates a document placeholder with metadata only. Actual files can be uploaded later.</div>
          <div><label className={LabelClass}>Intended File Name *</label><input type="text" className={InputClass} value={metaDoc.metaFileName} onChange={(e) => setMetaDoc(prev => ({ ...prev, metaFileName: e.target.value }))} placeholder="e.g. Quality_Procedure_v1" /></div>
          <div>
            <label className={LabelClass}>Expected File Extension</label>
            <select className={InputClass} value={metaDoc.metaFileExtension} onChange={(e) => setMetaDoc(prev => ({ ...prev, metaFileExtension: e.target.value }))}>
              {['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'other'].map(ext => <option key={ext} value={ext}>{ext.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={LabelClass}>Document Number</label><input type="text" className={InputClass} value={metaDoc.partNumber} onChange={(e) => setMetaDoc(prev => ({ ...prev, partNumber: e.target.value }))} placeholder="e.g. DOC-123" /></div>
            <div><label className={LabelClass}>Issue / Revision No</label><input type="text" className={InputClass} value={metaDoc.issueNo} onChange={(e) => setMetaDoc(prev => ({ ...prev, issueNo: e.target.value }))} placeholder="e.g. Rev 1.0" /></div>
          </div>
          <div><label className={LabelClass}>Description</label><input type="text" className={InputClass} value={metaDoc.description} onChange={(e) => setMetaDoc(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description" /></div>
          <div>
            <label className={LabelClass}>Tags</label>
            <div className="flex gap-2">
              <input type="text" className={InputClass} value={tagInput} onChange={(e) => setTagInput(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) { setMetaDoc(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] })); setTagInput(''); } } }} placeholder="Add tag and press Enter" />
              <button type="button" onClick={() => { if (tagInput.trim()) { setMetaDoc(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] })); setTagInput(''); } }} className="bg-gray-100 px-4 py-2 rounded-lg border">Add</button>
            </div>
            {metaDoc.tags.length > 0 && ( <div className="flex flex-wrap gap-2 mt-2"> {metaDoc.tags.map((tag, i) => ( <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5">{tag} <IconX size={14} className="cursor-pointer" onClick={() => setMetaDoc(prev => ({ ...prev, tags: prev.tags.filter((_, ti) => ti !== i) }))} /></span> ))} </div> )}
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={metaDoc.isSopDocument} onChange={(e) => setMetaDoc(prev => ({ ...prev, isSopDocument: e.target.checked }))} className="w-4 h-4" /><span className="text-sm font-semibold text-gray-700">SOP Document</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={metaDoc.preApproved} onChange={(e) => setMetaDoc(prev => ({ ...prev, preApproved: e.target.checked }))} className="w-4 h-4" /><span className="text-sm font-semibold text-gray-700">Pre-Approved</span></label>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
          <button type="button" onClick={handleSave} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"><IconCheck size={18} /> Add Metadata Entry</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT: Detailed Workflow Timeline Preview ---
const STEP_TYPE_CONFIG = {
  APPROVAL: { color: '#10B981', bg: '#D1FAE5', label: 'Approval', icon: <IconCheck size={14} stroke={3} /> },
  REVIEW: { color: '#F59E0B', bg: '#FEF3C7', label: 'Review', icon: <IconEye size={14} stroke={2.5} /> },
  NOTIFICATION: { color: '#14B8A6', bg: '#CCFBF1', label: 'Notify', icon: <IconAlertCircle size={14} stroke={2.5} /> },
  DEFAULT: { color: '#3B82F6', bg: '#DBEAFE', label: 'Task', icon: <IconTarget size={14} stroke={2.5} /> }
};

const AssigneeBadgeList = ({ list }) => {
  const [expanded, setExpanded] = useState(false);
  if (!list || !list.length) return null;
  const limit = 12;
  const visible = expanded ? list : list.slice(0, limit);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {visible.map((item, i) => (
          <span key={i} className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md font-semibold truncate max-w-[140px] shadow-sm flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[8px] font-black">{String(item.name || item.username || item)[0].toUpperCase()}</div>
            {item.name || item.username || String(item)}
          </span>
        ))}
      </div>
      {list.length > limit && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
          {expanded ? 'Collapse Assignees ↑' : `+ View All ${list.length} Assignees ↓`}
        </button>
      )}
    </div>
  );
};

const DetailedWorkflowPreview = ({ steps }) => {
  const [expandedIndex, setExpandedIndex] = useState(0);

  if (!steps || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <IconSitemap size={32} className="mb-2 opacity-50" />
        <p className="text-sm font-medium">No steps available to preview for this workflow version.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="relative border-l-2 border-gray-200 ml-4 space-y-6 pb-2">
        {steps.map((step, index) => {
          const actionType = step?.assignments?.[0]?.actionType;
          const cfg = STEP_TYPE_CONFIG[actionType] || STEP_TYPE_CONFIG.DEFAULT;
          const isExpanded = expandedIndex === index;
          const assigneeCount = (step.assignments || []).reduce((sum, a) => sum + (a.assigneeIds?.length || 0), 0);
          const roleCount = (step.assignments || []).reduce((sum, a) => sum + (a.selectedRoles?.length || 0), 0);

          return (
            <div key={index} className="relative pl-6">
              {/* Timeline Dot */}
              <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center" style={{ backgroundColor: cfg.color }}>
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Step Card */}
              <div 
                onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${isExpanded ? 'border-blue-300 shadow-md ring-1 ring-blue-500/10' : 'border-gray-200 shadow-sm hover:border-blue-200 hover:bg-gray-50/50'}`}
              >
                {/* Header (Always Visible) */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">{step.stepName || 'Unnamed Step'}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {step.allowParallel && <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded uppercase">Parallel</span>}
                        {step.requiresDocument && <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded uppercase">Doc Required</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      {assigneeCount > 0 && <span className="text-xs font-semibold text-gray-600 flex items-center gap-1"><IconUsers size={14} className="text-gray-400"/> {assigneeCount} Target{assigneeCount !== 1 ? 's' : ''}</span>}
                      {roleCount > 0 && <span className="text-xs font-semibold text-gray-600 flex items-center gap-1"><IconShield size={14} className="text-gray-400"/> {roleCount} Role Rule{roleCount !== 1 ? 's' : ''}</span>}
                    </div>
                    <div className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                      {isExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {/* Details Body (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {step.assignments?.length > 0 ? (
                      step.assignments.map((assignment, aIdx) => (
                        <div key={aIdx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                              {assignment.assigneeType === 'USER' && <IconUsers size={14} className="text-blue-500"/>}
                              {assignment.assigneeType === 'ROLE' && <IconShield size={14} className="text-purple-500"/>}
                              {assignment.assigneeType === 'DEPARTMENT' && <IconBuilding size={14} className="text-teal-500"/>}
                              {assignment.assigneeType || 'Assignment'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">Action: {assignment.actionType}</span>
                          </div>

                          {/* Specific Users List */}
                          {assignment.assigneeIds?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Specific Assignees ({assignment.assigneeIds.length})</p>
                              <AssigneeBadgeList list={assignment.assigneeIds} />
                            </div>
                          )}

                          {/* Roles / Departments */}
                          {assignment.selectedRoles?.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Role & Department Logic</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {assignment.selectedRoles.map((roleMap, rIdx) => (
                                  <div key={rIdx} className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-xs">
                                    {roleMap.department && (
                                      <div className="flex items-center gap-1.5 text-teal-700 font-bold mb-1.5">
                                        <IconBuilding size={14} /> Dept: {roleMap.department}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                      {roleMap.roles?.map((r, i) => (
                                        <span key={i} className="bg-white border border-purple-200 text-purple-700 px-2 py-0.5 rounded shadow-sm font-semibold flex items-center gap-1">
                                          <div className="w-1 h-1 rounded-full bg-purple-500"/> {r.name || r}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!(assignment.assigneeIds?.length > 0) && !(assignment.selectedRoles?.length > 0) && (
                            <p className="text-xs text-gray-400 italic">No specific targets defined for this rule.</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 bg-white border border-dashed border-gray-300 rounded-lg">
                        <IconAlertCircle size={24} className="mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-500">No assignment rules configured for this step.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function InitiateProcess() {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [workflowData, setWorkflowData] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState({
    tags: [], partNumber: '', preApproved: false, fileDescription: '', issueNo: '', name: '', isSopDocument: true, editableRefFile: null
  });
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef(null);
  const refInputRef = useRef(null);

  const [pendingFiles, setPendingFiles] = useState([]); 

  const [templates, setTemplates] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [fileView, setFileView] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [processList, setProcessList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyingDocs, setCopyingDocs] = useState(false);
  const [copyProgress, setCopyProgress] = useState({ current: 0, total: 0 });

  const [editingDocument, setEditingDocument] = useState(null); 
  const [editTagInput, setEditTagInput] = useState('');

  const defaultValues = { workflowId: '', description: '', documents: [], issueNo: '' };
  const { control, handleSubmit, register, setValue, watch, reset, formState: { errors } } = useForm({ defaultValues });
  const [workflowId] = watch(['workflowId']);
  const { fields: documentFields, append: addDocument, remove: removeDocument, update: updateDocument } = useFieldArray({ control, name: 'documents' });
  const watchedDocuments = watch('documents');

  useEffect(() => {
    if (showCopyModal || editingDocument || copyingDocs || fileView || showMetadataModal) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = 'unset'; }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showCopyModal, editingDocument, copyingDocs, fileView, showMetadataModal]);

  useEffect(() => { if (draftId) loadDraftForEdit(draftId); }, [draftId]);

  const loadDraftForEdit = async (id) => {
    setActionsLoading(true);
    try {
      const response = await GetDraftForEditing(id);
      const { type, draftId: fetchedDraftId, formData } = response.data;

      if (type !== "INITIATE") { toast.error("This is not an initiation draft"); navigate('/processes/initiate'); return; }

      reset({
        workflowId: formData.workflowId, description: formData.description, issueNo: formData.issueNo,
        documents: formData.documents.map(doc => ({
          documentId: doc.documentId, name: doc.name, tags: doc.tags || [], partNumber: doc.partNumber, description: doc.description, issueNo: doc.issueNo, preApproved: doc.preApproved, documentPath: doc.documentPath, isSopDocument: doc.isSopDocument !== false, isMetadataOnly: doc.isMetadataOnly || false, metaFileName: doc.metaFileName || '', metaFileExtension: doc.metaFileExtension || '', editableDocumentId: doc.editableDocumentId || null
        })),
      });

      setCurrentDraftId(fetchedDraftId); setIsEditMode(true);

      if (formData.workflowId) {
        const allWorkflows = await GetWorkflows();
        const workflows = allWorkflows.data.workflows || [];
        const workflowMatch = workflows.find(wf => wf.versions?.some(ver => ver.id === formData.workflowId));
        if (workflowMatch) setSelectedWorkflow(workflowMatch);
      }
      toast.success('Draft loaded successfully');
    } catch (error) { toast.error(error?.response?.data?.message || error?.message); navigate('/processes/initiate'); } finally { setActionsLoading(false); }
  };

  const handleDeleteDocument = async (index, id, isMetadataOnly) => {
    setActionsLoading(true);
    try { if (!isMetadataOnly) { await DeleteFile(id); } toast.success('Document removed'); removeDocument(index); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); }
  };

  useEffect(() => {
    const getWorkflowsData = async () => { try { const response = await GetWorkflows(); setWorkflowData(response?.data?.workflows || []); } catch (error) { console.log(error); } };
    getWorkflowsData();
  }, []);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);
  const handleRefFileChange = (event) => setFileDetails(prev => ({ ...prev, editableRefFile: event.target.files[0] }));

  const handleUpload = async () => {
    if (!workflowId) { toast.info('Please select workflow.'); return; }
    if (!selectedFile) return;

    setActionsLoading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      let mainFileName = fileDetails.name;
      if (!fileDetails.preApproved) {
        const nameRes = await GenerateDocumentName(workflowId, null, ext);
        mainFileName = nameRes?.data?.documentName;
      } else {
        mainFileName = mainFileName.includes('.') ? mainFileName : `${mainFileName}.${ext}`;
      }

      const res = await uploadDocumentInProcess([selectedFile], mainFileName, fileDetails?.tags);
      const mainDocId = res[0];
      let editableDocId = null;

      if (fileDetails.isSopDocument && fileDetails.editableRefFile) {
        const refExt = fileDetails.editableRefFile.name.split('.').pop();
        const baseName = mainFileName.substring(0, mainFileName.lastIndexOf('.'));
        const refName = `${baseName}_reference.${refExt}`; 
        const refUploadRes = await uploadDocumentInProcess([fileDetails.editableRefFile], refName, []);
        editableDocId = refUploadRes[0];
      }

      toast.success('File uploaded successfully');

      addDocument({
        documentId: mainDocId, name: mainFileName, tags: fileDetails.tags, description: fileDetails.fileDescription, partNumber: fileDetails.partNumber, preApproved: fileDetails.preApproved, issueNo: fileDetails.issueNo, isSopDocument: fileDetails.isSopDocument, isMetadataOnly: false, editableDocumentId: editableDocId
      }, { shouldFocus: false });

      setFileDetails({ tags: [], partNumber: '', preApproved: false, fileDescription: '', issueNo: '', name: '', isSopDocument: true, editableRefFile: null });
      setNewTag(''); setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = null;
      if (refInputRef.current) refInputRef.current.value = null;
    } catch (err) { toast.error(err?.response?.data?.message || err.message); } finally { setActionsLoading(false); }
  };

  const handleMultipleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPending = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9), file, name: file.name, partNumber: '', issueNo: '', description: '', tags: [], tagInput: '', isSopDocument: true, preApproved: false, editableRefFile: null
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
    e.target.value = null; 
  };

  const removePendingFile = (id) => setPendingFiles(prev => prev.filter(p => p.id !== id));
  const updatePendingFile = (id, field, value) => setPendingFiles(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const handleUploadAllPending = async () => {
    if (!workflowId) return toast.warning('Please select a workflow first.');
    if (pendingFiles.length === 0) return;

    setActionsLoading(true);
    try {
      for (let pending of pendingFiles) {
        const ext = pending.file.name.split('.').pop();
        let mainFileName = pending.name;
        if (!pending.preApproved) {
          const nameRes = await GenerateDocumentName(workflowId, null, ext);
          mainFileName = nameRes?.data?.documentName;
        } else {
          mainFileName = mainFileName.includes('.') ? mainFileName : `${mainFileName}.${ext}`;
        }

        const uploadRes = await uploadDocumentInProcess([pending.file], mainFileName, pending.tags);
        const mainDocId = uploadRes[0];
        let editableDocId = null;

        if (pending.isSopDocument && pending.editableRefFile) {
          const refExt = pending.editableRefFile.name.split('.').pop();
          const baseName = mainFileName.substring(0, mainFileName.lastIndexOf('.'));
          const refName = `${baseName}_reference.${refExt}`; 
          const refUploadRes = await uploadDocumentInProcess([pending.editableRefFile], refName, []);
          editableDocId = refUploadRes[0];
        }

        addDocument({
          documentId: mainDocId, name: mainFileName, tags: pending.tags, description: pending.description, partNumber: pending.partNumber, preApproved: pending.preApproved, issueNo: pending.issueNo, isSopDocument: pending.isSopDocument, isMetadataOnly: false, editableDocumentId: editableDocId
        });
      }
      toast.success('All staging files uploaded successfully');
      setPendingFiles([]);
    } catch (err) { toast.error(err?.response?.data?.message || err.message); } finally { setActionsLoading(false); }
  };

  const handleAddMetadataDoc = (metaDocData) => {
    addDocument({
      documentId: `meta_${Date.now()}`, name: `${metaDocData.metaFileName}.${metaDocData.metaFileExtension}`, tags: metaDocData.tags, description: metaDocData.description, partNumber: metaDocData.partNumber, preApproved: metaDocData.preApproved, issueNo: metaDocData.issueNo, isSopDocument: metaDocData.isSopDocument, isMetadataOnly: true, metaFileName: metaDocData.metaFileName, metaFileExtension: metaDocData.metaFileExtension, editableDocumentId: null
    }, { shouldFocus: false });
    toast.success('Metadata entry added');
  };

  const fetchProcessesForCopy = async () => { try { const res = await GetProcessesForCopy(); setProcessList(res.data); } catch (error) { toast.error(error?.response?.data?.message || error.message); } };

  const handleSelectProcess = async (process) => {
    setShowCopyModal(false); setCopyingDocs(true);
    try {
      const detailsRes = await GetProcessCopyDetails(process.id);
      const { description, issueNo, documents } = detailsRes.data;
      setCopyProgress({ current: 0, total: documents.length });
      setValue('description', description || ''); setValue('issueNo', issueNo || '');

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i]; setCopyProgress(prev => ({ ...prev, current: i + 1 }));
        try {
          const res = await DuplicateDocumentForCopy({ sourceProcessId: process.id, sourceDocumentId: doc.documentId, targetWorkflowId: workflowId });
          addDocument({ documentId: res.data.documentId, name: res.data.name, tags: doc.tags || [], description: doc.description, partNumber: doc.partNumber, preApproved: doc.preApproved, issueNo: doc.issueNo, isSopDocument: doc.isSopDocument !== false, isMetadataOnly: false, editableDocumentId: doc.editableDocumentId || null }, { shouldFocus: false });
        } catch (err) { console.error(`Failed to duplicate ${doc.name}`, err); toast.error(`Failed to copy ${doc.name}`); }
      }
      toast.success(`Documents processed successfully.`);
    } catch (error) { toast.error(error?.response?.data?.message || error.message); } finally { setCopyingDocs(false); setCopyProgress({ current: 0, total: 0 }); }
  };

  const handleSaveDraft = async (data) => {
    setActionsLoading(true);
    try {
      const payload = { ...data, saveAsDraft: true, draftId: currentDraftId, type: "INITIATE" };
      const res = await SaveOrUpdateDraft(payload);
      toast.success(res?.data?.message || 'Draft saved successfully');
      setCurrentDraftId(res?.data?.draftId); setIsEditMode(true); navigate('/processes/drafted');
    } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); }
  };

  const handleSubmitImmediately = async (data) => {
    if (data?.documents?.length === 0) { toast.info('Please upload documents or add metadata entries for process'); return; }
    setActionsLoading(true);
    try {
      const res = await ProcessInitiate(data);
      if (currentDraftId) { await deleteDraft({ draftId: currentDraftId }); }
      toast.success(res?.data?.message || 'Process initiated successfully'); navigate('/processes/work');
    } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); }
  };

  const handleUseTemplate = async (template) => {
    setActionsLoading(true);
    try {
      const res = await useTemplateDocument({ workflowId, templateId: template?.id });
      toast.success(res?.data?.message);
      addDocument({ documentId: res?.data?.documentId, name: res?.data?.documentName, tags: [], documentPath: res?.data?.documentPath, info: 'Prepared from template. Please edit to add the latest data.', isSopDocument: true, isMetadataOnly: false, editableDocumentId: null }, { shouldFocus: false });
    } catch (error) { toast.error(error?.response?.data?.message || error.message); } finally { setActionsLoading(false); }
  };

  const handleViewFile = async (name, path, fileId, type, editing) => { setActionsLoading(true); try { const fileData = await ViewDocument(name, path, type, fileId, editing); setFileView(fileData); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };

  const openEditModal = (doc, index) => { setEditingDocument({ index, documentId: doc.documentId, partNumber: doc.partNumber || '', issueNo: doc.issueNo || '', description: doc.description || '', tags: doc.tags || [], isSopDocument: doc.isSopDocument !== false, isMetadataOnly: doc.isMetadataOnly || false, metaFileName: doc.metaFileName || '', metaFileExtension: doc.metaFileExtension || '', }); setEditTagInput(''); };
  const closeEditModal = () => { setEditingDocument(null); setEditTagInput(''); };
  const handleSaveDocumentEdit = () => { if (!editingDocument) return; const { index, partNumber, issueNo, description, tags, isSopDocument, isMetadataOnly, metaFileName, metaFileExtension } = editingDocument; updateDocument(index, { ...documentFields[index], partNumber, issueNo, description, tags, isSopDocument, isMetadataOnly, metaFileName, metaFileExtension, }); closeEditModal(); toast.success('Document details updated'); };
  const addTagToEditing = () => { if (!editTagInput.trim()) return; setEditingDocument(prev => ({ ...prev, tags: [...prev.tags, editTagInput.trim()] })); setEditTagInput(''); };
  const removeTagFromEditing = (tagIndex) => { setEditingDocument(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== tagIndex) })); };

  const sopDocs = documentFields.filter((_, i) => watchedDocuments[i]?.isSopDocument !== false);
  const nonSopDocs = documentFields.filter((_, i) => watchedDocuments[i]?.isSopDocument === false);

  const renderDocumentItem = (doc, index, currentDocState) => (
    <li key={doc.id} className={`flex flex-col p-4 border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${currentDocState.isMetadataOnly ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 mt-1 ${currentDocState.isMetadataOnly ? 'bg-amber-100 border border-amber-200 text-amber-600' : 'bg-blue-50 border border-blue-100 text-blue-600'}`}> {currentDocState.isMetadataOnly ? <IconDatabaseImport size={20} /> : <IconFileText size={20} />} </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 break-words line-clamp-2" title={currentDocState.name}>{currentDocState.name || 'Unnamed Document'}</p>
              {currentDocState.isMetadataOnly && (<span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Metadata Only</span>)}
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${currentDocState.isSopDocument !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}> {currentDocState.isSopDocument !== false ? 'SOP' : 'NON-SOP'} </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
              {currentDocState.partNumber && <span>Part: <span className="font-medium">{currentDocState.partNumber}</span></span>}
              {currentDocState.issueNo && <span>Issue: <span className="font-medium">{currentDocState.issueNo}</span></span>}
            </div>
            {currentDocState.description && <p className="text-xs text-gray-500 mt-1 truncate max-w-md">{currentDocState.description}</p>}
            {currentDocState.tags?.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{currentDocState.tags.map(t => <span key={t} className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">{t}</span>)}</div>)}
            {currentDocState.editableDocumentId && (<div className="mt-2 text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block font-semibold">Includes Editable Reference</div>)}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
          <button type="button" disabled={actionsLoading} onClick={() => openEditModal(currentDocState, index)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"><IconEdit size={16} /> Edit</button>
          {!currentDocState.isMetadataOnly && (<button type="button" disabled={actionsLoading} onClick={() => handleViewFile(doc.name, doc.documentPath || '/check', doc.documentId, doc.name?.split('.').pop(), true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"><IconEye size={16} /> View</button>)}
          <button type="button" disabled={actionsLoading} onClick={() => handleDeleteDocument(index, doc.documentId, doc.isMetadataOnly)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"><IconTrash size={16} /> Remove</button>
        </div>
      </div>
    </li>
  );

  return (
    <>
      {actionsLoading && <TopLoader />}

      {copyingDocs && ( <div className="fixed inset-0 z-[10000] bg-white/70 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300"> <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center max-w-sm w-full mx-4"> <div className="relative mb-6"> <IconLoader className="animate-spin text-blue-600" size={48} stroke={1.5} /> <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-700"> {copyProgress.total > 0 ? Math.round((copyProgress.current / copyProgress.total) * 100) : 0}% </div> </div> <h3 className="text-lg font-bold text-gray-900 mb-1">Duplicating Documents</h3> <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">Transferring files to your current workflow. Please do not close this window.</p> <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden"> <div className="bg-blue-600 h-full transition-all duration-500 ease-out" style={{ width: `${(copyProgress.current / copyProgress.total) * 100}%` }}></div> </div> <div className="flex justify-between w-full px-1"> <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Syncing</span> <span className="text-xs font-bold text-gray-400">{copyProgress.current} of {copyProgress.total}</span> </div> </div> </div> )}
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <Title text={isEditMode ? 'Edit Draft' : 'Initiate Process'} className="text-2xl font-bold text-gray-900" />
          <div className="flex flex-wrap gap-3">
            <CustomButton type="button" text="Save as Draft" variant="secondary" click={handleSubmit((data) => handleSaveDraft(data))} disabled={actionsLoading || documentFields.length === 0} className="px-4 py-2 rounded-lg" />
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <Section title="Process Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div><label className={LabelClass}>Description</label><input {...register('description', { required: 'Description is required' })} className={InputClass} placeholder="Enter process description" />{errors.description && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.description.message}</p>}</div>
              <div><label className={LabelClass}>SOP Issue / Revision Number</label><input {...register('issueNo')} className={InputClass} placeholder="Enter issue/revision number" /></div>
<div>
                <label className={LabelClass}>Select Workflow</label>
                <select 
                  className={InputClass} 
                  onChange={(e) => { 
                    const selectedName = e.target.value;
                    const selected = workflowData.find(wf => wf.name === selectedName); 
                    setSelectedWorkflow(selected); 
                    setValue('workflowId', ''); 
                  }} 
                  value={selectedWorkflow?.name || ''}
                >
                  <option value="">-- Choose a Workflow --</option>
                  {/* Force unique workflows by name to prevent duplicates */}
                  {Array.from(new Map((workflowData || []).map(item => [item.name, item])).values()).map((wf, idx) => (
                    <option key={wf.id || `wf-${idx}`} value={wf.name}>{wf.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={LabelClass}>Select Version</label>
                <Controller 
                  name="workflowId" 
                  control={control} 
                  rules={{ required: 'Version selection is required' }} 
                  render={({ field }) => {
                    // Force unique versions by ID to prevent weird duplicate lists
                    const uniqueVersions = selectedWorkflow?.versions 
                      ? Array.from(new Map(selectedWorkflow.versions.map(v => [v.id, v])).values()) 
                      : [];

                    return (
                      <select {...field} className={InputClass} disabled={!selectedWorkflow}> 
                        <option value="">-- Choose a Version --</option> 
                        {uniqueVersions.map((ver, idx) => ( 
                          <option key={ver.id || `ver-${idx}`} value={ver.id}>
                            Version {ver.version} {ver.description ? `- ${ver.description}` : ''}
                          </option> 
                        ))} 
                      </select> 
                    );
                  }} 
                />
                {errors.workflowId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.workflowId.message}</p>}
                
                <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">Want to reuse documents?</p>
                  <button type="button" disabled={!workflowId || copyingDocs} onClick={() => { if (!workflowId) return; setShowCopyModal(true); fetchProcessesForCopy(); }} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 border border-indigo-200">
                    <IconCopy size={18} /> Copy from existing process
                  </button>
                </div>
              </div>
            </div>

            {/* NEW DETAILED WORKFLOW PREVIEW RENDERED HERE */}
            {workflowId && (
              <div className="mt-6 border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <IconSitemap size={18} className="text-blue-600" />
                    Workflow Steps & Assignments
                  </p>
                  <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                    Version {selectedWorkflow?.versions?.find(item => item.id === workflowId)?.version}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Click on any step below to inspect its detailed assignment logic.</p>
                <DetailedWorkflowPreview steps={selectedWorkflow?.versions?.find(item => item.id === workflowId)?.steps} />
              </div>
            )}
          </Section>

          {templates?.length > 0 && (
            <Section title="Available Templates">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map(template => (
                  <div key={template.id} className="flex flex-col justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all group">
                    <div className="mb-4"><p className="font-semibold text-gray-800 text-sm">{template.name}</p><p className="text-xs text-gray-500 mt-1 truncate">{template.path}</p></div>
                    <button type="button" disabled={actionsLoading} onClick={() => handleUseTemplate(template)} className="w-full py-2 bg-gray-50 text-blue-600 text-sm font-semibold rounded-lg border border-gray-200 group-hover:bg-blue-50 transition-colors">Use Template</button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Upload New Document (Single File)">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 flex flex-col">
                <label className={LabelClass}>Choose File</label>
                <div className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                  <input type="file" ref={inputRef} className="hidden" onChange={handleFileChange} />
                  {!selectedFile ? (
                    <div className="text-center cursor-pointer" onClick={() => inputRef.current?.click()}>
                      <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3"> <IconCloudUpload className="text-blue-500" size={24} /> </div>
                      <p className="text-sm font-medium text-gray-700">Click to browse or drag file here</p>
                      <p className="text-xs text-gray-500 mt-1">Supports PDF, DOCX, etc.</p>
                    </div>
                  ) : (
                    <div className="text-center w-full min-w-0">
                      <IconFileText className="mx-auto text-blue-600 mb-2" size={32} />
                      <span className="text-gray-800 font-semibold text-sm truncate block px-2 break-all">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500 block mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                      <button type="button" className="text-red-500 text-xs font-semibold mt-3 hover:text-red-700 flex items-center justify-center gap-1 mx-auto" onClick={() => { setSelectedFile(null); if(inputRef.current) inputRef.current.value = null; }}>
                        <IconTrash size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 text-center">
                  <span className="text-xs text-gray-400 font-medium">— or —</span>
                  <button type="button" disabled={!workflowId} onClick={() => setShowMetadataModal(true)} className="mt-2 w-full flex justify-center items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"><IconDatabaseImport size={16} /> Add Metadata Entry Only</button>
                </div>
              </div>

              <div className="w-full md:w-2/3 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className={LabelClass}>Document Number</label><input value={fileDetails.partNumber} onChange={(e) => setFileDetails(prev => ({ ...prev, partNumber: e.target.value }))} className={InputClass} placeholder="e.g. DOC-123" /></div>
                  <div><label className={LabelClass}>Issue / Revision Number</label><input value={fileDetails.issueNo} onChange={(e) => setFileDetails(prev => ({ ...prev, issueNo: e.target.value }))} className={InputClass} placeholder="e.g. Rev 1.0" /></div>
                  <div className="sm:col-span-2"><label className={LabelClass}>Document Description</label><input value={fileDetails.fileDescription} onChange={(e) => setFileDetails(prev => ({ ...prev, fileDescription: e.target.value }))} className={InputClass} placeholder="Brief description of this document" /></div>
                  {fileDetails.preApproved && ( <div className="sm:col-span-2"><label className={LabelClass}>Custom Document Name</label><input value={fileDetails.name} onChange={(e) => setFileDetails(prev => ({ ...prev, name: e.target.value }))} className={InputClass} placeholder="Enter preferred name" /></div> )}
                </div>

                <div>
                  <label className={LabelClass}>Tags</label>
                  <div className="flex gap-2">
                    <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newTag.trim()) { setFileDetails(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] })); setNewTag(''); } } }} className={InputClass} placeholder="Type a tag and press Enter or Add" />
                    <button type="button" onClick={() => { if (newTag.trim()) { setFileDetails(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] })); setNewTag(''); } }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg border border-gray-300 transition-colors">Add</button>
                  </div>
                  {fileDetails.tags.length > 0 && ( <div className="flex flex-wrap gap-2 mt-3"> {fileDetails.tags.map((tag, index) => ( <span key={index} className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5"> {tag} <IconX size={14} className="cursor-pointer hover:text-red-500" onClick={() => setFileDetails(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }))} /> </span> ))} </div> )}
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={fileDetails.isSopDocument} onChange={(e) => setFileDetails(prev => ({ ...prev, isSopDocument: e.target.checked }))} className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-300 checked:bg-green-600 checked:border-green-600 transition-all" />
                      <svg className="absolute w-3.5 h-3.5 left-[3px] top-[3px] text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 select-none group-hover:text-green-600 transition-colors">SOP Document</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input type="checkbox" checked={fileDetails.preApproved} onChange={(e) => setFileDetails(prev => ({ ...prev, preApproved: e.target.checked }))} className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all" />
                      <svg className="absolute w-3.5 h-3.5 left-[3px] top-[3px] text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 select-none group-hover:text-blue-600 transition-colors">Mark as Pre-Approved</span>
                  </label>
                  <button type="button" onClick={handleUpload} disabled={!selectedFile || actionsLoading} className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"> <IconCloudUpload size={18} /> Upload File </button>
                </div>

                {fileDetails.isSopDocument && (
                   <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
                      <label className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        Attach Editable Reference (Optional)
                      </label>
                      <p className="text-xs text-blue-700 mb-2">Upload the original non-editable source file (e.g. word doc) for reference.</p>
                      <div className="flex items-center gap-3">
                         <input type="file" ref={refInputRef} onChange={handleRefFileChange} className="text-sm flex-1" />
                         {fileDetails.editableRefFile && (
                           <button type="button" onClick={() => { setFileDetails(prev => ({...prev, editableRefFile: null})); if(refInputRef.current) refInputRef.current.value = null; }} className="text-red-500 hover:text-red-700"><IconX size={18} /></button>
                         )}
                      </div>
                   </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Upload Multiple Files (Staging)">
            <div className="flex flex-col gap-4">
              <div className="flex justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors">
                <input type="file" multiple id="multi-upload" className="hidden" onChange={handleMultipleFileChange} />
                <label htmlFor="multi-upload" className="cursor-pointer text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3"> <IconFolderPlus className="text-blue-500" size={24} /> </div>
                  <span className="text-sm font-semibold text-gray-700">Click to bulk select multiple files</span>
                  <span className="text-xs text-gray-500 mt-1">Add multiple documents to stage them for this process step</span>
                </label>
              </div>

              {pendingFiles.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mt-4 shadow-sm">
                  <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b border-gray-200">
                    <h4 className="font-bold text-gray-800 text-sm">Staged Files ({pendingFiles.length})</h4>
                    <button type="button" onClick={handleUploadAllPending} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors">Upload & Add All</button>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {pendingFiles.map((pf, index) => (
                      <div key={pf.id} className="p-4 bg-white grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between"> <span className="font-semibold text-sm truncate text-blue-700" title={pf.name}>{pf.name}</span> <IconX size={16} className="text-gray-400 hover:text-red-500 cursor-pointer" onClick={() => removePendingFile(pf.id)} /> </div>
                          <label className="flex items-center gap-2 cursor-pointer mt-1"> <input type="checkbox" checked={pf.isSopDocument} onChange={e => updatePendingFile(pf.id, 'isSopDocument', e.target.checked)} className="accent-green-600 w-4 h-4"/> <span className="text-xs font-bold text-gray-700">SOP Document</span> </label>
                          {pf.isSopDocument && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <span className="text-[10px] uppercase font-bold text-blue-800 mb-1 block">Editable Reference (Optional)</span>
                              <input type="file" className="text-[10px] w-full" onChange={e => updatePendingFile(pf.id, 'editableRefFile', e.target.files[0])} />
                            </div>
                          )}
                        </div>
                        <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div><label className={LabelClass}>Part No</label><input className={InputClass} value={pf.partNumber} onChange={e => updatePendingFile(pf.id, 'partNumber', e.target.value)} placeholder="DOC-01"/></div>
                          <div><label className={LabelClass}>Issue No</label><input className={InputClass} value={pf.issueNo} onChange={e => updatePendingFile(pf.id, 'issueNo', e.target.value)} placeholder="Rev 1"/></div>
                          <div className="col-span-2"><label className={LabelClass}>Description</label><input className={InputClass} value={pf.description} onChange={e => updatePendingFile(pf.id, 'description', e.target.value)} placeholder="Details..."/></div>
                          <div className="col-span-2 md:col-span-4 flex gap-2">
                             <input className={InputClass} placeholder="Add Tag + Enter" value={pf.tagInput} onChange={e => updatePendingFile(pf.id, 'tagInput', e.target.value)} onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); if(pf.tagInput.trim()) { updatePendingFile(pf.id, 'tags', [...pf.tags, pf.tagInput.trim()]); updatePendingFile(pf.id, 'tagInput', ''); } } }} />
                             <div className="flex flex-wrap gap-1 flex-1 items-center">
                               {pf.tags.map(t => (<span key={t} className="bg-gray-100 border text-xs px-2 py-1 rounded-full flex items-center gap-1">{t} <IconX size={12} className="cursor-pointer hover:text-red-500" onClick={() => updatePendingFile(pf.id, 'tags', pf.tags.filter(xt => xt !== t))} /></span>))}
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title={`SOP Documents (${sopDocs.length})`}>
            {sopDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 bg-green-50 rounded-xl border border-dashed border-green-300">
                <IconInfoCircle className="text-green-400 mb-2" size={32} />
                <p className="text-green-600 text-sm font-medium">No SOP documents attached yet.</p>
              </div>
            ) : (<ul className="grid grid-cols-1 gap-4">{documentFields.map((doc, index) => { const currentDocState = watchedDocuments[index] || doc; if (currentDocState.isSopDocument === false) return null; return renderDocumentItem(doc, index, currentDocState); })}</ul>)}
          </Section>

          <Section title={`NON-SOP Documents (${nonSopDocs.length})`}>
            {nonSopDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <IconInfoCircle className="text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm font-medium">No non-SOP documents attached yet.</p>
                <p className="text-gray-400 text-xs mt-1">Upload a file and uncheck "SOP Document" to add here.</p>
              </div>
            ) : (<ul className="grid grid-cols-1 gap-4">{documentFields.map((doc, index) => { const currentDocState = watchedDocuments[index] || doc; if (currentDocState.isSopDocument !== false) return null; return renderDocumentItem(doc, index, currentDocState); })}</ul>)}
          </Section>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={handleSubmit((data) => handleSaveDraft(data))} disabled={actionsLoading || documentFields.length === 0} className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-colors">Save as Draft</button>
            <button type="button" onClick={handleSubmit(handleSubmitImmediately)} disabled={actionsLoading || documentFields.length === 0} className="flex-1 py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed shadow-md transition-colors">Submit Process</button>
          </div>
        </form>
      </div>

      {showCopyModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Copy From Existing Process</h3>
              <button type="button" onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition-colors"><IconX size={20} /></button>
            </div>
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" placeholder="Search by name or description..." className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto bg-gray-50/50 min-h-[300px]">
              {processList.length === 0 ? (
                <div className="text-center py-12"><IconLoader className="animate-spin mx-auto text-gray-400 mb-3" size={32} /><p className="text-gray-500 text-sm font-medium">Loading available processes...</p></div>
              ) : (
                <ul className="space-y-3">
                  {processList.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))).map(process => (
                    <li key={process.id} className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group flex flex-col" onClick={() => handleSelectProcess(process)}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h4 className="font-bold text-gray-800 group-hover:text-blue-700 break-words leading-tight">{process.name}</h4>
                        <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded">{new Date(process.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{process.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 w-fit px-2.5 py-1.5 rounded-md mt-auto">
                        <IconInfoCircle size={14} /><span className="truncate">Workflow: {process.workflow.name} (v{process.workflow.version})</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
              <button type="button" onClick={() => setShowCopyModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingDocument && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"> <IconPencil size={20} className="text-blue-600" /> Edit Document Details </h3>
              <button type="button" onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full"><IconX size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {editingDocument.isMetadataOnly && ( <div> <label className={LabelClass}>File Name</label> <input type="text" className={InputClass} value={editingDocument.metaFileName} onChange={(e) => setEditingDocument({ ...editingDocument, metaFileName: e.target.value })} /> </div> )}
              <div><label className={LabelClass}>Part Number</label><input type="text" className={InputClass} value={editingDocument.partNumber} onChange={(e) => setEditingDocument({ ...editingDocument, partNumber: e.target.value })} /></div>
              <div><label className={LabelClass}>Issue / Revision Number</label><input type="text" className={InputClass} value={editingDocument.issueNo} onChange={(e) => setEditingDocument({ ...editingDocument, issueNo: e.target.value })} /></div>
              <div><label className={LabelClass}>Description</label><input type="text" className={InputClass} value={editingDocument.description} onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })} /></div>
              <div className="flex items-center gap-6"> <label className="flex items-center gap-2 cursor-pointer"> <input type="checkbox" className="w-4 h-4 accent-green-600" checked={editingDocument.isSopDocument} onChange={(e) => setEditingDocument({ ...editingDocument, isSopDocument: e.target.checked })} /> <span className="text-sm font-semibold text-gray-700">SOP Document</span> </label> </div>
              <div>
                <label className={LabelClass}>Tags</label>
                <div className="flex gap-2"> <input type="text" className={InputClass} value={editTagInput} onChange={(e) => setEditTagInput(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTagToEditing())} /> <button type="button" onClick={addTagToEditing} className="bg-gray-100 px-4 py-2 rounded-lg border">Add</button> </div>
                <div className="flex flex-wrap gap-2 mt-3"> {editingDocument.tags.map((tag, idx) => ( <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5"> {tag} <IconX size={14} className="cursor-pointer" onClick={() => removeTagFromEditing(idx)} /> </span> ))} </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button type="button" onClick={closeEditModal} className="px-5 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button type="button" onClick={handleSaveDocumentEdit} className="px-5 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><IconCheck size={18} /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <MetadataOnlyModal isOpen={showMetadataModal} onClose={() => setShowMetadataModal(false)} onSave={handleAddMetadataDoc} workflowId={workflowId} />
      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}
    </>
  );
}