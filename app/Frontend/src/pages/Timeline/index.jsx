import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-hot-toast';
import {
  IconCheck,
  IconX,
  IconClock,
  IconFileText,
  IconMessageCircle,
  IconAlertCircle,
  IconInfoCircle,
  IconThumbUp,
  IconCheckupList,
  IconSignature,
  IconUpload,
  IconChevronUp,
  IconChevronDown,
  IconFileArrowRight,
  IconArrowLeft,
  IconEye,
  IconAlignBoxCenterMiddle,
  IconCalendarEvent,
  IconUser,
  IconDatabase,
  IconFolderOpen,
  IconHash,
  IconLayoutList,
  IconTag,
  IconNotes,
  IconGitCommit
} from '@tabler/icons-react';
import TimelineLegend from './TimelineLegend';
import CustomButton from '../../CustomComponents/CustomButton';
import { ViewDocument } from '../../common/Apis';
import ViewFile from '../view/View';
import CustomCard from '../../CustomComponents/CustomCard';
import Show from '../workflows/Show';
import { useNavigate } from 'react-router-dom';
import { ImageConfig } from '../../config/ImageConfig';
import ReOpenProcessModal from '../Processes/Actions/ReOpenProcessModal';
import CustomModal from '../../CustomComponents/CustomModal';

const iconMap = {
  PROCESS_INITIATED: <IconInfoCircle size={18} className="text-blue-600" />,
  DOCUMENT_SIGNED: <IconSignature size={18} className="text-emerald-600" />,
  DOCUMENT_REJECTED: <IconX size={18} className="text-rose-600" />,
  QUERY_RAISED: <IconAlertCircle size={18} className="text-amber-600" />,
  QUERY_RESOLVED: <IconCheckupList size={18} className="text-emerald-600" />,
  RECOMMENDATION_REQUESTED: <IconMessageCircle size={18} className="text-violet-600" />,
  RECOMMENDATION_PROVIDED: <IconThumbUp size={18} className="text-violet-600" />,
  STEP_COMPLETED: <IconCheck size={18} className="text-teal-600" />,
  DOCUMENT_UPLOADED: <IconUpload size={18} className="text-cyan-600" />,
};

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Robust handler for falsy values to prevent empty UI blocks
const renderValue = (val, fallback = '--') => {
  if (val === 0 || val === '0') return val;
  if (val === false) return 'No';
  if (val === true) return 'Yes';
  if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return fallback;
  return val;
};

