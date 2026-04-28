import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ClaimProcess, CompleteProcess, deleteDocumentInProcess, DownloadFile, GetProcessData, getRecommendations, RejectDocument, RevokeRejection, SignDocument, SignRevoke, ViewDocument } from '../../common/Apis';
import { IconEye, IconCheck, IconX, IconAlignBoxCenterMiddle, IconFileText, IconTrash, IconInfoCircle, IconDatabaseImport } from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import ViewFile from '../view/View';
import { toast } from 'react-toastify';
import TopLoader from '../../common/Loader/TopLoader';
import RemarksModal from '../../CustomComponents/RemarksModal';
import CustomModal from '../../CustomComponents/CustomModal';
import Query from './Actions/Query';
import QuerySolve from './Actions/QuerySolve';
import AskRecommend from './Actions/AskRecommend';
import axios from 'axios';
import { ImageConfig } from '../../config/ImageConfig';
import ReOpenProcessModal from './Actions/ReOpenProcessModal';
import DocumentsVersionWise from './DocumentsVersionWise';
import ProcessDocumentUpload from '../../CustomComponents/ProcessDocumentUpload';
import DeleteConfirmationModal from '../../CustomComponents/DeleteConfirmation';

const ViewProcess = () => {
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [reopenDraftInfo, setReopenDraftInfo] = useState({ draftId: null, shouldOpen: false, fromDraftedList: false });
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isCompleted = searchParams.get('completed') === 'true';
  const [autoOpenReopenModal, setAutoOpenReopenModal] = useState(false);
  const [reopenDraftId, setReopenDraftId] = useState(null);
  const username = sessionStorage.getItem('username');
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef();
  const { id } = useParams();
  const [actionsLoading, setActionsLoading] = useState(false);
  const [process, setProcess] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileView, setFileView] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [existingQuery, setExistingQuery] = useState(null);
  const [openModal, setOpenModal] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [canEdit, setCanEdit] = useState({});
  const [remarksModalOpen, setRemarksModalOpen] = useState({ id: null, open: false });

  const isReadOnly = location.state?.readOnly === true;
  const disableActions = process?.currentStepType ? process.currentStepType !== 'APPROVAL' : false;
  const activeStepInstance = process?.stepInstances?.find((item) => item.status === "IN_PROGRESS" || item.status === "MIGRATED");
  const currentStepInstanceId = activeStepInstance?.id || process?.processStepInstanceId;
  const isMigratedStep = activeStepInstance?.status === "MIGRATED" || (!process?.currentStepType && process?.status === 'IN_PROGRESS');

  const processDetails = [
    { label: 'Process ID', value: process?.processId },
    { label: 'Process Name', value: process?.processName || 'N/A' },
    { label: 'Process SOP', value: process?.issueNo || 'N/A' },
    { label: 'Description', value: process?.description || 'N/A' },
    { label: 'Initiator Name', value: process?.initiatorName || 'Unknown' },
    { label: 'Status', value: (<span className={`px-3 py-1 rounded-full max-w-[200px] text-white text-sm font-semibold block text-center mt-1 ${process?.status === 'PENDING' ? 'bg-yellow-500' : 'bg-green-500'}`}>{process?.status}</span>) },
    { label: 'Created At', value: new Date(process?.createdAt).toLocaleString() },
    { label: 'Arrived At', value: new Date(process?.arrivedAt).toLocaleString() },
    { label: 'Updated At', value: process?.updatedAt ? new Date(process?.updatedAt).toLocaleString() : 'N/A' },
    { label: 'Completed At', value: process?.completedAt ? new Date(process?.completedAt).toLocaleString() : 'N/A' },
  ];

  const fetchProcess = async () => {
    try {
      const response = await GetProcessData(id);
      setProcess(response?.data?.process);
      const editChecks = {};
      await Promise.all(
        response?.data?.process?.documents.map(async (doc) => {
          try {
            await axios.get(`http://localhost:${process.env.REACT_APP_API_PORT || 8000}/wopi/token/${doc.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            editChecks[doc.id] = true;
          } catch (err) { editChecks[doc.id] = false; }
        }),
      );
      setCanEdit(editChecks);
    } catch (err) { setError(err?.response?.data?.message || err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (location.state?.openReopenModal && location.state?.reopenDraftId) {
      setReopenDraftInfo({ draftId: location.state.reopenDraftId, shouldOpen: true, fromDraftedList: true });
      sessionStorage.setItem('reopenDraftData', JSON.stringify({ processId: id, draftId: location.state.reopenDraftId, timestamp: Date.now() }));
      window.history.replaceState({}, document.title);
    }
  }, [location.state, id]);

  useEffect(() => {
    if (process && !reopenDraftInfo.fromDraftedList) {
      const savedDraft = sessionStorage.getItem('reopenDraftData');
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft);
        if (draftData.processId === process.processId && Date.now() - draftData.timestamp < 5 * 60 * 1000) {
          setReopenDraftInfo({ draftId: draftData.draftId, shouldOpen: false, fromDraftedList: false });
        } else { sessionStorage.removeItem('reopenDraftData'); }
      }
    }
  }, [process]);

  const handleCompleteProcess = async (stepId) => { setActionsLoading(true); try { const response = await CompleteProcess(stepId); toast.success(response?.data?.message); navigate('/processes/work'); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };
  const handleClaim = async () => { setActionsLoading(true); try { const response = await ClaimProcess(process?.processId, currentStepInstanceId); toast.success(response?.data?.message); setProcess((prev) => ({ ...prev, toBePicked: false })); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };
  const handleViewFile = async (name, path, fileId, type, isEditing) => { setActionsLoading(true); try { const fileData = await ViewDocument(name, path, type, fileId); setFileView(fileData); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };
  const handleDownloadFile = async (name, path) => { setActionsLoading(true); const folderPath = path.substring(0, path.lastIndexOf("/")); await DownloadFile(name, folderPath); setActionsLoading(false); };
  const handleViewAllSelectedFiles = async () => { setActionsLoading(true); try { const selected = process.documents.filter((doc) => selectedDocs.includes(doc.id)); const formattedDocs = await Promise.all(selected.map(async (doc) => { const res = await ViewDocument(doc.name, doc.path, doc.type, doc.id, false); return res; })); setFileView({ multi: true, docs: formattedDocs }); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };
  
  // New helper function to strip filename from ref documents for viewing
  const handleViewRefFile = async (refDoc) => {
    if (!refDoc) return;
    const folderPath = refDoc.path.substring(0, refDoc.path.lastIndexOf("/"));
    const type = refDoc.name?.split('.').pop()?.toLowerCase();
    return handleViewFile(refDoc.name, folderPath, refDoc.id, type, false);
  };
  
  const handleSignDocument = async (remarks) => { setActionsLoading(true); try { const res = await SignDocument(process?.processId, currentStepInstanceId, remarksModalOpen.id, remarks); toast.success(res?.data?.message); setRemarksModalOpen({ id: null, open: false }); setProcess((prev) => ({ ...prev, documents: prev.documents.map((doc) => doc.id === remarksModalOpen.id ? { ...doc, signedBy: [...doc?.signedBy, { signedBy: username, remarks }], } : doc ) })); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };
  const handleRejectDocument = async (remarks) => { setActionsLoading(true); try { const response = await RejectDocument(process.processId, remarksModalOpen.id, currentStepInstanceId, remarks); setProcess((prev) => ({ ...prev, documents: prev.documents.map((doc) => doc.id === remarksModalOpen.id ? { ...doc, rejectionDetails: { rejectedBy: username, rejectionReason: remarks, rejectedAt: new Date().toISOString(), byRecommender: false, isAttachedWithRecommendation: false } } : doc ) })); setRemarksModalOpen({ id: null, open: false }); toast.success(response?.data?.message); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };
  const handleSolveQuery = (query) => { setExistingQuery({ queryText: query?.queryText, documentSummaries: query?.documentSummaries, documentChanges: [] }); };

  const DetailItem = ({ label, value }) => ( <div className="min-w-0"> <span className="block text-md text-black font-medium">{label}</span> <span className="text-sm font-normal text-gray-900 break-words whitespace-pre-wrap">{value}</span> </div> );

  function buildSopSnapshotTable(processData) {
    const { documentVersioning, nonSopDocuments } = processData;
    const allReopenCycles = new Set();
    const sopLineages = [];

    documentVersioning.forEach((group) => {
      const isSop = group.versions.some(v => v.isSopDocument !== false);
      if (!isSop) return;
      const versions = [...group.versions].sort((a, b) => a.reopenCycle - b.reopenCycle);
      versions.forEach((v) => allReopenCycles.add(v.reopenCycle));
      sopLineages.push({ latestDocumentId: group.latestDocumentId, versions });
    });

    if (allReopenCycles.size === 0) allReopenCycles.add(0);
    const sortedCycles = [...allReopenCycles].sort((a, b) => a - b);

    const snapshots = sortedCycles.map((cycle) => {
      const sopEntries = [];
      sopLineages.forEach((lineage) => {
        let selected = null;
        for (let i = lineage.versions.length - 1; i >= 0; i--) { if (lineage.versions[i].reopenCycle <= cycle) { selected = lineage.versions[i]; break; } }
        if (selected) sopEntries.push(selected);
      });
      const sopMatch = sopEntries.find((d) => d.reopenCycle === cycle && d.SOPIssueNo);
      const sopIssueNo = sopMatch?.SOPIssueNo || sopEntries[0]?.SOPIssueNo || processData.issueNo || '--';
      return { reopenCycle: cycle, SOPIssueNo: sopIssueNo, sopEntries, nonSopDocuments: nonSopDocuments || [] };
    });
    return snapshots;
  }

  const SopSnapshotDocCard = ({ doc, onView, onDetails, actionsLoading }) => {
    const isMetaOnly = doc.isMetadataOnly && !doc.metadataFulfilledAt;
    const ext = doc.metaFileExtension || doc.name?.split('.').pop()?.toLowerCase();
    
    return (
      <div className={`flex flex-col border rounded-lg p-2.5 shadow-sm ${isMetaOnly ? 'bg-amber-50/30 border-dashed border-amber-300' : 'bg-white'}`} title={doc.name || doc.metaFileName}>
        <div className="flex items-center gap-2">
          {isMetaOnly ? ( 
            <div className="w-8 h-8 shrink-0 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center opacity-70"> 
              <IconDatabaseImport size={16} className="text-amber-600" /> 
            </div> 
          ) : ( 
            <img width={26} src={ImageConfig[ext] || ImageConfig['default']} alt={ext} className="shrink-0" /> 
          )}
          
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${doc.active ? 'text-gray-900' : (isMetaOnly ? 'text-gray-700' : 'text-gray-400')}`}> 
              {isMetaOnly ? `[Placeholder] ${doc.metaFileName || doc.name}` : doc.name} 
            </p>
            <div className="flex flex-wrap gap-2 mt-0.5">
              {doc.issueNo && ( <span className="text-[10px] text-blue-600 font-medium">Issue: {doc.issueNo}</span> )}
              {isMetaOnly && ( <span className="text-[10px] border border-amber-300 text-amber-700 bg-amber-50 px-1.5 rounded font-semibold italic">Awaiting File</span> )}
              {doc.superseding && !isMetaOnly && ( <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded font-semibold">Replaced</span> )}
              {doc.isReplacement && !doc.superseding && !isMetaOnly && ( <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded font-semibold">Replacement</span> )}
            </div>
          </div>
          
          <div className="flex gap-1 shrink-0">
            {!isMetaOnly && ( 
              <button onClick={() => onView(doc.name, doc.path, doc.id, doc.type, false)} disabled={actionsLoading} title="View" className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 transition-colors"> <IconEye size={13} /> </button> 
            )}
            <button onClick={() => onDetails(doc)} disabled={actionsLoading} title="Details" className="p-1.5 bg-sky-500 hover:bg-sky-600 rounded text-white disabled:opacity-50 transition-colors"> <IconAlignBoxCenterMiddle size={13} /> </button>
          </div>
        </div>
        
        {doc.editableDocument && (
          <div className="mt-2 pt-2 border-t border-dashed border-gray-200 flex justify-between items-center bg-blue-50/50 p-1.5 rounded" title={doc.editableDocument.name}>
            <span className="text-[10px] font-semibold text-blue-700 truncate mr-2">Ref: {doc.editableDocument.name}</span>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => {
                const folderPath = doc.editableDocument.path.substring(0, doc.editableDocument.path.lastIndexOf("/"));
                onView(doc.editableDocument.name, folderPath, doc.editableDocument.id, doc.editableDocument.name?.split('.').pop(), false);
              }} className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded hover:bg-sky-600 transition-colors">View</button>
              <button onClick={() => handleDownloadFile(doc.editableDocument.name, doc.editableDocument.path)} className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors">Download</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DocumentsSnapshotTable = (processData) => {
    const flatChains = processData.documentVersioning?.flatMap((group) => group.chains || []) || [];
    const snapshots = buildSopSnapshotTable({
      ...processData,
      documentVersioning: flatChains.map((chain) => ({
        ...chain,
        versions: chain.versions ? chain.versions.filter((v) => v.isSopDocument !== false) : [],
      })),
    });

    if (snapshots.length === 0) return null;

    return (
      <CustomCard className="mt-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Document Snapshots by SOP Version</h2>
        <div className="space-y-4 max-h-[600px] overflow-auto pr-1">
          {snapshots.map((snapshot, index) => {
            const isLatest = index === snapshots.length - 1;
            return (
              <div key={snapshot.reopenCycle} className={`border rounded-xl overflow-hidden ${isLatest ? 'border-green-300 shadow-sm' : 'border-gray-200'}`}>
                <div className={`flex items-center gap-4 px-4 py-2.5 ${isLatest ? 'bg-green-50' : 'bg-gray-50'} border-b ${isLatest ? 'border-green-200' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2"> <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Reopen Cycle</span> <span className={`text-sm font-bold px-2 py-0.5 rounded ${isLatest ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}> {snapshot.reopenCycle} </span> </div>
                  <div className="flex items-center gap-2"> <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Manual SOP</span> <span className={`text-sm font-semibold ${isLatest ? 'text-green-700' : 'text-gray-600'}`}> {snapshot.SOPIssueNo} </span> </div>
                  {isLatest && ( <span className="ml-auto text-xs font-bold bg-green-600 text-white px-2 py-0.5 rounded-full">Latest</span> )}
                </div>
                <div className="p-3">
                  {snapshot.sopEntries.length === 0 ? ( <p className="text-sm text-gray-400 text-center py-3">No SOP documents for this cycle</p> ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {snapshot.sopEntries.map((doc, idx) => ( <SopSnapshotDocCard key={`${doc.id}-${idx}`} doc={doc} onView={handleViewFile} onDetails={setDocumentModalOpen} actionsLoading={actionsLoading} /> ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CustomCard>
    );
  };

  const GetRecommendations = async () => { try { const response = await getRecommendations(); setRecommendations(response?.data?.recommendations); } catch (error) { console.error(error?.response?.data?.message || error?.message); } };
  const DeleteDocument = async (data) => { setActionsLoading(true); try { const res = await deleteDocumentInProcess(data); setProcess({ ...process, documentVersioning: res?.data?.documentVersioning, documents: res?.data?.documents, sededDocuments: res?.data?.sededDocuments }); toast.success(res?.data?.message || 'Document Deleted'); setOpenModal(''); } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setActionsLoading(false); } };

  useEffect(() => { fetchProcess(); GetRecommendations(); }, [id]);
  useEffect(() => { if (location.state?.openReopenModal && location.state?.reopenDraftId && !isReadOnly) { setAutoOpenReopenModal(true); setReopenDraftId(location.state.reopenDraftId); window.history.replaceState({}, document.title); } }, [location.state, isReadOnly]);
  useEffect(() => { if (autoOpenReopenModal && process && reopenDraftId && !isReadOnly) { setOpenModal('re-open'); setAutoOpenReopenModal(false); } }, [autoOpenReopenModal, process, reopenDraftId, isReadOnly]);

  if (loading) return <ComponentLoader />;
  if (error) return ( <CustomCard> <p className="text-lg font-semibold">Error: {error}</p> <div className="mt-4 flex space-x-4"> <CustomButton click={() => navigate('/processes/work')} text={'Go Back'} /> </div> </CustomCard> );
  if (!process) return ( <div className="text-center text-gray-500 py-10"> No process data available </div> );

  return (
    <div className="mx-auto">
      {actionsLoading && <TopLoader />}
      <CustomCard>
        {!isReadOnly && (
          <div className="flex justify-end flex-row gap-2 flex-wrap">
            <CustomButton variant={'primary'} text={'Re-Open'} className={'min-w-[150px]'} click={() => { if (reopenDraftInfo.draftId) { setOpenModal('re-open'); } else { setOpenModal('re-open'); setReopenDraftInfo(prev => ({ ...prev, shouldOpen: true })); } }} disabled={actionsLoading || !isCompleted || disableActions || isMigratedStep} />
            <CustomButton variant={'primary'} text={'Upload Document'} className={'min-w-[150px] hidden'} click={() => setOpenModal('document-upload')} disabled={actionsLoading || !isCompleted || disableActions || isMigratedStep} />
            <CustomButton variant={'primary'} text={'Claim'} className={'min-w-[150px]'} click={handleClaim} disabled={ disableActions || actionsLoading || isCompleted || process?.toBePicked === false } />
            <CustomButton variant={'secondary'} text={'Query'} className={'min-w-[150px]'} click={() => setOpenModal('query')} disabled={actionsLoading || isCompleted || (disableActions && !isMigratedStep)} />
            <CustomButton variant={'secondary'} text={'Ask Recommendation'} className={'min-w-[150px]'} click={() => setOpenModal('recommend')} disabled={actionsLoading || isCompleted || (disableActions && !isMigratedStep)} />
            <CustomButton variant={'secondary'} text={'Timeline'} click={() => navigate(`/timeline/${process?.processId}`)} className={'min-w-[150px]'} disabled={actionsLoading} />
            <CustomButton variant={'danger'} text={'Complete'} click={() => handleCompleteProcess(currentStepInstanceId)} className={'min-w-[150px]'} disabled={actionsLoading || isCompleted || process?.toBePicked === true || disableActions} />
          </div>
        )}
        {isReadOnly && ( <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded mb-4 text-sm font-medium flex items-center"> <IconInfoCircle size={18} className="mr-2" /> You are viewing this process in Read-Only mode. </div> )}
        <hr className="text-slate-200 my-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {processDetails.map((detail, index) => ( <div key={index} className="p-4 border border-slate-300 bg-zinc-50 rounded-lg shadow-sm"> <p className="font-semibold text-lg">{detail.label}</p> <p>{detail.value}</p> </div> ))}
        </div>
      </CustomCard>

      {process?.documents?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-green-600"></div>
            <span className="flex items-center gap-2 mx-4 text-sm text-green-700 uppercase tracking-wide font-semibold"> <IconFileText size={16} className="text-green-700" /> Active SOP Documents </span>
            <div className="flex-grow border-t border-green-600"></div>
          </div>
          <CustomButton disabled={selectedDocs.length === 0} className="ml-auto mb-4 block" text={`View All Selected (${selectedDocs.length})`} click={handleViewAllSelectedFiles} />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {process.documents.map((doc) => {
              const isSelected = selectedDocs.includes(doc.id);
              const toggleSelect = () => { setSelectedDocs((prev) => isSelected ? prev.filter((id) => id !== doc.id) : [...prev, doc.id], ); };
              const extension = doc.name?.split('.').pop()?.toLowerCase();
              const isMetaOnly = doc.isMetadataOnly && !doc.metadataFulfilledAt;

              return (
                <CustomCard key={doc.id} className="relative flex flex-col justify-between" title={isMetaOnly ? `${doc.metaFileName || doc.name}` : doc.name}>
                  <div className="absolute top-2 right-2">
                    {doc.rejectionDetails ? ( <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full shadow-sm">Rejected</span> ) : isMetaOnly ? ( <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shadow-sm">Metadata Only</span> ) : ( <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full shadow-sm">Active</span> )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3 w-full">
                      {!isMetaOnly && ( <input type="checkbox" className="mt-1 shrink-0" checked={isSelected} onChange={toggleSelect} /> )}
                      <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 border flex items-center justify-center"> {isMetaOnly ? ( <IconDatabaseImport size={22} className="text-amber-500" /> ) : ( <img width={28} src={ImageConfig[extension] || ImageConfig['default']} alt="icon" /> )} </div>
                      <div className="flex flex-col min-w-0 mr-9"> <p className="font-semibold text-gray-900 break-words"> {isMetaOnly ? `${doc.metaFileName || doc.name}${doc.metaFileExtension ? `.${doc.metaFileExtension}` : ''}` : doc.name} </p> <p className="text-sm text-gray-500"> Type: {isMetaOnly ? (doc.metaFileExtension || 'placeholder') : extension} </p> </div>
                    </div>
                  </div>
                  {doc.editableDocument && (
                    <div className="mt-2 bg-blue-50 border border-blue-100 p-2 rounded flex justify-between items-center" title={doc.editableDocument.name}>
                      <span className="text-xs text-blue-700 font-semibold truncate mr-2">Ref: {doc.editableDocument.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleViewRefFile(doc.editableDocument)} className="text-xs bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600 transition-colors">View</button>
                        <button onClick={() => handleDownloadFile(doc.editableDocument.name, doc.editableDocument.path)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">Download</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {!isMetaOnly && ( <CustomButton className="px-2" click={() => handleViewFile(doc.name, doc.path, doc.id, doc.type, false) } disabled={actionsLoading} title="View Document" text={<IconEye size={18} className="text-white" />} /> )}
                    {!isReadOnly && (
                      <>
                        <CustomButton variant="success" className="px-2" click={() => setRemarksModalOpen({ id: doc.id, open: 'sign' }) } disabled={ actionsLoading || doc?.signedBy?.find((entry) => entry?.signedBy == username) || doc?.type?.toUpperCase() !== 'PDF' || doc?.rejectionDetails || doc?.preApproved || disableActions || isMigratedStep || isMetaOnly } title="Sign Document" text={<IconCheck size={18} className="text-white" />} />
                        <CustomButton variant="danger" className="px-2" click={() => setRemarksModalOpen({ id: doc.id, open: 'reject' }) } disabled={ actionsLoading || isCompleted || doc.rejectionDetails || doc?.preApproved || disableActions || isMigratedStep || isMetaOnly } title="Reject Document" text={<IconX size={18} className="text-white" />} />
                      </>
                    )}
                    <CustomButton variant="info" className="px-2" click={() => setDocumentModalOpen(doc)} disabled={actionsLoading} title="Details" text={<IconAlignBoxCenterMiddle size={18} className="text-white" />} />
                    {!isReadOnly && ( <CustomButton variant="danger" className="px-2" click={() => setOpenModal({ documentId: doc.id, documentName: doc.name, modal: 'delete-confirmation', }) } disabled={ actionsLoading || !isCompleted || disableActions || isMigratedStep } title="Delete" text={<IconTrash size={18} className="text-white" />} /> )}
                  </div>
                </CustomCard>
              );
            })}
          </div>
        </>
      )}

      {process?.nonSopDocuments?.length > 0 && (
        <>
          <div className="flex items-center mt-8 mb-2">
            <div className="flex-grow border-t border-gray-400"></div>
            <span className="flex items-center gap-2 mx-4 text-sm text-gray-600 uppercase tracking-wide font-semibold"> <IconFileText size={16} className="text-gray-600" /> Non-SOP Documents </span>
            <div className="flex-grow border-t border-gray-400"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {process.nonSopDocuments.map((doc) => {
              const extension = doc.name?.split('.').pop()?.toLowerCase();
              return (
                <CustomCard key={doc.id} className="relative flex flex-col justify-between" title={doc.name}>
                  <div className="absolute top-2 right-2"> <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full shadow-sm">Non-SOP</span> </div>
                  <div className="flex items-start gap-3 w-full">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 border flex items-center justify-center"> <img width={28} src={ImageConfig[extension] || ImageConfig['default']} alt="icon" /> </div>
                    <div className="flex flex-col min-w-0 mr-9"> <p className="font-semibold text-gray-900 break-words">{doc.name}</p> <p className="text-sm text-gray-500">Type: {extension}</p> </div>
                  </div>
                  {doc.editableDocument && (
                    <div className="mt-2 bg-blue-50 border border-blue-100 p-2 rounded flex justify-between items-center" title={doc.editableDocument.name}>
                      <span className="text-xs text-blue-700 font-semibold truncate mr-2">Ref: {doc.editableDocument.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleViewRefFile(doc.editableDocument)} className="text-xs bg-sky-500 text-white px-2 py-1 rounded hover:bg-sky-600 transition-colors">View</button>
                        <button onClick={() => handleDownloadFile(doc.editableDocument.name, doc.editableDocument.path)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">Download</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <CustomButton className="px-2" click={() => handleViewFile(doc.name, doc.path, doc.id, doc.type, false)} disabled={actionsLoading} title="View Document" text={<IconEye size={18} className="text-white" />} />
                    <CustomButton variant="info" className="px-2" click={() => setDocumentModalOpen(doc)} disabled={actionsLoading} title="Details" text={<IconAlignBoxCenterMiddle size={18} className="text-white" />} />
                  </div>
                </CustomCard>
              );
            })}
          </div>
        </>
      )}

      {process && DocumentsSnapshotTable(process)}

      {documentModalOpen ? (
        <CustomModal isOpen={!!documentModalOpen} onClose={() => setDocumentModalOpen(false)} className={'max-h-[99vh] overflow-auto'}>
          <div className="space-y-8 text-sm text-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Document Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <DetailItem label="Name" value={documentModalOpen?.name || '--'} />
              <DetailItem label="Description" value={documentModalOpen?.description || '--'} />
              <DetailItem label="Created At" value={documentModalOpen?.createdAt ? new Date(documentModalOpen?.createdAt).toLocaleString() : '--'} />
              <DetailItem label="Issue No" value={documentModalOpen?.issueNo || '--'} />
              <DetailItem label="Process SOP" value={documentModalOpen?.SOPIssueNo || '--'} />
              <DetailItem label="Prev-approved" value={documentModalOpen?.preApproved ? 'Yes' : 'No'} />
              <DetailItem label="Part-Number" value={documentModalOpen?.partNumber || '--'} />
              <DetailItem label="Type" value={documentModalOpen?.type?.toUpperCase() || '--'} />
              <DetailItem label="Tags" value={documentModalOpen?.tags?.flat()?.join(', ') || '--'} />
              <DetailItem label="Approval Count" value={documentModalOpen?.approvalCount || '--'} />
              {documentModalOpen?.isMetadataOnly !== undefined && ( <DetailItem label="Metadata Only" value={documentModalOpen?.isMetadataOnly ? 'Yes' : 'No'} /> )}
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900 border-b pb-1">Signed By</h3>
              {documentModalOpen?.signedBy?.length > 0 ? (
                <ul className="list-disc list-inside space-y-2 pl-2 text-gray-700">
                  {documentModalOpen?.signedBy?.map((entry, idx) => (
                    <li key={idx}>
                      <div><span className="font-medium">{entry.signedBy}</span> <span className="text-gray-600">({new Date(entry.signedAt).toLocaleString()})</span></div>
                      {entry.remarks && ( <div className="ml-4 italic text-gray-600">Remarks: {entry.remarks}</div> )}
                    </li>
                  ))}
                </ul>
              ) : ( <span className="text-gray-500">—</span> )}
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900 border-b pb-1">Rejection Details</h3>
              {documentModalOpen?.rejectionDetails ? (
                <div className="space-y-1 pl-1">
                  <p><span className="font-semibold">Rejected By:</span> {documentModalOpen?.rejectionDetails.rejectedBy}</p>
                  <p><span className="font-semibold">Reason:</span> {documentModalOpen?.rejectionDetails.rejectionReason}</p>
                  <p><span className="font-semibold">Rejected At:</span> {new Date(documentModalOpen?.rejectionDetails.rejectedAt).toLocaleString()}</p>
                </div>
              ) : ( <span className="text-gray-500">—</span> )}
            </div>
          </div>
        </CustomModal>
      ) : null}

      {process?.sededDocuments?.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center mb-4">
            <div className="flex-grow border-t border-rose-400"></div>
            <span className="mx-4 text-sm text-rose-600 uppercase tracking-wide font-semibold"> Superseded Documents </span>
            <div className="flex-grow border-t border-rose-400"></div>
          </div>

          <div className="space-y-6">
            {process?.sededDocuments.map((docGroup, index) => {
              const ext = docGroup?.documentWhichSuperseded?.name?.split('.').pop()?.toLowerCase();
              return (
                <CustomCard key={index} className="relative border !border-rose-300 !bg-rose-50 shadow-sm p-4" title={docGroup.documentWhichSuperseded.name}>
                  <div className="absolute bottom-2 right-2">
                    <span className="text-xs border bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full"> Superseded </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center text-rose-700 text-xl">
                        <img width={30} src={ImageConfig[ext] || ImageConfig['default']} alt="icon" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 break-words"> {docGroup.documentWhichSuperseded.name} </p>
                        <p className="text-sm text-gray-500"> {docGroup.documentWhichSuperseded.path} </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <CustomButton className="px-2" click={() => handleViewFile( docGroup.documentWhichSuperseded.name, docGroup.documentWhichSuperseded.path, docGroup.documentWhichSuperseded.id, docGroup.documentWhichSuperseded.type, ) } title="View Document" text={<IconEye size={18} className="text-white" />} />
                      <CustomButton variant="info" className="px-2" click={() => setDocumentModalOpen(docGroup.documentWhichSuperseded)} disabled={actionsLoading} title="Details" text={<IconAlignBoxCenterMiddle size={18} className="text-white" />} />
                    </div>
                  </div>
                  
                  {docGroup.documentWhichSuperseded.editableDocument && (
                    <div className="mt-2 pt-2 border-t border-dashed border-rose-300 flex justify-between items-center bg-white/50 p-2 rounded" title={docGroup.documentWhichSuperseded.editableDocument.name}>
                      <span className="text-[10px] font-semibold text-rose-700 truncate mr-2">Ref: {docGroup.documentWhichSuperseded.editableDocument.name}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleViewRefFile(docGroup.documentWhichSuperseded.editableDocument)} className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded hover:bg-sky-600 transition-colors">View</button>
                        <button onClick={() => handleDownloadFile(docGroup.documentWhichSuperseded.editableDocument.name, docGroup.documentWhichSuperseded.editableDocument.path)} className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded hover:bg-rose-700 transition-colors">Download</button>
                      </div>
                    </div>
                  )}

                  {docGroup.versions.length > 0 && (
                    <div className="mt-4 pl-5 border-l-2 border-dashed border-rose-300">
                      <p className="text-sm font-medium text-gray-600 mb-2">Version History:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {docGroup.versions.map((ver) => {
                          const prevExt = ver.name?.split('.').pop()?.toLowerCase();
                          return (
                            <CustomCard key={ver.id} className="flex flex-col justify-between" title={ver.name}>
                              <div className="flex gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"> <img width={24} src={ImageConfig[prevExt] || ImageConfig['default']} alt="icon" /> </div>
                                <div className="min-w-0"> <p className="text-sm font-medium text-gray-800 break-words">{ver.name}</p> <p className="text-xs text-gray-500 truncate max-w-full">{ver.path}</p> </div>
                              </div>
                              {ver.editableDocument && (
                                <div className="mb-2 pt-2 border-t border-dashed border-gray-200 flex justify-between items-center bg-slate-50 p-1.5 rounded" title={ver.editableDocument.name}>
                                  <span className="text-[10px] font-semibold text-slate-600 truncate mr-2">Ref: {ver.editableDocument.name}</span>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => handleViewRefFile(ver.editableDocument)} className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded hover:bg-sky-600 transition-colors">View</button>
                                    <button onClick={() => handleDownloadFile(ver.editableDocument.name, ver.editableDocument.path)} className="text-[10px] bg-slate-500 text-white px-2 py-0.5 rounded hover:bg-slate-600 transition-colors flex-shrink-0">Download</button>
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-2 justify-end mt-auto">
                                <CustomButton className="px-2" variant="info" size="xs" click={() => handleViewFile(ver.name, ver.path, ver.id, prevExt)} title="View Document" text={<IconEye size={16} className="text-white" />} />
                                <CustomButton variant="info" className="px-2" click={() => setDocumentModalOpen(ver)} disabled={actionsLoading} title="Details" text={<IconAlignBoxCenterMiddle size={18} className="text-white" />} />
                              </div>
                            </CustomCard>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CustomCard>
              );
            })}
          </div>
        </div>
      )}

      {process?.queryDetails?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-slate-400"></div>
            <span className="mx-4 text-sm text-gray-500 uppercase tracking-wide font-medium">Queries</span>
            <div className="flex-grow border-t border-slate-400"></div>
          </div>
          <div className="mt-2">
            <div className="space-y-4">
              {process?.queryDetails?.map((query, index) => (
                <CustomCard key={index}>
                  <div className="space-y-1">
                    {query.stepName && ( <p className="text-sm text-gray-700"> <span className="font-semibold">Step Name:</span> {query.stepName} </p> )}
                    {query.stepNumber && ( <p className="text-sm text-gray-700"> <span className="font-semibold">Step Number:</span> {query.stepNumber} </p> )}
                    {query.status && ( <p className="text-sm text-gray-700"> <span className="font-semibold">Status:</span> {query.status} </p> )}
                    {query.taskType && ( <p className="text-sm text-gray-700"> <span className="font-semibold">Task Type:</span> {query.taskType} </p> )}
                    {query.queryText && ( <p className="text-sm text-gray-700"> <span className="font-semibold">Query Text:</span> {query.queryText} </p> )}
                    {query.createdAt && ( <p className="text-sm text-gray-700"> <span className="font-semibold">Created At:</span>{' '} {new Date(query.createdAt).toLocaleString()} </p> )}
                  </div>
                  {!isReadOnly && (
                    <div className="mt-4 flex justify-end">
                      <CustomButton disabled={actionsLoading || isCompleted || (disableActions && !isMigratedStep)} text="Solve Query" variant="primary" click={() => handleSolveQuery(query)} />
                    </div>
                  )}
                </CustomCard>
              ))}
            </div>
          </div>
        </>
      )}

      {process?.recommendationDetails?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-slate-400"></div>
            <span className="mx-4 text-sm text-gray-500 uppercase tracking-wide font-medium">Recommendations</span>
            <div className="flex-grow border-t border-slate-400"></div>
          </div>
          <div className="mt-2 space-y-4">
            {process?.recommendationDetails?.map((rec, index) => (
              <CustomCard key={rec.recommendationId || index}>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="font-semibold">Step:</span> {rec.stepName} (#{rec.stepNumber})</p>
                  <p><span className="font-semibold">Status:</span> {rec.status}</p>
                  <p><span className="font-semibold">Initiator:</span> {rec.initiatorName}</p>
                  <p><span className="font-semibold">Recommender:</span> {rec.recommenderName}</p>
                  <p><span className="font-semibold">Recommendation:</span> {rec.recommendationText}</p>
                  {rec.responseText && ( <p><span className="font-semibold">Response:</span> {rec.responseText}</p> )}
                  <p> <span className="font-semibold">Created At:</span>{' '} {new Date(rec.createdAt).toLocaleString()} </p>
                  {rec.respondedAt && ( <p> <span className="font-semibold">Responded At:</span>{' '} {new Date(rec.respondedAt).toLocaleString()} </p> )}
                  {rec.documentDetails?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Attached Documents:</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                          <thead className="bg-slate-100">
                            <tr> <th className="border px-3 py-2 text-left">Document Name</th> <th className="border px-3 py-2 text-left">Query Text</th> <th className="border px-3 py-2 text-left">Answer Text</th> </tr>
                          </thead>
                          <tbody>
                            {rec.documentDetails.map((doc) => ( <tr key={doc.documentId}> <td className="border px-3 py-2">{doc.documentName}</td> <td className="border px-3 py-2">{doc.queryText || '-'}</td> <td className="border px-3 py-2">{doc.answerText || '-'}</td> </tr> ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </CustomCard>
            ))}
          </div>
        </>
      )}

      <CustomModal isOpen={openModal == 'query'} onClose={() => { setOpenModal(''); setExistingQuery(null); }} className={'max-h-[95vh] overflow-auto max-w-lg w-full'}> <Query workflowId={process?.workflow?.id} processId={process?.processId} storagePath={process?.processStoragePath} steps={process?.steps} close={() => { setOpenModal(''); setExistingQuery(null); }} stepInstanceId={currentStepInstanceId} documents={process?.documents} /> </CustomModal>
      <CustomModal isOpen={openModal == 'version-wise'} onClose={() => { setOpenModal(''); }} className={'max-h-[95vh] overflow-auto max-w-lg w-full'}> <DocumentsVersionWise processId={process?.processId} close={() => setOpenModal('')} /> </CustomModal>
      <CustomModal isOpen={openModal == 'document-upload'} onClose={() => { setOpenModal(''); }} className={'max-h-[95vh] overflow-auto max-w-lg w-full'}> <ProcessDocumentUpload processId={process?.processId} workflowId={process?.workflow?.id} issueNo={process?.issueNo} onFinish={(data) => { setProcess({ ...process, documentVersioning: data.documentVersioning, documents: data.documents, sededDocuments: data.sededDocuments, }); setOpenModal(''); }} /> </CustomModal>
      <CustomModal isOpen={existingQuery} onClose={() => { setExistingQuery(null); }} className={'max-h-[95vh] overflow-auto max-w-lg w-full'}> <QuerySolve workflowId={process?.workflow?.id} processId={process?.processId} storagePath={process?.processStoragePath} close={() => { setExistingQuery(null); }} stepInstanceId={currentStepInstanceId} queryRaiserStepInstanceId={process?.queryDetails[0]?.stepInstanceId} existingQuery={existingQuery} /> </CustomModal>
      <CustomModal isOpen={openModal == 'recommend'} onClose={() => { setOpenModal(''); }} className={'max-h-[95vh] overflow-auto max-w-lg w-full'}> <AskRecommend processId={process?.processId} close={() => { setOpenModal(''); }} stepInstanceId={currentStepInstanceId} documents={process?.documents} /> </CustomModal>
      <CustomModal isOpen={openModal == 're-open'} onClose={() => { setOpenModal(''); }} className={'max-h-[95vh] overflow-auto max-w-2xl w-full'}> <ReOpenProcessModal workflowId={process?.workflow?.id} processId={process?.processId} storagePath={process?.processStoragePath} close={() => { setOpenModal(''); fetchProcess(); }} documents={process?.documents || []} draftId={reopenDraftInfo.draftId} onDraftSaved={(draftId) => { setReopenDraftInfo(prev => ({ ...prev, draftId: draftId })); sessionStorage.setItem('reopenDraftData', JSON.stringify({ processId: process.processId, draftId: draftId, timestamp: Date.now() })); }} onDraftSubmitted={() => { setReopenDraftInfo({ draftId: null, shouldOpen: false, fromDraftedList: false }); sessionStorage.removeItem('reopenDraftData'); }} /> </CustomModal>

      <RemarksModal open={remarksModalOpen.open === 'sign'} title="Sign Remarks" onClose={() => setRemarksModalOpen({ id: null, open: false })} loading={actionsLoading} onSubmit={(remarks) => handleSignDocument(remarks)} showPassField={false} />
      <RemarksModal open={remarksModalOpen.open === 'reject'} title="Reject Remarks" onClose={() => setRemarksModalOpen({ id: null, open: false })} loading={actionsLoading} onSubmit={(remarks) => handleRejectDocument(remarks)} />
      <DeleteConfirmationModal isOpen={openModal.modal == 'delete-confirmation'} onClose={() => setOpenModal('')} onConfirm={() => DeleteDocument({ documentId: openModal.documentId, processId: process?.processId, }) } isLoading={actionsLoading} deactive={false} documentName={openModal.documentName} />
      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}
    </div>
  );
};

export default ViewProcess;