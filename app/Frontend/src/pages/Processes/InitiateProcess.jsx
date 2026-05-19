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
  DuplicateDocumentForCopy,
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
  IconBuilding,
  IconPaperclip,
  IconLink,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import ViewFile from '../view/View';
import Title from '../../CustomComponents/Title';

const InputClass =
  'w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 text-sm';
const LabelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';
const sanitizeWindowsInput = (val) => val.replace(/[<>:"\/\\|?*]/g, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Section = ({ title, children, badge }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
    <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-5">
      <h3 className="text-lg font-bold text-gray-800 flex-1">{title}</h3>
      {badge != null && (
        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

// ─── Metadata-only modal ──────────────────────────────────────────────────────
const MetadataOnlyModal = ({ isOpen, onClose, onSave }) => {
  const [metaDoc, setMetaDoc] = useState({
    metaFileName: '',
    metaFileExtension: 'pdf',
    partNumber: '',
    issueNo: '',
    description: '',
    tags: [],
    preApproved: false,
    isSopDocument: true,
  });
  const [tagInput, setTagInput] = useState('');

  const handleSave = () => {
    if (!metaDoc.metaFileName.trim()) {
      toast.warning('Please provide a file name for the metadata entry');
      return;
    }
    onSave({ ...metaDoc, isMetadataOnly: true });
    setMetaDoc({
      metaFileName: '',
      metaFileExtension: 'pdf',
      partNumber: '',
      issueNo: '',
      description: '',
      tags: [],
      preApproved: false,
      isSopDocument: true,
    });
    setTagInput('');
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <IconDatabaseImport size={20} className="text-blue-600" />
            Add Metadata Entry (No File)
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full">
            <IconX size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <strong>Note:</strong> This creates a document placeholder with metadata only. Actual files can be uploaded later.
          </div>
          <div>
            <label className={LabelClass}>Intended File Name *</label>
            <input
              type="text"
              className={InputClass}
              value={metaDoc.metaFileName}
              onChange={(e) => setMetaDoc((p) => ({ ...p, metaFileName: sanitizeWindowsInput(e.target.value) }))}
              placeholder="e.g. Quality_Procedure_v1"
            />
          </div>
          <div>
            <label className={LabelClass}>Expected File Extension</label>
            <select
              className={InputClass}
              value={metaDoc.metaFileExtension}
              onChange={(e) => setMetaDoc((p) => ({ ...p, metaFileExtension: e.target.value }))}
            >
              {['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'other'].map((ext) => (
                <option key={ext} value={ext}>{ext.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LabelClass}>Document Number</label>
              <input
                type="text"
                className={InputClass}
                value={metaDoc.partNumber}
                onChange={(e) => setMetaDoc((p) => ({ ...p, partNumber: sanitizeWindowsInput(e.target.value) }))}
                placeholder="e.g. DOC-123"
              />
            </div>
            <div>
              <label className={LabelClass}>Issue / Revision No</label>
              <input
                type="text"
                className={InputClass}
                value={metaDoc.issueNo}
                onChange={(e) => setMetaDoc((p) => ({ ...p, issueNo: e.target.value }))}
                placeholder="e.g. Rev 1.0"
              />
            </div>
          </div>
          <div>
            <label className={LabelClass}>Description</label>
            <input
              type="text"
              className={InputClass}
              value={metaDoc.description}
              onChange={(e) => setMetaDoc((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description"
            />
          </div>
          <div>
            <label className={LabelClass}>Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                className={InputClass}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tagInput.trim()) {
                      setMetaDoc((p) => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
                      setTagInput('');
                    }
                  }
                }}
                placeholder="Add tag and press Enter"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) {
                    setMetaDoc((p) => ({ ...p, tags: [...p.tags, tagInput.trim()] }));
                    setTagInput('');
                  }
                }}
                className="bg-gray-100 px-4 py-2 rounded-lg border"
              >
                Add
              </button>
            </div>
            {metaDoc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {metaDoc.tags.map((tag, i) => (
                  <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5">
                    {tag}
                    <IconX
                      size={14}
                      className="cursor-pointer"
                      onClick={() => setMetaDoc((p) => ({ ...p, tags: p.tags.filter((_, ti) => ti !== i) }))}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={metaDoc.isSopDocument}
                onChange={(e) => setMetaDoc((p) => ({ ...p, isSopDocument: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-700">SOP Document</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={metaDoc.preApproved}
                onChange={(e) => setMetaDoc((p) => ({ ...p, preApproved: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm font-semibold text-gray-700">Pre-Approved</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg text-sm font-medium">Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <IconCheck size={18} /> Add Metadata Entry
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Workflow preview ─────────────────────────────────────────────────────────
const STEP_TYPE_CONFIG = {
  APPROVAL: { color: '#10B981', bg: '#D1FAE5', label: 'Approval', icon: <IconCheck size={14} stroke={3} /> },
  REVIEW: { color: '#F59E0B', bg: '#FEF3C7', label: 'Review', icon: <IconEye size={14} stroke={2.5} /> },
  NOTIFICATION: { color: '#14B8A6', bg: '#CCFBF1', label: 'Notify', icon: <IconAlertCircle size={14} stroke={2.5} /> },
  DEFAULT: { color: '#3B82F6', bg: '#DBEAFE', label: 'Task', icon: <IconTarget size={14} stroke={2.5} /> },
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
          <span
            key={i}
            className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-md font-semibold truncate max-w-[140px] shadow-sm flex items-center gap-1.5"
          >
            <div className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center text-[8px] font-black">
              {String(item.name || item.username || item)[0].toUpperCase()}
            </div>
            {item.name || item.username || String(item)}
          </span>
        ))}
      </div>
      {list.length > limit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full"
        >
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
              <div
                className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm flex items-center justify-center"
                style={{ backgroundColor: cfg.color }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div
                onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                className={`bg-white border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer ${
                  isExpanded ? 'border-blue-300 shadow-md ring-1 ring-blue-500/10' : 'border-gray-200 shadow-sm hover:border-blue-200 hover:bg-gray-50/50'
                }`}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1">{step.stepName || 'Unnamed Step'}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                        {step.allowParallel && <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded uppercase">Parallel</span>}
                        {step.requiresDocument && <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded uppercase">Doc Required</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end">
                      {assigneeCount > 0 && (
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <IconUsers size={14} className="text-gray-400" /> {assigneeCount} Target{assigneeCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {roleCount > 0 && (
                        <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <IconShield size={14} className="text-gray-400" /> {roleCount} Role Rule{roleCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                      {isExpanded ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4">
                    {step.assignments?.length > 0 ? (
                      step.assignments.map((assignment, aIdx) => (
                        <div key={aIdx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-700 uppercase flex items-center gap-1.5">
                              {assignment.assigneeType === 'USER' && <IconUsers size={14} className="text-blue-500" />}
                              {assignment.assigneeType === 'ROLE' && <IconShield size={14} className="text-purple-500" />}
                              {assignment.assigneeType === 'DEPARTMENT' && <IconBuilding size={14} className="text-teal-500" />}
                              {assignment.assigneeType || 'Assignment'}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                              Action: {assignment.actionType}
                            </span>
                          </div>
                          {assignment.assigneeIds?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Specific Assignees ({assignment.assigneeIds.length})
                              </p>
                              <AssigneeBadgeList list={assignment.assigneeIds} />
                            </div>
                          )}
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
                                          <div className="w-1 h-1 rounded-full bg-purple-500" /> {r.name || r}
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

// ─── Local file preview modal ─────────────────────────────────────────────────
const TextPreview = ({ objectUrl }) => {
  const [text, setText] = useState('');
  useEffect(() => {
    fetch(objectUrl).then((r) => r.text()).then(setText);
  }, [objectUrl]);
  return (
    <pre className="w-full max-h-[68vh] overflow-auto bg-white rounded-lg shadow p-4 text-xs text-gray-700 font-mono whitespace-pre-wrap break-all">
      {text || 'Loading…'}
    </pre>
  );
};

const LocalFilePreviewModal = ({ file, onClose }) => {
  const [objectUrl, setObjectUrl] = useState(null);
  const ext = file?.name?.split('.').pop()?.toLowerCase();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isText = ['txt', 'csv', 'json', 'xml', 'md', 'log'].includes(ext);

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <IconEye size={18} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB &bull; {ext?.toUpperCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 p-1.5 rounded-full transition-colors flex-shrink-0 ml-4"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {!objectUrl ? (
            <div className="flex flex-col items-center text-gray-400">
              <IconLoader className="animate-spin mb-2" size={32} />
              <p className="text-sm">Loading preview…</p>
            </div>
          ) : isImage ? (
            <img src={objectUrl} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md" />
          ) : isPdf ? (
            <iframe src={objectUrl} title={file.name} className="w-full rounded-lg shadow-md bg-white" style={{ height: '70vh' }} />
          ) : isText ? (
            <TextPreview objectUrl={objectUrl} />
          ) : (
            <div className="flex flex-col items-center text-center py-12 px-6">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
                <IconFileText size={32} className="text-gray-500" />
              </div>
              <p className="text-gray-700 font-semibold text-lg mb-1">{file.name}</p>
              <p className="text-gray-500 text-sm mb-4">Preview not available for <strong>.{ext}</strong> files.</p>
              <a href={objectUrl} download={file.name} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Edit Document Details modal ──────────────────────────────────────────────
const EditDocumentModal = ({ editingDocument, setEditingDocument, onSave, onClose, onViewEditable, actionsLoading }) => {
  const [editTagInput, setEditTagInput] = useState('');

  if (!editingDocument) return null;

  const addTag = () => {
    if (!editTagInput.trim()) return;
    setEditingDocument((p) => ({ ...p, tags: [...p.tags, editTagInput.trim()] }));
    setEditTagInput('');
  };
  const removeTag = (idx) => setEditingDocument((p) => ({ ...p, tags: p.tags.filter((_, i) => i !== idx) }));

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <IconPencil size={20} className="text-blue-600" />
            Edit Document Details
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full">
            <IconX size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {editingDocument.isMetadataOnly ? (
            <div>
              <label className={LabelClass}>Intended File Name</label>
              <input
                type="text"
                className={InputClass}
                value={editingDocument.metaFileName || ''}
                onChange={(e) => setEditingDocument((p) => ({ ...p, metaFileName: sanitizeWindowsInput(e.target.value) }))}
              />
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">File Name</p>
              <p className="text-sm font-semibold text-gray-800 break-all">{editingDocument.name}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LabelClass}>Document Number / Part No</label>
              <input
                type="text"
                className={InputClass}
                value={editingDocument.partNumber || ''}
                onChange={(e) => setEditingDocument((p) => ({ ...p, partNumber: sanitizeWindowsInput(e.target.value) }))}
                placeholder="e.g. DOC-123"
              />
            </div>
            <div>
              <label className={LabelClass}>Issue / Revision Number</label>
              <input
                type="text"
                className={InputClass}
                value={editingDocument.issueNo || ''}
                onChange={(e) => setEditingDocument((p) => ({ ...p, issueNo: e.target.value }))}
                placeholder="e.g. Rev 1.0"
              />
            </div>
          </div>

          <div>
            <label className={LabelClass}>Description</label>
            <input
              type="text"
              className={InputClass}
              value={editingDocument.description || ''}
              onChange={(e) => setEditingDocument((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this document"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 accent-green-600 cursor-pointer"
                checked={editingDocument.isSopDocument !== false}
                onChange={(e) => setEditingDocument((p) => ({ ...p, isSopDocument: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-700">SOP Document</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 accent-purple-600 cursor-pointer"
                checked={!!editingDocument.preApproved}
                onChange={(e) => setEditingDocument((p) => ({ ...p, preApproved: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-700">Pre-Approved</span>
            </label>
          </div>

          <div>
            <label className={LabelClass}>Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                className={InputClass}
                value={editTagInput}
                onChange={(e) => setEditTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Type a tag and press Enter or click Add"
              />
              <button type="button" onClick={addTag} className="bg-gray-100 px-4 py-2 rounded-lg border hover:bg-gray-200 transition-colors">
                Add
              </button>
            </div>
            {editingDocument.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {editingDocument.tags.map((tag, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5">
                    {tag}
                    <IconX size={14} className="cursor-pointer hover:text-red-500" onClick={() => removeTag(idx)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {editingDocument.editableDocumentId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <IconLink size={18} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-blue-900">Editable Reference Attached</p>
                    <p className="text-xs text-blue-700 font-medium break-all">
                      {editingDocument.editableDocumentName || `Doc ID: ${editingDocument.editableDocumentId}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionsLoading}
                  onClick={() => onViewEditable(editingDocument)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors"
                >
                  <IconEye size={15} /> View Reference
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <IconCheck size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function InitiateProcess() {
  const navigate = useNavigate();
  const { draftId } = useParams();
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [workflowData, setWorkflowData] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDetails, setFileDetails] = useState({
    tags: [],
    partNumber: '',
    preApproved: false,
    fileDescription: '',
    issueNo: '',
    name: '',
    isSopDocument: true,
    editableRefFile: null,
  });
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef(null);
  const refInputRef = useRef(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [fileView, setFileView] = useState(null);
  const [localPreviewFile, setLocalPreviewFile] = useState(null);

  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [processList, setProcessList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyingDocs, setCopyingDocs] = useState(false);
  const [copyProgress, setCopyProgress] = useState({ current: 0, total: 0 });

  const [editingDocument, setEditingDocument] = useState(null);

  const defaultValues = { workflowId: '', description: '', documents: [], issueNo: '' };
  const { control, handleSubmit, register, setValue, watch, reset, formState: { errors } } = useForm({ defaultValues });
  const [workflowId] = watch(['workflowId']);
  const { fields: documentFields, append: addDocument, remove: removeDocument, update: updateDocument } = useFieldArray({ control, name: 'documents' });
  const watchedDocuments = watch('documents');

  useEffect(() => {
    const locked = showCopyModal || !!editingDocument || copyingDocs || !!fileView || showMetadataModal || !!localPreviewFile;
    document.body.style.overflow = locked ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [showCopyModal, editingDocument, copyingDocs, fileView, showMetadataModal, localPreviewFile]);

  useEffect(() => {
    const handler = (e) => {
      if (actionsLoading || copyingDocs) {
        e.preventDefault();
        e.returnValue = 'Process is running. Do not close the tab or data may be lost.';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [actionsLoading, copyingDocs]);

  useEffect(() => {
    if (draftId) loadDraftForEdit(draftId);
  }, [draftId]);

  const loadDraftForEdit = async (id) => {
    setActionsLoading(true);
    try {
      const response = await GetDraftForEditing(id);
      const { type, draftId: fetchedDraftId, formData } = response.data;
      if (type !== 'INITIATE') {
        toast.error('This is not an initiation draft');
        navigate('/processes/initiate');
        return;
      }
      reset({
        workflowId: formData.workflowId,
        description: formData.description,
        issueNo: formData.issueNo,
        documents: formData.documents.map((doc) => ({
          documentId: doc.documentId,
          name: doc.name,
          tags: doc.tags || [],
          partNumber: doc.partNumber,
          description: doc.description,
          issueNo: doc.issueNo,
          preApproved: doc.preApproved,
          documentPath: doc.documentPath,
          isSopDocument: doc.isSopDocument !== false,
          isMetadataOnly: doc.isMetadataOnly || false,
          metaFileName: doc.metaFileName || '',
          metaFileExtension: doc.metaFileExtension || '',
          editableDocumentId: doc.editableDocumentId || null,
          editableDocumentName: doc.editableDocumentName || null,
        })),
      });
      setCurrentDraftId(fetchedDraftId);
      setIsEditMode(true);
      if (formData.workflowId) {
        const allWorkflows = await GetWorkflows();
        const workflows = allWorkflows.data.workflows || [];
        const workflowMatch = workflows.find((wf) => wf.versions?.some((ver) => ver.id === formData.workflowId));
        if (workflowMatch) setSelectedWorkflow(workflowMatch);
      }
      toast.success('Draft loaded successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
      navigate('/processes/initiate');
    } finally {
      setActionsLoading(false);
    }
  };

  useEffect(() => {
    const getWorkflowsData = async () => {
      try {
        const response = await GetWorkflows();
        setWorkflowData(response?.data?.workflows || []);
      } catch (error) {
        console.log(error);
      }
    };
    getWorkflowsData();
  }, []);

  const isNameDuplicate = (name) =>
    watchedDocuments.some((d) => d.name === name) || pendingFiles.some((d) => d.name === name);

  const handleDeleteDocument = async (index, id, isMetadataOnly) => {
    setActionsLoading(true);
    try {
      if (!isMetadataOnly) await DeleteFile(id);
      toast.success('Document removed');
      removeDocument(index);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);
  const handleRefFileChange = (e) => setFileDetails((p) => ({ ...p, editableRefFile: e.target.files[0] }));

  const handleUpload = async () => {
    if (!workflowId) { toast.info('Please select workflow.'); return; }
    if (!selectedFile) return;
    setActionsLoading(true);
    try {
      const ext = selectedFile.name.split('.').pop();
      let mainFileName = sanitizeWindowsInput(fileDetails.name);

      if (!fileDetails.preApproved) {
        const nameRes = await GenerateDocumentName(workflowId, null, ext);
        mainFileName = nameRes?.data?.documentName;
      } else {
        mainFileName = mainFileName.includes('.') ? mainFileName : `${mainFileName}.${ext}`;
      }

      if (isNameDuplicate(mainFileName)) {
        toast.error(`Document with name "${mainFileName}" already exists. Names must be unique.`);
        return;
      }

      const res = await uploadDocumentInProcess([selectedFile], mainFileName, fileDetails?.tags);
      const mainDocId = res[0];

      let editableDocId = null;
      let editableDocName = null;
      if (fileDetails.isSopDocument && fileDetails.editableRefFile) {
        const refExt = fileDetails.editableRefFile.name.split('.').pop();
        const baseName = mainFileName.substring(0, mainFileName.lastIndexOf('.'));
        const refName = `${baseName}_reference.${refExt}`;
        const refUploadRes = await uploadDocumentInProcess([fileDetails.editableRefFile], refName, []);
        editableDocId = refUploadRes[0];
        editableDocName = refName;
      }

      toast.success('File uploaded successfully');
      addDocument({
        documentId: mainDocId,
        name: mainFileName,
        tags: fileDetails.tags,
        description: fileDetails.fileDescription,
        partNumber: fileDetails.partNumber,
        preApproved: fileDetails.preApproved,
        issueNo: fileDetails.issueNo,
        isSopDocument: fileDetails.isSopDocument,
        isMetadataOnly: false,
        editableDocumentId: editableDocId,
        editableDocumentName: editableDocName,
      }, { shouldFocus: false });

      setFileDetails({ tags: [], partNumber: '', preApproved: false, fileDescription: '', issueNo: '', name: '', isSopDocument: true, editableRefFile: null });
      setNewTag('');
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = null;
      if (refInputRef.current) refInputRef.current.value = null;
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleMultipleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPending = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
      partNumber: '',
      issueNo: '',
      description: '',
      tags: [],
      tagInput: '',
      isSopDocument: true,
      preApproved: false,
      editableRefFile: null,
      isCopyPending: false,
      originalExt: file.name.split('.').pop(),
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
    e.target.value = null;
  };

  const removePendingFile = (id) => setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  const updatePendingFile = (id, field, value) =>
    setPendingFiles((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const handleUploadAllPending = async () => {
    if (!workflowId) return toast.warning('Please select a workflow first.');
    if (pendingFiles.length === 0) return;
    setActionsLoading(true);
    let successCount = 0;
    let failedIds = [];
    try {
      for (let pending of pendingFiles) {
        if (pending.isCopyPending) {
          let mainFileName = sanitizeWindowsInput(pending.name);
          if (!mainFileName) {
            toast.error('Custom name is required for pre-approved copied document.');
            failedIds.push(pending.id);
            continue;
          }
          const ext = pending.originalExt || '';
          mainFileName = mainFileName.includes('.') ? mainFileName : ext ? `${mainFileName}.${ext}` : mainFileName;
          if (isNameDuplicate(mainFileName)) {
            toast.error(`Name "${mainFileName}" already exists. Change the name to proceed.`);
            failedIds.push(pending.id);
            continue;
          }
          const res = await DuplicateDocumentForCopy({
            sourceProcessId: pending.sourceProcessId,
            sourceDocumentId: pending.sourceDocumentId,
            targetWorkflowId: workflowId,
            customName: mainFileName,
            sourceEditableDocumentId: pending.sourceEditableDocumentId || null,
          });
          addDocument({
            documentId: res.data.documentId,
            name: res.data.name,
            tags: pending.tags,
            description: pending.description,
            partNumber: pending.partNumber,
            preApproved: pending.preApproved,
            issueNo: pending.issueNo,
            isSopDocument: pending.isSopDocument,
            isMetadataOnly: false,
            editableDocumentId: res.data.editableDocumentId || null,
            editableDocumentName: pending.sourceEditableDocumentName || null,
          });
          successCount++;
        } else {
          const ext = pending.file.name.split('.').pop();
          let mainFileName = sanitizeWindowsInput(pending.name);

          if (!pending.preApproved) {
            const nameRes = await GenerateDocumentName(workflowId, null, ext);
            mainFileName = nameRes?.data?.documentName;
          } else {
            mainFileName = mainFileName.includes('.') ? mainFileName : `${mainFileName}.${ext}`;
          }

          if (isNameDuplicate(mainFileName)) {
            toast.error(`Name "${mainFileName}" already exists. Name must be unique.`);
            failedIds.push(pending.id);
            continue;
          }

          const uploadRes = await uploadDocumentInProcess([pending.file], mainFileName, pending.tags);
          const mainDocId = uploadRes[0];
          let editableDocId = null;
          let editableDocName = null;
          if (pending.isSopDocument && pending.editableRefFile) {
            const refExt = pending.editableRefFile.name.split('.').pop();
            const baseName = mainFileName.substring(0, mainFileName.lastIndexOf('.'));
            const refName = `${baseName}_reference.${refExt}`;
            const refUploadRes = await uploadDocumentInProcess([pending.editableRefFile], refName, []);
            editableDocId = refUploadRes[0];
            editableDocName = refName;
          }

          addDocument({
            documentId: mainDocId,
            name: mainFileName,
            tags: pending.tags,
            description: pending.description,
            partNumber: pending.partNumber,
            preApproved: pending.preApproved,
            issueNo: pending.issueNo,
            isSopDocument: pending.isSopDocument,
            isMetadataOnly: false,
            editableDocumentId: editableDocId,
            editableDocumentName: editableDocName,
          });
          successCount++;
        }
      }

      toast.success(`${successCount} file(s) processed successfully.`);
      if (failedIds.length > 0) {
        setPendingFiles((prev) => prev.filter((p) => failedIds.includes(p.id)));
      } else {
        setPendingFiles([]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleAddMetadataDoc = (metaDocData) => {
    addDocument({
      documentId: `meta_${Date.now()}`,
      name: `${metaDocData.metaFileName}.${metaDocData.metaFileExtension}`,
      tags: metaDocData.tags,
      description: metaDocData.description,
      partNumber: metaDocData.partNumber,
      preApproved: metaDocData.preApproved,
      issueNo: metaDocData.issueNo,
      isSopDocument: metaDocData.isSopDocument,
      isMetadataOnly: true,
      metaFileName: metaDocData.metaFileName,
      metaFileExtension: metaDocData.metaFileExtension,
      editableDocumentId: null,
      editableDocumentName: null,
    }, { shouldFocus: false });
    toast.success('Metadata entry added');
  };

  const fetchProcessesForCopy = async () => {
    try {
      const res = await GetProcessesForCopy();
      setProcessList(res.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const handleSelectProcess = async (process) => {
    setShowCopyModal(false);
    setCopyingDocs(true);
    try {
      const detailsRes = await GetProcessCopyDetails(process.id);
      const { description, issueNo, documents } = detailsRes.data;
      setCopyProgress({ current: 0, total: documents.length });

      const currentDesc = watch('description');
      const currentIssueNo = watch('issueNo');
      if (!currentDesc && description) setValue('description', description);
      if (!currentIssueNo && issueNo) setValue('issueNo', issueNo || '');

      let hasPreApproved = false;

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        setCopyProgress((prev) => ({ ...prev, current: i + 1 }));

        if (doc.preApproved) {
          hasPreApproved = true;
          const originalExt = doc.name?.split('.').pop() || '';
          setPendingFiles((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              isCopyPending: true,
              sourceProcessId: process.id,
              sourceDocumentId: doc.documentId,
              sourceEditableDocumentId: doc.editableDocumentId || null,
              sourceEditableDocumentName: doc.editableDocumentName || null,
              name: doc.name?.substring(0, doc.name.lastIndexOf('.')) || doc.name,
              originalExt,
              partNumber: doc.partNumber || '',
              issueNo: doc.issueNo || '',
              description: doc.description || '',
              tags: doc.tags || [],
              tagInput: '',
              isSopDocument: doc.isSopDocument !== false,
              preApproved: true,
              editableRefFile: null,
            },
          ]);
        } else {
          try {
            const res = await DuplicateDocumentForCopy({
              sourceProcessId: process.id,
              sourceDocumentId: doc.documentId,
              targetWorkflowId: workflowId,
              sourceEditableDocumentId: doc.editableDocumentId || null,
            });
            addDocument({
              documentId: res.data.documentId,
              name: res.data.name,
              tags: doc.tags || [],
              description: doc.description || '',
              partNumber: doc.partNumber || '',
              preApproved: doc.preApproved,
              issueNo: doc.issueNo || '',
              isSopDocument: doc.isSopDocument !== false,
              isMetadataOnly: doc.isMetadataOnly || false,
              metaFileName: doc.metaFileName || null,
              metaFileExtension: doc.metaFileExtension || null,
              editableDocumentId: res.data.editableDocumentId || null,
              editableDocumentName: doc.editableDocumentName || null,
            }, { shouldFocus: false });
          } catch (err) {
            console.error(`Failed to duplicate ${doc.name}`, err);
            toast.error(`Failed to copy ${doc.name}`);
          }
        }
      }
      toast.success(
        `Documents processed.${hasPreApproved ? ' Pre-Approved docs staged — please set custom names then click "Upload & Add All".' : ''}`
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setCopyingDocs(false);
      setCopyProgress({ current: 0, total: 0 });
    }
  };

  const handleSaveDraft = async (data) => {
    setActionsLoading(true);
    try {
      const payload = { ...data, saveAsDraft: true, draftId: currentDraftId, type: 'INITIATE' };
      const res = await SaveOrUpdateDraft(payload);
      toast.success(res?.data?.message || 'Draft saved successfully');
      setCurrentDraftId(res?.data?.draftId);
      setIsEditMode(true);
      navigate('/processes/drafted');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleSubmitImmediately = async (data) => {
    if (data?.documents?.length === 0) { toast.info('Please upload at least one document.'); return; }
    setActionsLoading(true);
    try {
      const res = await ProcessInitiate(data);
      if (currentDraftId) await deleteDraft({ draftId: currentDraftId });
      toast.success(res?.data?.message || 'Process initiated successfully');
      navigate('/processes/work');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleUseTemplate = async (template) => {
    setActionsLoading(true);
    try {
      const res = await useTemplateDocument({ workflowId, templateId: template?.id });
      toast.success(res?.data?.message);
      addDocument({
        documentId: res?.data?.documentId,
        name: res?.data?.documentName,
        tags: [],
        documentPath: res?.data?.documentPath,
        isSopDocument: true,
        isMetadataOnly: false,
        editableDocumentId: null,
        editableDocumentName: null,
      }, { shouldFocus: false });
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleViewFile = async (name, path, fileId, type, editing) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId, editing);
      setFileView(fileData);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleViewEditableReference = async (doc) => {
    if (!doc.editableDocumentId) return;
    const editableName = doc.editableDocumentName || `Editable Reference (ID: ${doc.editableDocumentId})`;
    const ext = editableName.split('.').pop();
    await handleViewFile(editableName, '/check', doc.editableDocumentId, ext, false);
  };

  const openEditModal = (doc, index) => {
    setEditingDocument({
      index,
      documentId: doc.documentId,
      name: doc.name || '',
      partNumber: doc.partNumber || '',
      issueNo: doc.issueNo || '',
      description: doc.description || '',
      tags: doc.tags || [],
      isSopDocument: doc.isSopDocument !== false,
      preApproved: !!doc.preApproved,
      isMetadataOnly: doc.isMetadataOnly || false,
      metaFileName: doc.metaFileName || '',
      metaFileExtension: doc.metaFileExtension || '',
      editableDocumentId: doc.editableDocumentId || null,
      editableDocumentName: doc.editableDocumentName || null,
    });
  };

  const closeEditModal = () => setEditingDocument(null);

  const handleSaveDocumentEdit = () => {
    if (!editingDocument) return;
    const { index, partNumber, issueNo, description, tags, isSopDocument, preApproved, isMetadataOnly, metaFileName, metaFileExtension, editableDocumentId, editableDocumentName } = editingDocument;
    updateDocument(index, {
      ...documentFields[index],
      partNumber,
      issueNo,
      description,
      tags,
      isSopDocument,
      preApproved,
      isMetadataOnly,
      metaFileName,
      metaFileExtension,
      editableDocumentId,
      editableDocumentName,
    });
    closeEditModal();
    toast.success('Document details updated');
  };

  const sopDocs = documentFields.filter((_, i) => watchedDocuments[i]?.isSopDocument !== false);
  const nonSopDocs = documentFields.filter((_, i) => watchedDocuments[i]?.isSopDocument === false);

  const renderDocumentItem = (doc, index, currentDocState) => (
    <li
      key={doc.id}
      className={`flex flex-col p-4 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
        currentDocState.isMetadataOnly ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={`w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0 mt-1 ${
              currentDocState.isMetadataOnly
                ? 'bg-amber-100 border border-amber-200 text-amber-600'
                : 'bg-blue-50 border border-blue-100 text-blue-600'
            }`}
          >
            {currentDocState.isMetadataOnly ? <IconDatabaseImport size={20} /> : <IconFileText size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 break-words line-clamp-2" title={currentDocState.name}>
                {currentDocState.name || 'Unnamed Document'}
              </p>
              {currentDocState.isMetadataOnly && (
                <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Metadata Only</span>
              )}
              {currentDocState.preApproved && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Pre-Approved</span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  currentDocState.isSopDocument !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {currentDocState.isSopDocument !== false ? 'SOP' : 'NON-SOP'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
              {currentDocState.partNumber && (
                <span>Part: <span className="font-medium">{currentDocState.partNumber}</span></span>
              )}
              {currentDocState.issueNo && (
                <span>Issue: <span className="font-medium">{currentDocState.issueNo}</span></span>
              )}
            </div>
            {currentDocState.description && (
              <p className="text-xs text-gray-500 mt-1 truncate max-w-md">{currentDocState.description}</p>
            )}
            {currentDocState.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {currentDocState.tags.map((t) => (
                  <span key={t} className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {currentDocState.editableDocumentId && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] bg-blue-100 text-blue-800 px-2 py-1 rounded-md inline-flex w-fit font-semibold">
                <IconPaperclip size={12} /> Editable Reference Attached
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 flex-wrap">
          <button
            type="button"
            disabled={actionsLoading}
            onClick={() => openEditModal(currentDocState, index)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
          >
            <IconEdit size={16} /> Edit
          </button>
          {!currentDocState.isMetadataOnly && (
            <button
              type="button"
              disabled={actionsLoading}
              onClick={() => handleViewFile(doc.name, doc.documentPath || '/check', doc.documentId, doc.name?.split('.').pop(), true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <IconEye size={16} /> View
            </button>
          )}
          {!currentDocState.isMetadataOnly && currentDocState.editableDocumentId && (
            <button
              type="button"
              disabled={actionsLoading}
              onClick={() => handleViewFile(
                currentDocState.editableDocumentName || 'Reference',
                '/check',
                currentDocState.editableDocumentId,
                (currentDocState.editableDocumentName || '').split('.').pop(),
                false
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
            >
              <IconLink size={16} /> Ref
            </button>
          )}
          <button
            type="button"
            disabled={actionsLoading}
            onClick={() => handleDeleteDocument(index, doc.documentId, doc.isMetadataOnly)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            <IconTrash size={16} /> Remove
          </button>
        </div>
      </div>
    </li>
  );

  return (
    <>
      {actionsLoading && (
        <div className="fixed inset-0 z-[10000] bg-white/70 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <TopLoader />
          <p className="mt-8 text-sm font-bold text-gray-700 bg-white px-6 py-3 rounded-full shadow-lg border border-gray-200">
            Processing request. Please <span className="text-red-600">DO NOT</span> close or refresh this tab.
          </p>
        </div>
      )}

      {copyingDocs && (
        <div className="fixed inset-0 z-[10000] bg-white/70 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center max-w-sm w-full mx-4">
            <div className="relative mb-6">
              <IconLoader className="animate-spin text-blue-600" size={48} stroke={1.5} />
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-700">
                {copyProgress.total > 0 ? Math.round((copyProgress.current / copyProgress.total) * 100) : 0}%
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Duplicating Documents</h3>
            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">Transferring files. Please do not close this window.</p>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${copyProgress.total > 0 ? (copyProgress.current / copyProgress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between w-full px-1">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Syncing</span>
              <span className="text-xs font-bold text-gray-400">{copyProgress.current} of {copyProgress.total}</span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <Title text={isEditMode ? 'Edit Draft' : 'Initiate Process'} className="text-2xl font-bold text-gray-900" />
          <div className="flex flex-wrap gap-3">
            <CustomButton
              type="button"
              text="Save as Draft"
              variant="secondary"
              click={handleSubmit((data) => handleSaveDraft(data))}
              disabled={actionsLoading || documentFields.length === 0}
              className="px-4 py-2 rounded-lg"
            />
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <Section title="Process Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div>
                <label className={LabelClass}>Description</label>
                <input
                  {...register('description', { required: 'Description is required' })}
                  className={InputClass}
                  placeholder="Enter process description"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.description.message}</p>}
              </div>
              <div>
                <label className={LabelClass}>SOP Issue / Revision Number</label>
                <input {...register('issueNo')} className={InputClass} placeholder="Enter issue/revision number" />
              </div>
              <div>
                <label className={LabelClass}>Select Workflow</label>
                <select
                  className={InputClass}
                  onChange={(e) => {
                    const selected = workflowData.find((wf) => wf.name === e.target.value);
                    setSelectedWorkflow(selected);
                    setValue('workflowId', '');
                  }}
                  value={selectedWorkflow?.name || ''}
                >
                  <option value="">-- Choose a Workflow --</option>
                  {Array.from(new Map((workflowData || []).map((item) => [item.name, item])).values()).map((wf, idx) => (
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
                    const uniqueVersions = selectedWorkflow?.versions
                      ? Array.from(new Map(selectedWorkflow.versions.map((v) => [v.id, v])).values())
                      : [];
                    return (
                      <select {...field} className={InputClass} disabled={!selectedWorkflow}>
                        <option value="">-- Choose a Version --</option>
                        {uniqueVersions.map((ver, idx) => (
                          <option key={ver.id || `ver-${idx}`} value={ver.id}>
                            Version {ver.version}{ver.description ? ` - ${ver.description}` : ''}
                          </option>
                        ))}
                      </select>
                    );
                  }}
                />
                {errors.workflowId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.workflowId.message}</p>}

                <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">Want to reuse documents?</p>
                  <button
                    type="button"
                    disabled={!workflowId || copyingDocs}
                    onClick={() => { if (!workflowId) return; setShowCopyModal(true); fetchProcessesForCopy(); }}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 border border-indigo-200"
                  >
                    <IconCopy size={18} /> Copy from existing process
                  </button>
                </div>
              </div>
            </div>

            {workflowId && (
              <div className="mt-6 border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <IconSitemap size={18} className="text-blue-600" />
                    Workflow Steps & Assignments
                  </p>
                  <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-full">
                    Version {selectedWorkflow?.versions?.find((item) => item.id === workflowId)?.version}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Click on any step below to inspect its detailed assignment logic.</p>
                <DetailedWorkflowPreview steps={selectedWorkflow?.versions?.find((item) => item.id === workflowId)?.steps} />
              </div>
            )}
          </Section>

          <Section title="Upload New Document (Single File)">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 flex flex-col">
                <label className={LabelClass}>Choose File</label>
                <div
                  className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors ${
                    selectedFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <input type="file" ref={inputRef} className="hidden" onChange={handleFileChange} />
                  {!selectedFile ? (
                    <div className="text-center cursor-pointer" onClick={() => inputRef.current?.click()}>
                      <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <IconCloudUpload className="text-blue-500" size={24} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Click to browse</p>
                    </div>
                  ) : (
                    <div className="text-center w-full min-w-0">
                      <IconFileText className="mx-auto text-blue-600 mb-2" size={32} />
                      <span className="text-gray-800 font-semibold text-sm truncate block px-2 break-all">{selectedFile.name}</span>
                      <div className="flex items-center justify-center gap-3 mt-3">
                        <button
                          type="button"
                          className="text-blue-600 text-xs font-semibold flex items-center gap-1"
                          onClick={() => setLocalPreviewFile(selectedFile)}
                        >
                          <IconEye size={14} /> Preview
                        </button>
                        <button
                          type="button"
                          className="text-red-500 text-xs font-semibold flex items-center gap-1"
                          onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = null; }}
                        >
                          <IconTrash size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-center">
                  <span className="text-xs text-gray-400 font-medium">— or —</span>
                  <button
                    type="button"
                    disabled={!workflowId}
                    onClick={() => setShowMetadataModal(true)}
                    className="mt-2 w-full flex justify-center items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <IconDatabaseImport size={16} /> Add Metadata Entry Only
                  </button>
                </div>
              </div>

              <div className="w-full md:w-2/3 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={LabelClass}>Document Number</label>
                    <input
                      value={fileDetails.partNumber}
                      onChange={(e) => setFileDetails((p) => ({ ...p, partNumber: sanitizeWindowsInput(e.target.value) }))}
                      className={InputClass}
                      placeholder="e.g. DOC-123"
                    />
                  </div>
                  <div>
                    <label className={LabelClass}>Issue / Revision Number</label>
                    <input
                      value={fileDetails.issueNo}
                      onChange={(e) => setFileDetails((p) => ({ ...p, issueNo: e.target.value }))}
                      className={InputClass}
                      placeholder="e.g. Rev 1.0"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LabelClass}>Document Description</label>
                    <input
                      value={fileDetails.fileDescription}
                      onChange={(e) => setFileDetails((p) => ({ ...p, fileDescription: e.target.value }))}
                      className={InputClass}
                      placeholder="Brief description of this document"
                    />
                  </div>
                  {fileDetails.preApproved && (
                    <div className="sm:col-span-2">
                      <label className={LabelClass}>Custom Document Name</label>
                      <input
                        value={fileDetails.name}
                        onChange={(e) => setFileDetails((p) => ({ ...p, name: sanitizeWindowsInput(e.target.value) }))}
                        className={InputClass}
                        placeholder="Enter preferred name (extension added automatically)"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className={LabelClass}>Tags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={InputClass}
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTag.trim()) { setFileDetails((p) => ({ ...p, tags: [...p.tags, newTag.trim()] })); setNewTag(''); }
                        }
                      }}
                      placeholder="Type a tag and press Enter or Add"
                    />
                    <button
                      type="button"
                      onClick={() => { if (newTag.trim()) { setFileDetails((p) => ({ ...p, tags: [...p.tags, newTag.trim()] })); setNewTag(''); } }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg border border-gray-300 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {fileDetails.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {fileDetails.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5">
                          {tag}
                          <IconX
                            size={14}
                            className="cursor-pointer hover:text-red-500"
                            onClick={() => setFileDetails((p) => ({ ...p, tags: p.tags.filter((_, i) => i !== index) }))}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 flex-wrap mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fileDetails.isSopDocument}
                      onChange={(e) => setFileDetails((p) => ({ ...p, isSopDocument: e.target.checked }))}
                      className="w-5 h-5 accent-green-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-700">SOP Document</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fileDetails.preApproved}
                      onChange={(e) => setFileDetails((p) => ({ ...p, preApproved: e.target.checked }))}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-700">Mark as Pre-Approved</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || actionsLoading}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <IconCloudUpload size={18} /> Upload
                  </button>
                </div>

                {fileDetails.isSopDocument && (
                  <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-lg">
                    <label className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <IconPaperclip size={16} /> Attach Editable Reference (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input type="file" ref={refInputRef} onChange={handleRefFileChange} className="text-sm flex-1" />
                      {fileDetails.editableRefFile && (
                        <button
                          type="button"
                          onClick={() => { setFileDetails((p) => ({ ...p, editableRefFile: null })); if (refInputRef.current) refInputRef.current.value = null; }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <IconX size={18} />
                        </button>
                      )}
                    </div>
                    {fileDetails.editableRefFile && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-blue-700 font-medium">{fileDetails.editableRefFile.name}</span>
                        <button
                          type="button"
                          className="text-xs text-blue-600 underline flex items-center gap-1"
                          onClick={() => setLocalPreviewFile(fileDetails.editableRefFile)}
                        >
                          <IconEye size={12} /> Preview
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Staging Area" badge={pendingFiles.length > 0 ? `${pendingFiles.length} file(s) staged` : undefined}>
            <div className="flex flex-col gap-4">
              <div className="flex justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-100 transition-colors">
                <input type="file" multiple id="multi-upload" className="hidden" onChange={handleMultipleFileChange} />
                <label htmlFor="multi-upload" className="cursor-pointer text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                    <IconFolderPlus className="text-blue-500" size={24} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Click to bulk select multiple files</span>
                  <span className="text-xs text-gray-400 mt-1">You can preview each file before uploading</span>
                </label>
              </div>

              {pendingFiles.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mt-2 shadow-sm">
                  <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b border-gray-200">
                    <h4 className="font-bold text-gray-800 text-sm">
                      Staged Files <span className="ml-1 text-blue-600">({pendingFiles.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleUploadAllPending}
                      disabled={actionsLoading}
                      className="bg-blue-600 disabled:bg-blue-300 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                    >
                      Upload &amp; Add All
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {pendingFiles.map((pf) => (
                      <div key={pf.id} className={`p-4 ${pf.isCopyPending ? 'bg-purple-50' : 'bg-white'} grid grid-cols-1 md:grid-cols-12 gap-4`}>
                        <div className="md:col-span-3 flex flex-col gap-2 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              {pf.isCopyPending ? (
                                <span className="font-semibold text-xs text-purple-700 break-all line-clamp-2">
                                  📋 {pf.name}{pf.originalExt ? `.${pf.originalExt}` : ''}
                                </span>
                              ) : (
                                <span className="font-semibold text-xs text-gray-800 break-all line-clamp-2 flex items-center gap-1">
                                  <IconFileText size={12} className="text-blue-400 shrink-0" />
                                  {pf.file?.name}
                                </span>
                              )}
                            </div>
                            <button type="button" onClick={() => removePendingFile(pf.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0 mt-0.5">
                              <IconX size={16} />
                            </button>
                          </div>

                          <div className="flex flex-col gap-1">
                            {!pf.isCopyPending && pf.file && (
                              <button
                                type="button"
                                onClick={() => setLocalPreviewFile(pf.file)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors w-full justify-center"
                              >
                                <IconEye size={14} /> Preview File
                              </button>
                            )}
                            {pf.isCopyPending && (
                              <button
                                type="button"
                                onClick={async () => await handleViewFile(pf.name, '/check', pf.sourceDocumentId, pf.originalExt, false)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors w-full justify-center"
                              >
                                <IconEye size={14} /> View Original
                              </button>
                            )}
                          </div>

                          {(pf.editableRefFile || (pf.isCopyPending && pf.sourceEditableDocumentId)) && (
                            <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <span className="text-[10px] uppercase font-bold text-blue-800 mb-1 block flex items-center gap-1">
                                <IconPaperclip size={10} /> Editable Ref
                              </span>
                              {pf.editableRefFile ? (
                                <button
                                  type="button"
                                  onClick={() => setLocalPreviewFile(pf.editableRefFile)}
                                  className="w-full text-[10px] text-blue-700 hover:text-blue-900 underline flex items-center justify-center gap-1"
                                >
                                  <IconEye size={10} /> Preview Local Ref
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => await handleViewFile(pf.sourceEditableDocumentName || 'Ref', '/check', pf.sourceEditableDocumentId, (pf.sourceEditableDocumentName || '').split('.').pop(), false)}
                                  className="w-full text-[10px] text-blue-700 hover:text-blue-900 underline flex items-center justify-center gap-1"
                                >
                                  <IconEye size={10} /> View Ref
                                </button>
                              )}
                            </div>
                          )}

                          {!pf.isCopyPending && (
                            <>
                              <label className="flex items-center gap-2 cursor-pointer mt-1">
                                <input
                                  type="checkbox"
                                  checked={pf.isSopDocument}
                                  onChange={(e) => updatePendingFile(pf.id, 'isSopDocument', e.target.checked)}
                                  className="accent-green-600 w-4 h-4"
                                />
                                <span className="text-xs font-bold text-gray-700">SOP</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={pf.preApproved}
                                  onChange={(e) => updatePendingFile(pf.id, 'preApproved', e.target.checked)}
                                  className="accent-purple-600 w-4 h-4"
                                />
                                <span className="text-xs font-bold text-gray-700">Pre-Approve</span>
                              </label>
                            </>
                          )}
                        </div>

                        <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-3 gap-3">
                          {pf.preApproved && (
                            <div className="col-span-2 md:col-span-3">
                              <label className={`${LabelClass} text-purple-700`}>
                                Custom Name <span className="text-red-500">*</span>
                                {pf.originalExt && <span className="ml-1 text-gray-400 font-normal">(will be saved as .{pf.originalExt})</span>}
                              </label>
                              <input
                                className={`${InputClass} !border-purple-300 focus:!ring-purple-400`}
                                value={pf.name}
                                onChange={(e) => updatePendingFile(pf.id, 'name', sanitizeWindowsInput(e.target.value))}
                                placeholder="Enter custom document name"
                              />
                            </div>
                          )}
                          <div>
                            <label className={LabelClass}>Part No</label>
                            <input
                              className={InputClass}
                              value={pf.partNumber}
                              onChange={(e) => updatePendingFile(pf.id, 'partNumber', sanitizeWindowsInput(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className={LabelClass}>Issue No</label>
                            <input
                              className={InputClass}
                              value={pf.issueNo}
                              onChange={(e) => updatePendingFile(pf.id, 'issueNo', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className={LabelClass}>Description</label>
                            <input
                              className={InputClass}
                              value={pf.description}
                              onChange={(e) => updatePendingFile(pf.id, 'description', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2 md:col-span-3 flex gap-2 items-start flex-wrap">
                            <input
                              className={`${InputClass} flex-1 min-w-0`}
                              placeholder="Add Tag + Enter"
                              value={pf.tagInput}
                              onChange={(e) => updatePendingFile(pf.id, 'tagInput', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (pf.tagInput.trim()) {
                                    updatePendingFile(pf.id, 'tags', [...pf.tags, pf.tagInput.trim()]);
                                    updatePendingFile(pf.id, 'tagInput', '');
                                  }
                                }
                              }}
                            />
                            <div className="flex flex-wrap gap-1 flex-1 items-center">
                              {pf.tags.map((t) => (
                                <span key={t} className="bg-gray-100 border text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                  {t}
                                  <IconX
                                    size={12}
                                    className="cursor-pointer hover:text-red-500"
                                    onClick={() => updatePendingFile(pf.id, 'tags', pf.tags.filter((xt) => xt !== t))}
                                  />
                                </span>
                              ))}
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

          <Section title="SOP Documents" badge={sopDocs.length}>
            {sopDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-green-50 rounded-xl border border-dashed border-green-300">
                <p className="text-green-600 text-sm font-medium">No SOP documents attached yet.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4">
                {documentFields.map((doc, index) => {
                  const currentDocState = watchedDocuments[index] || doc;
                  if (currentDocState.isSopDocument === false) return null;
                  return renderDocumentItem(doc, index, currentDocState);
                })}
              </ul>
            )}
          </Section>

          <Section title="NON-SOP Documents" badge={nonSopDocs.length}>
            {nonSopDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 text-sm font-medium">No non-SOP documents attached yet.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4">
                {documentFields.map((doc, index) => {
                  const currentDocState = watchedDocuments[index] || doc;
                  if (currentDocState.isSopDocument !== false) return null;
                  return renderDocumentItem(doc, index, currentDocState);
                })}
              </ul>
            )}
          </Section>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSubmit((data) => handleSaveDraft(data))}
              disabled={actionsLoading || documentFields.length === 0}
              className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSubmit(handleSubmitImmediately)}
              disabled={actionsLoading || documentFields.length === 0}
              className="flex-1 py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-md transition-colors disabled:opacity-50"
            >
              Submit Process
            </button>
          </div>
        </form>
      </div>

      {showCopyModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Copy From Existing Process</h3>
              <button type="button" onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition-colors">
                <IconX size={20} />
              </button>
            </div>
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto bg-gray-50/50 min-h-[300px]">
              {processList.length === 0 ? (
                <div className="text-center py-12">
                  <IconLoader className="animate-spin mx-auto text-gray-400 mb-3" size={32} />
                  <p className="text-gray-500 text-sm font-medium">Loading available processes...</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {processList
                    .filter(
                      (p) =>
                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((process) => (
                      <li
                        key={process.id}
                        className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group flex flex-col"
                        onClick={() => handleSelectProcess(process)}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                          <h4 className="font-bold text-gray-800 group-hover:text-blue-700 break-words leading-tight">{process.name}</h4>
                          <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded shrink-0">
                            {new Date(process.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{process.description || 'No description provided.'}</p>
                        {process.workflow && (
                          <p className="text-xs text-indigo-600 font-semibold">
                            {process.workflow.name} v{process.workflow.version}
                          </p>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
              <button type="button" onClick={() => setShowCopyModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <EditDocumentModal
        editingDocument={editingDocument}
        setEditingDocument={setEditingDocument}
        onSave={handleSaveDocumentEdit}
        onClose={closeEditModal}
        onViewEditable={handleViewEditableReference}
        actionsLoading={actionsLoading}
      />

      <MetadataOnlyModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        onSave={handleAddMetadataDoc}
        workflowId={workflowId}
      />

      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}

      {localPreviewFile && <LocalFilePreviewModal file={localPreviewFile} onClose={() => setLocalPreviewFile(null)} />}
    </>
  );
}