const Timeline = ({
  activities,
  setActionsLoading,
  actionsLoading,
  workflow,
  print,
  id,
  process,
  reOpen,
}) => {
  const navigate = useNavigate();

  const [fileView, setFileView] = useState(null);
  const [openModal, setOpenModal] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(null);

  const handleView = async (name, path, fileId, type, isEditing) => {
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

  const handleBack = () => navigate(-1);

  // Stitches backend data from activities to ensure modal has full metadata
  const openDocDetails = (doc) => {
    const uploadActivity = activities.find(
      (a) => a.actionType === 'DOCUMENT_UPLOADED' && a.details?.documentId === doc.id
    );

    const workflowName =
      process?.workflow?.name ||
      activities.find((a) => a.details?.workflow)?.details?.workflow ||
      '--';

    setDocumentModalOpen({
      ...doc,
      createdBy: uploadActivity?.details?.uploadedBy || 'System / Unknown',
      createdOn: uploadActivity?.createdAt || null,
      processName: process?.processName || '--',
      workflowName: workflowName,
      SOPIssueNo: doc.SOPIssueNo,
      issueNo: doc.issueNo
    });
  };

  const logDetails = [
    { label: 'Process ID', value: renderValue(process?.processId) },
    { label: 'Process Name', value: renderValue(process?.processName) },
  ];

  // Sleek inline metadata renderer for timeline tracks
  const renderDocumentProperties = (details) => {
    return (
      <div className="mt-4 bg-slate-50/50 rounded-lg border border-slate-200/60 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Doc Issue No</p>
             <p className="text-sm font-medium text-slate-900 truncate">{renderValue(details.issueNo)}</p>
           </div>
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Process SOP No</p>
             <p className="text-sm font-medium text-slate-900 truncate">{renderValue(details.SOPIssueNo)}</p>
           </div>
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Part No</p>
             <p className="text-sm font-medium text-slate-900 truncate">{renderValue(details.partNumber)}</p>
           </div>
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Cycle</p>
             <div className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-sm">
               {renderValue(details.reopenCycle, '0')}
             </div>
           </div>
        </div>
        
        {details.description && (
          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Description</p>
            <p className="text-sm text-slate-700 break-words leading-relaxed">{details.description}</p>
          </div>
        )}

        {(details.superseding || details.isReplacement) && details.reasonOfSupersed && (
          <div className="mt-3 pt-3 border-t border-rose-100/60">
            <p className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-1">Supersed Reason</p>
            <p className="text-sm text-rose-800 break-words leading-relaxed">{details.reasonOfSupersed}</p>
          </div>
        )}

        {details.tags && details.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
            <IconTag size={14} className="text-slate-400 shrink-0"/>
            {details.tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-slate-200 text-slate-600 truncate max-w-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetails = (activity) => {
    const { actionType, details = {} } = activity;

    switch (actionType) {
      case 'DOCUMENT_UPLOADED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">By:</span> <span className="font-medium text-slate-900">{renderValue(details?.uploadedBy, 'N/A')}</span></p>
                  <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Workflow:</span> <span className="font-medium text-slate-900">{renderValue(details?.workflow, 'N/A')}</span></p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full">
                  <IconFileText size={18} className="text-cyan-600 shrink-0"/>
                  <span className="text-sm font-medium text-slate-900 truncate" title={details?.name}>{renderValue(details?.name, 'Unknown Document')}</span>
                </div>
              </div>
              {details?.name && details?.path && (
                <div className="shrink-0">
                  <button onClick={() => handleView(details?.name, details?.path, details?.documentId, details?.type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors shadow-sm">
                    <IconEye size={16}/> View File
                  </button>
                </div>
              )}
            </div>
            {renderDocumentProperties(details)}
          </div>
        );

      case 'PROCESS_INITIATED':
        return (
          <div className="mt-3 space-y-2 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Initiator:</span> <span className="font-medium text-slate-900">{renderValue(details.initiatorName, 'N/A')}</span></p>
               <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Process:</span> <span className="font-medium text-slate-900">{renderValue(details.processName, 'N/A')}</span></p>
            </div>
            {details?.description && (
               <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 break-words leading-relaxed">
                 {details.description}
               </div>
            )}
          </div>
        );

      case 'DOCUMENT_SIGNED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div className="space-y-2 min-w-0 flex-1">
                 <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Signed By:</span> <span className="font-medium text-slate-900">{renderValue(details.signedBy, 'N/A')}</span></p>
                 {details.remarks && (
                   <p className="text-sm text-slate-700 break-words bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                     <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-0.5">Remarks</span> 
                     {details.remarks}
                   </p>
                 )}
                 <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full mt-1">
                    <IconFileText size={18} className="text-emerald-600 shrink-0"/>
                    <span className="text-sm font-medium text-slate-900 truncate" title={details.name}>{renderValue(details.name, 'Unknown Document')}</span>
                 </div>
               </div>
               {details.name && details.path && (
                 <div className="shrink-0">
                   <button onClick={() => handleView(details.name, details.path, details.id, details.type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors shadow-sm">
                     <IconEye size={16}/> View File
                   </button>
                 </div>
               )}
            </div>
            {renderDocumentProperties(details)}
          </div>
        );

      case 'DOCUMENT_REJECTED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div className="space-y-3 min-w-0 flex-1">
                 <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Rejected By:</span> <span className="font-medium text-slate-900">{renderValue(details.rejectedBy, 'N/A')}</span></p>
                 <div className="text-sm text-rose-900 bg-rose-50/50 p-3 rounded-lg border border-rose-200 break-words">
                   <span className="text-[10px] uppercase tracking-widest text-rose-500 font-bold block mb-1">Reason for Rejection</span> 
                   {renderValue(details.rejectionReason, 'No reason provided')}
                 </div>
                 <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full">
                    <IconFileText size={18} className="text-rose-600 shrink-0"/>
                    <span className="text-sm font-medium text-slate-900 truncate" title={details.name}>{renderValue(details.name, 'Unknown Document')}</span>
                 </div>
               </div>
               {details.name && details.path && (
                 <div className="shrink-0">
                   <button onClick={() => handleView(details.name, details.path, details.id, details.type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors shadow-sm">
                     <IconEye size={16}/> View File
                   </button>
                 </div>
               )}
            </div>
            {renderDocumentProperties(details)}
          </div>
        );

      case 'QUERY_RAISED':
        return (
          <div className="mt-3 space-y-3 min-w-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span></p>
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Initiator:</span> <span className="font-medium text-slate-900">{renderValue(details.initiatorName, 'N/A')}</span></p>
             </div>
             <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200/60 break-words">
                <span className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1 block">Query</span>
                <p className="text-sm text-slate-800 leading-relaxed">{renderValue(details.queryText, 'No query text provided')}</p>
             </div>

             {details.documentChanges && details.documentChanges.length > 0 && (
               <div className="mt-4 pt-3 border-t border-slate-100">
                 <strong className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                    <IconFileText size={14}/> Document Changes
                 </strong>
                 <div className="space-y-2">
                   {details.documentChanges.map((doc, i) => (
                     <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg p-2.5 text-sm min-w-0 shadow-sm">
                       <div className="flex-1 min-w-0">
                         <span className="font-medium text-slate-900 truncate block" title={doc.document?.name}>{renderValue(doc.document?.name, 'N/A')}</span>
                         {doc.replacedDocument && (
                            <span className="text-xs text-slate-500 truncate block mt-0.5" title={doc.replacedDocument.name}>
                              <span className="font-medium mr-1 text-slate-400">Replaced:</span>{doc.replacedDocument.name}
                            </span>
                         )}
                       </div>
                       {doc.document?.name && doc.document?.path && (
                         <button onClick={() => handleView(doc.document.name, doc.document.path, doc.document.id, doc.document.type)} className="shrink-0 text-indigo-600 hover:text-indigo-700 font-medium text-xs px-2.5 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                           View Target
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </div>
        );

      case 'QUERY_RESOLVED':
        return (
          <div className="mt-3 space-y-3 min-w-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span></p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
               <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 break-words">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Original Query</span>
                  <p className="text-sm text-slate-800">{renderValue(details.queryText, 'No query text provided')}</p>
               </div>
               <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200/60 break-words">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-1 block">Resolution Answer</span>
                  <p className="text-sm text-slate-800">{renderValue(details.answerText, 'No answer provided')}</p>
               </div>
             </div>
          </div>
        );

      case 'RECOMMENDATION_REQUESTED':
      case 'RECOMMENDATION_PROVIDED':
        const isRequest = actionType === 'RECOMMENDATION_REQUESTED';
        return (
          <div className="mt-3 space-y-3 min-w-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span></p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
               <div className={`${isRequest ? 'bg-violet-50/50 border-violet-200/60' : 'bg-slate-50 border-slate-200'} p-3.5 rounded-lg border break-words`}>
                  <span className={`text-[10px] uppercase tracking-widest ${isRequest ? 'text-violet-600' : 'text-slate-500'} font-bold mb-1 block`}>Recommendation Request</span>
                  <p className="text-sm text-slate-800">{renderValue(details.recommendationText, 'No request text provided')}</p>
               </div>
               {!isRequest && (
                 <div className="bg-violet-50/50 p-3.5 rounded-lg border border-violet-200/60 break-words">
                    <span className="text-[10px] uppercase tracking-widest text-violet-600 font-bold mb-1 block">Provided Response</span>
                    <p className="text-sm text-slate-800">{renderValue(details.responseText, 'No response provided')}</p>
                 </div>
               )}
             </div>

             {details.documentDetails && details.documentDetails.length > 0 && (
               <div className="mt-4 pt-3 border-t border-slate-100">
                 <strong className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                    <IconFileText size={14}/> Related Documents
                 </strong>
                 <div className="space-y-2">
                   {details.documentDetails.map((doc, i) => (
                     <div key={i} className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm min-w-0">
                       <span className="text-sm font-medium text-slate-800 truncate flex-1" title={doc.documentName}>{doc.documentName}</span>
                       {doc.documentPath && (
                         <button onClick={() => handleView(doc.documentName, doc.documentPath, doc.documentId, doc.documentType)} className="shrink-0 text-indigo-600 hover:text-indigo-700 font-medium text-xs px-2.5 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                           View
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </div>
        );

      case 'STEP_COMPLETED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <p className="text-sm text-slate-600 truncate flex-1">
                 <span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span>
              </p>
              <div className="shrink-0">
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                   {renderValue(details.status, 'UNKNOWN')}
                 </span>
              </div>
            </div>
            {details?.decisionComment && (
              <div className="mt-2">
                 <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Decision Comment</p>
                 <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 break-words leading-relaxed">{details.decisionComment}</p>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-slate-400 italic text-sm mt-3">No additional payload data available.</p>;
    }
  };

  const exportDivToPDF = () => {
    setActionsLoading(true);
    const element = document.getElementById('reportDiv');
    const opt = {
      margin: 0.5,
      filename: `${id}_timeline.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().from(element).set(opt).save();
    setActionsLoading(false);
  };

  function extractDocumentsByReopenCycle(processData) {
    const { documentVersioning } = processData;
    const allReopenCycles = new Set();
    const lineageMap = new Map();
    const newDocuments = [];

    documentVersioning.forEach((group) => {
      const versions = [...group.versions].sort((a, b) => a.reopenCycle - b.reopenCycle);
      versions.forEach((v) => allReopenCycles.add(v.reopenCycle));
      const hasOriginal = versions.some((v) => v.reopenCycle === 0);

      if (hasOriginal) {
        lineageMap.set(group.latestDocumentId, versions);
      } else {
        newDocuments.push(versions[0]);
      }
    });

    const reopenCycles = [...allReopenCycles].sort((a, b) => a - b);

    return reopenCycles.map((cycle) => {
      const documents = [];
      lineageMap.forEach((versions) => {
        let selected = null;
        for (let i = versions.length - 1; i >= 0; i--) {
          if (versions[i].reopenCycle <= cycle) {
            selected = versions[i];
            break;
          }
        }
        if (selected) documents.push(selected);
      });

      newDocuments.forEach((doc) => {
        if (doc.reopenCycle <= cycle) {
          documents.push(doc);
        }
      });

      const sopMatch = documents.find((d) => d.reopenCycle === cycle && d.SOPIssueNo);

      return {
        reopenCycle: cycle,
        SOPIssueNo: sopMatch?.SOPIssueNo || documents[0]?.SOPIssueNo || '--',
        documents,
      };
    });
  }

  const DocumentsCycle = (process) => {
    const cycles = extractDocumentsByReopenCycle(process);

    return (
      <div className="mt-10">
        <h2 className="text-base font-bold text-slate-900 mb-5 tracking-tight border-b border-slate-200 pb-3 flex items-center gap-2">
          <IconGitCommit size={20} className="text-slate-400"/>
          Document Version Cycles
        </h2>
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {cycles.map((cycle, index) => {
            const isLast = index === cycles.length - 1;

            return (
              <div
                key={cycle.reopenCycle}
                className={`rounded-xl border transition-all ${
                  isLast ? 'bg-indigo-50/20 border-indigo-200/60 shadow-sm' : 'bg-white border-slate-200'
                }`}
              >
                {/* Cycle Header */}
                <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4 rounded-t-xl ${isLast ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Cycle</span>
                    <span className="font-bold text-sm text-indigo-700 bg-white border border-indigo-100 shadow-sm px-2.5 py-0.5 rounded leading-none">{renderValue(cycle.reopenCycle, '0')}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Process SOP No</span>
                    <span className="font-semibold text-slate-800 text-sm bg-white border border-slate-200 shadow-sm px-2.5 py-0.5 rounded leading-none">{renderValue(cycle.SOPIssueNo)}</span>
                  </div>
                </div>

                {/* Cycle Body */}
                <div className="p-5 space-y-3">
                  {cycle.documents.length > 0 ? (
                    cycle.documents.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 hover:shadow-sm transition-all group min-w-0"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg shrink-0 group-hover:bg-white transition-colors">
                            <img width={20} src={ImageConfig[doc.type] || ImageConfig['default']} alt={doc.type} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${doc.active ? 'font-semibold text-slate-900' : 'text-slate-500'}`} title={doc.name}>
                              {renderValue(doc.name, 'Unknown Document')}
                            </p>
                            <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 flex-wrap">
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                <IconHash size={12} className="text-slate-400"/> Issue: <span className="text-slate-700">{renderValue(doc?.issueNo)}</span>
                              </p>
                              {doc.tags && doc.tags.length > 0 && (
                                 <div className="flex items-center gap-1">
                                   <IconTag size={12} className="text-slate-400"/>
                                   <span className="text-[11px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                                     {doc.tags[0]}
                                   </span>
                                   {doc.tags.length > 1 && (
                                      <span className="text-[10px] text-slate-500 font-bold bg-slate-50 border border-slate-200 px-1 rounded">
                                        +{doc.tags.length - 1}
                                      </span>
                                   )}
                                 </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleView(doc.name, doc.path, doc.id, doc.type, false)}
                            disabled={actionsLoading}
                            title="View Document"
                            className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                          >
                            <IconEye size={18} />
                          </button>

                          <button
                            onClick={() => openDocDetails(doc)}
                            disabled={actionsLoading}
                            title="Document Details"
                            className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                          >
                            <IconAlignBoxCenterMiddle size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-sm text-slate-500">No documents uploaded for this cycle</p>
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

  return (
    <>
      <div className="max-w-[90rem] mx-auto space-y-8 mt-6 px-4 sm:px-6 lg:px-8 bg-slate-50/30 min-h-screen pb-12">
        
        {/* Header / Process Overview Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Process Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1.5">Manage and track the entire lifecycle of this workflow instance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CustomButton
                  variant="outline"
                  text={
                    <div className="flex items-center gap-2 font-medium">
                      <IconArrowLeft size={16} /> Back
                    </div>
                  }
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                  click={handleBack}
                  disabled={actionsLoading}
                />
                <CustomButton
                  variant="primary"
                  text={<span className="font-semibold px-2">Re-Open Process</span>}
                  className="bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white border-transparent"
                  click={() => setOpenModal('re-open')}
                  disabled={actionsLoading || !reOpen}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {logDetails?.map((detail, index) => (
                <div
                  key={index}
                  className="p-5 border border-slate-200 bg-slate-50/50 rounded-xl flex flex-col justify-center min-w-0"
                >
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{detail.label}</p>
                  <p className="text-lg font-semibold text-slate-900 truncate">{detail.value}</p>
                </div>
              ))}
            </div>

            {process?.documentVersioning && DocumentsCycle(process)}
          </div>
        </div>
        
        {/* Visual Workflow Accordion */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl transition-all duration-300 ease-in-out">
          <div className="p-6 sm:p-8">
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-left group focus:outline-none"
            >
              <div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Workflow Visualization</h2>
                <p className="text-sm text-slate-500 mt-1">View the structured map of steps and assignments.</p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors shrink-0">
                {expanded ? (
                  <IconChevronUp size={18} className="text-slate-600 group-hover:text-indigo-600 transition-transform duration-300" />
                ) : (
                  <IconChevronDown size={18} className="text-slate-600 group-hover:text-indigo-600 transition-transform duration-300" />
                )}
              </div>
            </button>

            <div
              className={`transition-all duration-500 ease-in-out overflow-hidden ${
                expanded ? 'max-h-[1000px] opacity-100 mt-8' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
                 <Show steps={workflow} />
              </div>
            </div>
          </div>
        </div>
        
        {/* The Timeline Track */}
        <div id="reportDiv" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 lg:p-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Activity Timeline
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">A strict chronological audit log of all process events.</p>
            </div>
            {print ? (
              <CustomButton
                disabled={actionsLoading}
                variant="outline"
                text={<span className="flex items-center gap-2 font-medium px-2"><IconFileArrowRight size={18}/> Export Report</span>}
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm shrink-0"
                click={exportDivToPDF}
                title="Export Timeline to PDF"
              />
            ) : null}
          </div>

          <TimelineLegend />

          {/* Continuous Left-Aligned Timeline Layout */}
          <div className="relative mt-10">
            {/* The continuous vertical line (Hidden on very small screens, or shifted) */}
            <div className="absolute top-0 bottom-0 left-[23px] sm:left-[160px] w-px bg-slate-200 hidden xs:block"></div>

            <div className="space-y-10">
              {activities.map((activity, idx) => {
                const IconComp = iconMap[activity.actionType] || <IconClock size={18} className="text-slate-400" />;
                const dateObj = new Date(activity.createdAt);
                
                // Formatting Date and Time separately for desktop alignment
                const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={idx} className="relative flex flex-col sm:flex-row items-start group">
                    
                    {/* Timestamp (Desktop: left side, Mobile: above) */}
                    <div className="sm:w-[130px] shrink-0 sm:text-right sm:pr-8 sm:pt-2.5 mb-3 sm:mb-0 hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">{dateStr}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{timeStr}</div>
                    </div>

                    {/* Timeline Node (Icon on the line) */}
                    <div className="absolute left-0 sm:left-[140px] top-0 sm:top-1.5 flex items-center justify-center w-12 h-12 rounded-full border border-slate-200 bg-white shadow-sm text-slate-600 z-10 transition-transform group-hover:scale-110 group-hover:border-slate-300 group-hover:shadow hidden xs:flex">
                      {IconComp}
                    </div>
                    
                    {/* Content Card (Right side) */}
                    <div className="flex-1 min-w-0 xs:pl-16 sm:pl-12 w-full">
                      
                      {/* Mobile Timestamp Fallback */}
                      <div className="sm:hidden mb-2 flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-slate-50 text-slate-600 shrink-0">
                          {IconComp}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 mr-2">{dateStr}</span>
                          <span className="text-xs font-medium text-slate-500">{timeStr}</span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:border-slate-300 hover:shadow-md transition-all">
                        <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                          {renderValue(activity.description, 'Unknown Action')}
                        </h3>
                        <div className="mt-2">
                          {renderDetails(activity)}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ReOpen Modal */}
      <CustomModal
        isOpen={openModal === 're-open'}
        onClose={() => setOpenModal('')}
        className="max-h-[95vh] overflow-y-auto max-w-lg w-full rounded-2xl p-0"
      >
        <div className="p-6">
          <ReOpenProcessModal
            workflowId={process?.workflow?.id}
            processId={process.processId}
            storagePath={process.processStoragePath}
            close={() => setOpenModal('')}
            documents={process.documents}
          />
        </div>
      </CustomModal>

      {/* View File Modal */}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}

      {/* Corporate Document Details Modal */}
      <CustomModal
        isOpen={!!documentModalOpen}
        onClose={() => setDocumentModalOpen(null)}
        className="max-h-[90vh] overflow-y-auto w-full max-w-lg md:max-w-3xl p-0 bg-white rounded-2xl shadow-2xl border border-slate-200"
      >
        {documentModalOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-5 flex items-start justify-between border-b border-slate-200 sticky top-0 z-10">
              <div className="flex items-center gap-4 min-w-0 pr-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0">
                  <img
                    width={24}
                    src={ImageConfig[documentModalOpen.type] || ImageConfig['default']}
                    alt={documentModalOpen.type}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">
                    {renderValue(documentModalOpen.name, 'Untitled Document')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500 font-medium">
                    <span className="uppercase text-[10px] tracking-widest font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">{renderValue(documentModalOpen.type, 'N/A')}</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><IconDatabase size={14} className="text-slate-400"/> {formatBytes(documentModalOpen.size)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setDocumentModalOpen(null)} 
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors shrink-0"
              >
                <IconX size={20} stroke={2} />
              </button>
            </div>

            {/* Badges */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap gap-2">
              {documentModalOpen.preApproved ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <IconCheck size={14}/> Pre-Approved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Not Pre-Approved
                </span>
              )}
              {documentModalOpen.isReplacement && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                  Replacement Doc
                </span>
              )}
              {documentModalOpen.superseding && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                  Superseding Doc
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-white">
              
              {/* General Info */}
              <div className="space-y-5 min-w-0">
                <h4 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
                  <IconFileText size={14}/> General Information
                </h4>
                <div className="space-y-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Created By</p>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2 truncate"><IconUser size={16} className="text-slate-400 shrink-0"/> {renderValue(documentModalOpen.createdBy, '--')}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Created On</p>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2 truncate">
                      <IconCalendarEvent size={16} className="text-slate-400 shrink-0"/> 
                      {documentModalOpen.createdOn ? new Date(documentModalOpen.createdOn).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Storage Path</p>
                    <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <IconFolderOpen size={16} className="text-slate-400 shrink-0 mt-0.5"/> 
                      <p className="text-xs font-mono text-slate-700 break-all leading-relaxed">{renderValue(documentModalOpen.path, '--')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process Info */}
              <div className="space-y-5 min-w-0">
                <h4 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-slate-100 pb-2">
                  <IconLayoutList size={14}/> Process Linkage
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Doc Issue No</p>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5 truncate"><IconHash size={14} className="text-slate-400 shrink-0"/> {renderValue(documentModalOpen.issueNo, '--')}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Process SOP No</p>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-1.5 truncate"><IconHash size={14} className="text-slate-400 shrink-0"/> {renderValue(documentModalOpen.SOPIssueNo, '--')}</p>
                    </div>
                  </div>
                  
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Workflow / Process</p>
                    <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200 break-words leading-relaxed">
                      {renderValue(documentModalOpen.workflowName, '--')} <span className="text-slate-300 mx-1">/</span> {renderValue(documentModalOpen.processName, '--')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Reopen Cycle</p>
                      <p className="text-sm font-bold text-slate-900">{renderValue(documentModalOpen.reopenCycle, '0')}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Part Number</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{renderValue(documentModalOpen.partNumber, '--')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Full Width Info */}
              <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
                {documentModalOpen.description && (
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1 flex items-center gap-1.5"><IconNotes size={14}/> Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 break-words shadow-sm">
                      {documentModalOpen.description}
                    </p>
                  </div>
                )}
                
                {documentModalOpen.reasonOfSupersed && (
                  <div className="min-w-0 mt-2">
                    <p className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-1 flex items-center gap-1.5"><IconNotes size={14}/> Reason of Supersed</p>
                    <p className="text-sm text-rose-800 leading-relaxed bg-rose-50/50 p-4 rounded-xl border border-rose-200 break-words shadow-sm">
                      {documentModalOpen.reasonOfSupersed}
                    </p>
                  </div>
                )}

                {documentModalOpen.tags && documentModalOpen.tags.length > 0 && (
                  <div className="min-w-0 mt-2">
                     <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Associated Tags</p>
                     <div className="flex flex-wrap gap-2">
                       {documentModalOpen.tags.map((tag, i) => (
                         <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700">
                           <IconTag size={12} className="mr-1.5 text-slate-400"/> {tag}
                         </span>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200 rounded-b-2xl">
              <CustomButton
                variant="outline"
                text="Close Window"
                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium px-6 py-2 shadow-sm rounded-lg transition-colors"
                click={() => setDocumentModalOpen(null)}
              />
            </div>
          </div>
        )}
      </CustomModal>
    </>
  );
};

export default Timeline;