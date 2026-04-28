import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { uploadDocumentInProcess, ReOpenProcess, GenerateDocumentName, GetDraftForEditing, SaveOrUpdateDraft, SubmitDraft, deleteDraft, } from '../../../common/Apis';
import { toast } from 'react-toastify';
import { IconSquarePlus, IconSquareX, IconEye, IconDatabaseImport, IconTrash, IconFileText, IconX, IconCheck, IconAlertCircle, IconInfoCircle, IconArrowRight, } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopLoader from '../../../common/Loader/TopLoader';

const InputClass = 'w-full border border-gray-300 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors shadow-sm';
const LabelClass = 'block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider';

export default function ReOpenProcessModal({ workflowId, processId, documents = [], close, storagePath, draftId: initialDraftId, onDraftSaved, onDraftSubmitted, }) {
  const navigate = useNavigate();
  const fileInputRefs = useRef({});
  const metaFileInputRefs = useRef({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(initialDraftId || null);
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [selectedOldDocumentDetails, setSelectedOldDocumentDetails] = useState({});
  const [metadataFulfillments, setMetadataFulfillments] = useState({});

  const metadataOnlyDocs = documents.filter((d) => d.isMetadataOnly && !d.metadataFulfilledAt);
  const regularDocs = documents.filter((d) => !d.isMetadataOnly);

  const { control, handleSubmit, register, watch, setValue, getValues, formState: { isSubmitting, errors }, } = useForm({ defaultValues: { processId, issueNo: '', supersededDocuments: [], }, });
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'supersededDocuments', });
  const [newTags, setNewTags] = useState({});
  const [metaTags, setMetaTags] = useState({}); // For metadata fulfillment tags

  useEffect(() => { if (initialDraftId && !draftLoaded) { loadDraftForEdit(initialDraftId); } }, [initialDraftId, draftLoaded]);

  const loadDraftForEdit = async (id) => {
    setLoading(true);
    try {
      const response = await GetDraftForEditing(id);
      const { type, draftId: fetchedDraftId, formData } = response.data;
      if (type !== 'REOPEN') { toast.error('This is not a reopen draft'); return; }
      if (formData.supersededDocuments?.length > 0) { replace(formData.supersededDocuments); }
      setValue('processId', formData.processId); setValue('issueNo', formData.issueNo);
      setCurrentDraftId(fetchedDraftId); setIsEditMode(true); setDraftLoaded(true);
      const tagInputs = {};
      formData.supersededDocuments?.forEach((doc, index) => { if (doc.tags && doc.tags.length > 0) { tagInputs[index] = ''; } });
      setNewTags(tagInputs);
      toast.success('Draft loaded successfully');
    } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setLoading(false); }
  };

  const handleUpload = async (file, index) => {
    if (!file) return;
    const row = getValues(`supersededDocuments.${index}`);
    const extension = file.name.split('.').pop();
    try {
      let finalFileName = '';
      if (row.preApproved) {
        if (!row.uploadedFileName) { toast.warning('Enter filename for pre-approved document'); return; }
        finalFileName = row.uploadedFileName.includes('.') ? row.uploadedFileName : `${row.uploadedFileName}.${extension}`;
      } else {
        const res = await GenerateDocumentName(workflowId, row.isNewDocument ? null : row.oldDocumentId, extension);
        finalFileName = res?.data?.documentName;
      }
      const uploadRes = await uploadDocumentInProcess([file], finalFileName, [], storagePath);
      setValue(`supersededDocuments.${index}.newDocumentId`, uploadRes[0]);
      setValue(`supersededDocuments.${index}.uploadedFileName`, finalFileName);
      toast.success('Document uploaded successfully');
    } catch (err) { toast.error(err?.response?.data?.message || err.message); }
  };

  // ✅ FIX: Separate upload function for the reference file in standard documents
  const handleRefUpload = async (file, index) => {
    if (!file) return;
    const mainFileName = watch(`supersededDocuments.${index}.uploadedFileName`);
    if (!mainFileName) { toast.warning('Please upload the main file first.'); return; }
    try {
      const refExt = file.name.split('.').pop();
      const baseName = mainFileName.substring(0, mainFileName.lastIndexOf('.'));
      const refName = `${baseName}_reference.${refExt}`;
      const uploadRes = await uploadDocumentInProcess([file], refName, [], storagePath);
      setValue(`supersededDocuments.${index}.editableDocumentId`, uploadRes[0]);
      toast.success('Editable reference uploaded successfully');
    } catch (err) { toast.error(err?.message || 'Error uploading reference'); }
  };

  const handleMetaFulfillmentUpload = async (file, metaDoc) => {
    if (!file) return;
    const pdId = metaDoc.processDocumentId || metaDoc.id;
    setMetadataFulfillments((prev) => ({ ...prev, [pdId]: { ...prev[pdId], uploading: true }, }));
    try {
      const extension = file.name.split('.').pop();
      const res = await GenerateDocumentName(workflowId, null, extension);
      const finalFileName = res?.data?.documentName;
      const uploadRes = await uploadDocumentInProcess([file], finalFileName, [], storagePath);
      setMetadataFulfillments((prev) => ({ 
        ...prev, 
        [pdId]: { 
          ...prev[pdId], 
          newDocumentId: uploadRes[0], 
          fileName: finalFileName, 
          uploading: false, 
          metadataProcessDocumentId: pdId,
          description: metaDoc.description || '',
          issueNo: metaDoc.issueNo || '',
          partNumber: metaDoc.partNumber || '',
          tags: metaDoc.tags || []
        }, 
      }));
      toast.success(`File ready for: ${metaDoc.name || metaDoc.metaFileName}`);
    } catch (err) { setMetadataFulfillments((prev) => ({ ...prev, [pdId]: { ...prev[pdId], uploading: false }, })); toast.error(err?.message); }
  };

  const handleMetaFulfillmentRefUpload = async (file, metaDoc) => {
    if (!file) return;
    const pdId = metaDoc.processDocumentId || metaDoc.id;
    const fulfillment = metadataFulfillments[pdId];
    if (!fulfillment?.fileName) { toast.warning('Please upload the main file first.'); return; }
    try {
      const refExt = file.name.split('.').pop();
      const baseName = fulfillment.fileName.substring(0, fulfillment.fileName.lastIndexOf('.'));
      const refName = `${baseName}_reference.${refExt}`;
      const refUploadRes = await uploadDocumentInProcess([file], refName, [], storagePath);
      setMetadataFulfillments((prev) => ({ ...prev, [pdId]: { ...prev[pdId], editableDocumentId: refUploadRes[0] } }));
      toast.success('Editable reference uploaded successfully');
    } catch (err) { toast.error(err?.message || 'Error uploading reference'); }
  };

  const handleMetaOnlyRefUpload = async (file, index) => {
    if (!file) return;
    const metaFileName = watch(`supersededDocuments.${index}.metaFileName`);
    if (!metaFileName) { toast.warning('Please enter the Intended File Name first.'); return; }
    try {
      const extension = file.name.split('.').pop();
      const refName = `${metaFileName}_reference.${extension}`;
      const uploadRes = await uploadDocumentInProcess([file], refName, [], storagePath);
      setValue(`supersededDocuments.${index}.editableDocumentId`, uploadRes[0]);
      toast.success('Editable reference uploaded successfully');
    } catch (err) { toast.error(err?.response?.data?.message || err.message); }
  };

  const removeFulfillment = (pdId) => {
    setMetadataFulfillments((prev) => { const next = { ...prev }; delete next[pdId]; return next; });
    if (metaFileInputRefs.current[pdId]) { metaFileInputRefs.current[pdId].value = ''; }
  };

  const addMetaTag = (pdId) => {
    if (!metaTags[pdId]?.trim()) return;
    setMetadataFulfillments(prev => ({
      ...prev, [pdId]: { ...prev[pdId], tags: [...(prev[pdId]?.tags || []), metaTags[pdId].trim()] }
    }));
    setMetaTags(prev => ({ ...prev, [pdId]: '' }));
  };

  const viewOldDocumentDetails = (documentId, index) => {
    const document = documents.find((doc) => doc.id === parseInt(documentId));
    if (document) { setSelectedOldDocumentDetails({ [index]: { id: document.id, name: document.name, description: document.description, issueNo: document.issueNo, signedBy: document.signedBy || [], rejectionDetails: document.rejectionDetails, tags: document.tags || [], type: document.type, }, }); }
  };

  const handleSaveDraft = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, saveAsDraft: true, draftId: currentDraftId, type: 'REOPEN', workflowId, storagePath, };
      const res = await SaveOrUpdateDraft(payload);
      toast.success(res?.data?.message || 'Draft saved successfully');
      setCurrentDraftId(res?.data?.draftId); setIsEditMode(true);
      if (onDraftSaved) onDraftSaved(res?.data?.draftId);
      navigate('/processes/drafted');
    } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setLoading(false); }
  };

  const handleSubmitImmediately = async (data) => {
    const fulfillmentList = Object.values(metadataFulfillments).filter((f) => f.newDocumentId);
    const hasFulfillments = fulfillmentList.length > 0;
    const hasSuperseded = data.supersededDocuments.length > 0;

    if (!hasFulfillments && !hasSuperseded) { toast.warning('Please add at least one superseded document or fulfill a metadata entry.'); return; }
    for (const d of data.supersededDocuments) {
      if (d.isMetadataOnly) { if (!d.metaFileName) { toast.warning('Please provide a filename for metadata-only entries.'); return; } } else {
        if (!d.uploadedFileName || !d.newDocumentId) { toast.warning('Please upload all required documents.'); return; }
        if (!d.isNewDocument && !d.oldDocumentId) { toast.warning('Please select the document to replace for all replacement entries.'); return; }
      }
    }

    setLoading(true);
    try {
      await ReOpenProcess({
        processId, issueNo: data.issueNo,
        supersededDocuments: data.supersededDocuments.map((d) => ({
          isNewDocument: d.isNewDocument, preApproved: d.preApproved, oldDocumentId: d.isNewDocument || d.isMetadataOnly ? null : Number(d.oldDocumentId), newDocumentId: d.newDocumentId || null, reasonOfSupersed: d.reasonOfSupersed, issueNo: d.issueNo, partNumber: d.partNumber, fileDescription: d.fileDescription, tags: d.tags, uploadedFileName: d.uploadedFileName, isSopDocument: d.isSopDocument !== false, isMetadataOnly: d.isMetadataOnly || false, metaFileName: d.metaFileName, metaFileExtension: d.metaFileExtension, editableDocumentId: d.editableDocumentId || null
        })),
        metadataFulfillments: fulfillmentList.map((f) => ({ 
          metadataProcessDocumentId: f.metadataProcessDocumentId, 
          newDocumentId: f.newDocumentId, 
          editableDocumentId: f.editableDocumentId || null,
          description: f.description,
          issueNo: f.issueNo,
          partNumber: f.partNumber,
          tags: f.tags
        })),
      });
      if (currentDraftId) await deleteDraft({ draftId: currentDraftId }).catch(e=>e);
      if (onDraftSubmitted) onDraftSubmitted();
      toast.success('Process reopened successfully'); close(); window.location.reload();
    } catch (error) { toast.error(error?.response?.data?.message || error?.message); } finally { setLoading(false); }
  };

  const addTag = (index, tag) => { if (!tag.trim()) return; const currentTags = watch(`supersededDocuments.${index}.tags`) || []; setValue(`supersededDocuments.${index}.tags`, [...currentTags, tag.trim()]); setNewTags((prev) => ({ ...prev, [index]: '' })); };
  const removeTag = (index, tagIndex) => { const currentTags = watch(`supersededDocuments.${index}.tags`) || []; setValue(`supersededDocuments.${index}.tags`, currentTags.filter((_, i) => i !== tagIndex)); };

  const appendNewEntry = (isMetaOnly = false) => {
    append({ isNewDocument: false, preApproved: false, oldDocumentId: '', newDocumentId: '', uploadedFileName: '', reasonOfSupersed: '', issueNo: '', partNumber: '', fileDescription: '', tags: [], isSopDocument: true, isMetadataOnly: isMetaOnly, metaFileName: '', metaFileExtension: 'pdf', editableDocumentId: null });
  };

  const watchedDocs = watch('supersededDocuments') || [];
  const selectedOldDocIds = watchedDocs.filter((d) => !d.isNewDocument && !d.isMetadataOnly && d.oldDocumentId).map((d) => parseInt(d.oldDocumentId));

  return (
    <>
      {loading && <TopLoader />}
      <div className="max-h-[85vh] overflow-y-auto p-2">
        <form onSubmit={handleSubmit(handleSubmitImmediately)} className="space-y-6">
          
          <div className="flex justify-between items-center border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Reopen Draft' : 'Reopen Process'}</h2>
            <div className="flex items-center gap-3">
              {isEditMode && (<span className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-bold shadow-sm">Draft #{currentDraftId?.substring(0, 8)}</span>)}
              <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"><IconX size={20}/></button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
            <label className={LabelClass}>Process SOP Issue / Revision No *</label>
            <input {...register('issueNo', { required: 'Required' })} className={InputClass} placeholder="e.g. SOP-REV-02" />
            {errors.issueNo && (<p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.issueNo.message}</p>)}
          </div>

          {metadataOnlyDocs.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-amber-100 border-b border-amber-200 flex items-center gap-3">
                <IconDatabaseImport size={22} className="text-amber-700" />
                <h3 className="font-bold text-amber-900 text-base">Fulfill Pending Metadata Documents ({metadataOnlyDocs.length})</h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-amber-800 bg-white border border-amber-200 rounded-lg p-4 font-medium shadow-sm"><strong>How this works:</strong> These documents were added as metadata-only placeholders. When you upload a file here, the placeholder is replaced with the actual file.</p>
                {metadataOnlyDocs.map((metaDoc) => {
                  const pdId = metaDoc.processDocumentId || metaDoc.id; const fulfillment = metadataFulfillments[pdId];
                  return (
                    <div key={pdId} className={`rounded-xl border p-5 bg-white transition-all shadow-sm ${fulfillment?.newDocumentId ? 'border-green-300 bg-green-50' : 'border-amber-200'}`}>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-900 text-base flex items-center gap-2"><IconFileText size={20} className="text-amber-600 shrink-0" /><span className="truncate">{metaDoc.metaFileName ? `${metaDoc.metaFileName}.${metaDoc.metaFileExtension || 'file'}` : metaDoc.name}</span></p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 font-medium">
                            <span className={`font-bold ${metaDoc.isSopDocument !== false ? 'text-green-700' : 'text-gray-600'}`}>{metaDoc.isSopDocument !== false ? '● SOP Document' : '● NON-SOP Document'}</span>
                          </div>
                        </div>
                        <div className="shrink-0">{fulfillment?.newDocumentId ? (<span className="inline-flex items-center gap-1.5 text-sm bg-green-100 text-green-800 border border-green-200 px-3 py-1.5 rounded-full font-bold shadow-sm"><IconCheck size={16} /> Ready for Submission</span>) : (<span className="inline-flex items-center gap-1.5 text-sm bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full font-bold shadow-sm"><IconAlertCircle size={16} /> Awaiting File Upload</span>)}</div>
                      </div>
                      
                      {fulfillment?.newDocumentId ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4 bg-green-100 border border-green-300 rounded-xl px-4 py-3 shadow-inner">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-green-900 uppercase tracking-wider mb-1">File Uploaded successfully</p>
                              <p className="text-sm font-semibold text-green-800 truncate">{fulfillment.fileName}</p>
                            </div>
                            <button type="button" onClick={() => removeFulfillment(pdId)} className="shrink-0 text-red-600 bg-white border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">Change File</button>
                          </div>
                          
                          {/* ✅ UPDATE METADATA FIELDS */}
                          <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div><label className={LabelClass}>Part / Doc Number</label><input value={fulfillment.partNumber || ''} onChange={(e) => setMetadataFulfillments(prev => ({...prev, [pdId]: {...prev[pdId], partNumber: e.target.value}}))} className={InputClass} /></div>
                              <div><label className={LabelClass}>Issue / Revision No</label><input value={fulfillment.issueNo || ''} onChange={(e) => setMetadataFulfillments(prev => ({...prev, [pdId]: {...prev[pdId], issueNo: e.target.value}}))} className={InputClass} /></div>
                            </div>
                            <div><label className={LabelClass}>Brief Description</label><input value={fulfillment.description || ''} onChange={(e) => setMetadataFulfillments(prev => ({...prev, [pdId]: {...prev[pdId], description: e.target.value}}))} className={InputClass} /></div>
                            <div>
                               <label className={LabelClass}>Tags</label>
                               <div className="flex gap-2">
                                  <input value={metaTags[pdId] || ''} onChange={(e) => setMetaTags(prev => ({...prev, [pdId]: e.target.value}))} onKeyDown={(e) => { if(e.key==='Enter'){ e.preventDefault(); addMetaTag(pdId); } }} className={InputClass} placeholder="Add tag..." />
                                  <button type="button" onClick={() => addMetaTag(pdId)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold">Add</button>
                               </div>
                               {fulfillment.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">{fulfillment.tags.map((t, i) => <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold cursor-pointer" onClick={() => setMetadataFulfillments(prev => ({...prev, [pdId]: {...prev[pdId], tags: prev[pdId].tags.filter((_, idx)=>idx!==i)}}))}>{t} <IconX size={12}/></span>)}</div>
                               )}
                            </div>
                          </div>

                          {metaDoc.isSopDocument !== false && (
                            <div className="p-4 bg-white border border-blue-200 rounded-xl shadow-sm">
                              <label className={LabelClass}>Attach Editable Reference Document (Optional)</label>
                              <p className="text-xs text-gray-500 mb-3 font-medium">Upload the original source file (e.g. Word doc) that this PDF was generated from.</p>
                              <div className="flex flex-col gap-2">
                                <input type="file" onChange={(e) => handleMetaFulfillmentRefUpload(e.target.files[0], metaDoc)} className="text-sm w-full border border-gray-200 p-2 rounded-lg file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer" />
                                {fulfillment.editableDocumentId && (
                                  <span className="text-xs text-green-700 font-bold flex items-center gap-1.5 bg-green-50 p-2 rounded-lg border border-green-200 w-fit"><IconCheck size={16}/> Reference File Attached Successfully</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Upload the actual file</label>
                          <input type="file" ref={(el) => (metaFileInputRefs.current[pdId] = el)} disabled={fulfillment?.uploading} onChange={(e) => { if (e.target.files[0]) handleMetaFulfillmentUpload(e.target.files[0], metaDoc); }} className="w-full text-sm border border-gray-300 rounded-lg p-2 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 file:cursor-pointer file:transition-colors cursor-pointer" />
                          {fulfillment?.uploading && (<p className="text-sm font-bold text-blue-600 mt-2 flex items-center gap-2 animate-pulse"><IconAlertCircle size={16}/> Uploading to server...</p>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {fields.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4 bg-blue-50 border-b border-blue-200"><h3 className="font-bold text-blue-900 text-base flex items-center gap-2"><IconSquarePlus size={20}/> New / Superseded Documents ({fields.length})</h3></div>
              <div className="p-5 space-y-6 bg-gray-50/50">
                {fields.map((field, index) => {
                  const isNew = watch(`supersededDocuments.${index}.isNewDocument`);
                  const preApproved = watch(`supersededDocuments.${index}.preApproved`);
                  const uploaded = watch(`supersededDocuments.${index}.uploadedFileName`);
                  const tags = watch(`supersededDocuments.${index}.tags`) || [];
                  const oldDocumentId = watch(`supersededDocuments.${index}.oldDocumentId`);
                  const isSopDoc = watch(`supersededDocuments.${index}.isSopDocument`);
                  const isMetaOnly = watch(`supersededDocuments.${index}.isMetadataOnly`);
                  const oldDocument = regularDocs.find((doc) => doc.id === parseInt(oldDocumentId));
                  
                  const availableDocsForReplacement = documents.filter(d => d.isSopDocument !== false && !d.isMetadataOnly).filter((doc) => {
                    if (parseInt(oldDocumentId) === doc.id) return true;
                    return !selectedOldDocIds.includes(doc.id);
                  });

                  return (
                    <div key={field.id} className={`rounded-xl border bg-white relative overflow-hidden shadow-sm transition-all ${isMetaOnly ? 'border-amber-300 shadow-amber-100' : 'border-gray-200 hover:border-blue-300'}`}>
                      <div className={`px-5 py-3 flex items-center justify-between border-b ${isMetaOnly ? 'bg-amber-100/50 border-amber-200' : 'bg-gray-100/50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                           <span className="text-base font-extrabold text-gray-800">Entry #{index + 1}</span>
                           {isMetaOnly && (<span className="text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Metadata Only</span>)}
                           {uploaded && !isMetaOnly && (<span className="text-[10px] font-bold bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1"><IconCheck size={12}/> File Ready</span>)}
                        </div>
                        <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-red-600 bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 p-1.5 rounded-lg transition-all shadow-sm" title="Remove Entry"><IconTrash size={18} /></button>
                      </div>
                      
                      <div className="p-5 space-y-5">
                        <div className="flex flex-wrap gap-x-8 gap-y-3 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                          {[{ name: `supersededDocuments.${index}.isNewDocument`, label: 'Add As New Document' }, { name: `supersededDocuments.${index}.preApproved`, label: 'Mark Pre-Approved' }, { name: `supersededDocuments.${index}.isMetadataOnly`, label: 'Metadata Only (No File Yet)' }].map(({ name, label }) => ( 
                            <label key={name} className="flex items-center gap-2.5 cursor-pointer text-sm font-bold text-gray-700 hover:text-blue-700 transition-colors">
                               <input type="checkbox" {...register(name)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                               {label}
                            </label> 
                          ))}
                          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-bold hover:text-green-700 transition-colors">
                             <input type="checkbox" defaultChecked={true} {...register(`supersededDocuments.${index}.isSopDocument`)} className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 transition-all cursor-pointer" />
                             <span className={isSopDoc ? 'text-green-700' : 'text-gray-500'}>SOP Document</span>
                          </label>
                        </div>

                        {!isNew && !isMetaOnly && (
                          <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl">
                            <label className={LabelClass}>Select SOP Document to Replace *</label>
                            <select {...register(`supersededDocuments.${index}.oldDocumentId`, { required: !isNew && !isMetaOnly ? 'Required' : false })} className={`${InputClass} border-blue-200 focus:border-blue-500 font-medium`} onChange={(e) => { const val = e.target.value; if (val) { viewOldDocumentDetails(val, index); const oldDoc = availableDocsForReplacement.find(d => d.id === parseInt(val)); if (oldDoc) { setValue(`supersededDocuments.${index}.fileDescription`, oldDoc.description || ''); setValue(`supersededDocuments.${index}.partNumber`, oldDoc.partNumber || ''); setValue(`supersededDocuments.${index}.issueNo`, oldDoc.issueNo || ''); setValue(`supersededDocuments.${index}.tags`, oldDoc.tags || []); setNewTags(prev => ({ ...prev, [index]: '' })); } } }}>
                              <option value="">-- Click to select an active SOP document --</option>
                              {availableDocsForReplacement.map((doc) => (<option key={doc.id} value={doc.id}>{doc.name} {doc.issueNo ? `(Issue: ${doc.issueNo})` : ''}</option>))}
                            </select>
                            {errors.supersededDocuments?.[index]?.oldDocumentId && (<p className="text-red-600 text-xs mt-2 font-bold">{errors.supersededDocuments[index].oldDocumentId.message}</p>)}
                            
                            {oldDocument && ( 
                               <div className="mt-4 p-4 bg-white border border-blue-200 rounded-xl shadow-sm">
                                  <div className="flex justify-between items-start gap-4">
                                     <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Target for Replacement</p>
                                        <p className="font-bold text-gray-900 text-base truncate">{oldDocument.name}</p>
                                        {oldDocument.issueNo && (<p className="text-blue-700 text-sm font-semibold mt-1">Issue No: {oldDocument.issueNo}</p>)}
                                     </div>
                                     <button type="button" onClick={() => viewOldDocumentDetails(oldDocument.id, index)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors shrink-0 shadow-sm"><IconEye size={16} /> Details</button>
                                  </div>
                               </div> 
                            )}
                          </div>
                        )}

                        {isNew && !isMetaOnly && oldDocument && (<div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-bold shadow-sm flex items-center gap-2"><IconInfoCircle size={20}/> Adding as a completely new document (No previous versions will be replaced)</div>)}

                        {isMetaOnly ? (
                          <div className="space-y-4 bg-amber-50 border border-amber-200 p-5 rounded-xl">
                            <div className="p-4 bg-white border border-amber-300 rounded-xl text-sm text-amber-900 shadow-sm font-medium"><strong>Metadata Only Notice:</strong> You are not uploading a file right now. You are simply creating the record. The actual file can be uploaded the next time this process is reopened.</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div><label className={LabelClass}>Intended File Name *</label><input {...register(`supersededDocuments.${index}.metaFileName`, { required: isMetaOnly ? 'Filename required' : false })} className={InputClass} placeholder="e.g. SOP_Procedure_v2" /></div>
                              <div><label className={LabelClass}>Expected Extension</label><select {...register(`supersededDocuments.${index}.metaFileExtension`)} className={InputClass}>{['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'other'].map((ext) => (<option key={ext} value={ext}>{ext.toUpperCase()}</option>))}</select></div>
                            </div>
                            
                            {isSopDoc && (
                                <div className="mt-4 p-4 bg-white border border-blue-200 rounded-xl shadow-sm">
                                  <label className={LabelClass}>Attach Editable Reference Document (Optional)</label>
                                  <p className="text-xs text-gray-500 mb-3 font-medium">Even though the main file is not ready, you can attach the source document now if you have it.</p>
                                  <div className="flex flex-col gap-2">
                                      <input type="file" onChange={(e) => handleMetaOnlyRefUpload(e.target.files[0], index)} className="text-sm w-full border border-gray-200 p-2 rounded-lg file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer" />
                                      {watch(`supersededDocuments.${index}.editableDocumentId`) && (
                                          <span className="text-xs text-green-700 font-bold flex items-center gap-1.5 bg-green-50 p-2 rounded-lg border border-green-200 w-fit"><IconCheck size={16}/> Reference File Attached Successfully</span>
                                      )}
                                  </div>
                                </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl space-y-4">
                            {preApproved && ( <div className="mb-4"><label className={LabelClass}>Custom File Name (Without Extension) *</label><input {...register(`supersededDocuments.${index}.uploadedFileName`, { required: preApproved ? 'Required' : false })} className={InputClass} placeholder="Enter preferred file name" /></div> )}
                            {!isNew && oldDocumentId && ( <div className="mb-4 p-4 bg-blue-600 text-white rounded-xl flex items-center gap-3 text-sm font-bold shadow-md"><IconArrowRight size={20} className="shrink-0" /><span className="truncate">This upload will replace: {documents.find(d => d.id === parseInt(oldDocumentId))?.name || `Doc #${oldDocumentId}`}</span></div> )}
                            
                            <div>
                               <label className={LabelClass}>Upload New Document File *</label>
                               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                 <input type="file" onChange={(e) => handleUpload(e.target.files[0], index)} className="w-full text-sm border border-gray-300 rounded-xl p-2.5 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 file:cursor-pointer file:transition-colors cursor-pointer shadow-sm" />
                                 {uploaded && (
                                   <button type="button" onClick={() => { setValue(`supersededDocuments.${index}.uploadedFileName`, ''); setValue(`supersededDocuments.${index}.newDocumentId`, ''); setValue(`supersededDocuments.${index}.editableDocumentId`, null); }} className="px-4 py-2.5 bg-white text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 border border-red-200 transition-colors shadow-sm shrink-0 flex items-center gap-2"><IconTrash size={16}/> Clear File</button>
                                 )}
                               </div>
                            </div>

                            {uploaded && ( <div className="mt-2 p-4 bg-green-100 border border-green-300 rounded-xl shadow-inner"><p className="text-green-900 text-sm font-bold flex items-center gap-2"><IconCheck size={18} /> File staged successfully: {uploaded}</p></div> )}
                            
                            {/* ✅ FIX: Separate Reference Upload Trigger */}
                            {uploaded && isSopDoc && !isMetaOnly && (
                              <div className="mt-4 p-5 bg-white border border-blue-200 rounded-xl shadow-sm">
                                <label className={LabelClass}>Attach Editable Reference Document (Optional)</label>
                                <p className="text-xs text-gray-500 mb-3 font-medium">Upload the original source file (e.g. Word doc) that this PDF was generated from. It will not enter the workflow but will be available for reference and download.</p>
                                <input type="file" className="text-sm w-full border border-gray-200 p-2 rounded-lg file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer" onChange={e => { if(e.target.files[0]) { handleRefUpload(e.target.files[0], index); } }} />
                                {watch(`supersededDocuments.${index}.editableDocumentId`) && (
                                  <span className="text-xs text-green-700 font-bold flex items-center gap-1.5 mt-3 bg-green-50 p-2 rounded-lg border border-green-200 w-fit"><IconCheck size={16}/> Reference File Attached Successfully</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {!isMetaOnly && ( <div><label className={LabelClass}>{isNew ? 'Notes / Change Description' : 'Reason for Superseding *'}</label><textarea {...register(`supersededDocuments.${index}.reasonOfSupersed`, { required: !isNew && !isMetaOnly ? 'Reason is required' : false })} className={`${InputClass} resize-none`} rows="3" placeholder={isNew ? 'Optional notes about this new document' : 'Enter detailed reason why this document is replacing the previous version'} /></div> )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div><label className={LabelClass}>Part / Doc Number</label><input {...register(`supersededDocuments.${index}.partNumber`)} className={InputClass} placeholder="e.g. DOC-123" /></div>
                          <div><label className={LabelClass}>Issue / Revision No</label><input {...register(`supersededDocuments.${index}.issueNo`)} className={InputClass} placeholder="e.g. Rev 2.0" /></div>
                        </div>
                        
                        <div><label className={LabelClass}>Brief Description</label><input {...register(`supersededDocuments.${index}.fileDescription`)} className={InputClass} placeholder="Short summary of document content" /></div>
                        
                        <div>
                          <label className={LabelClass}>Document Tags</label>
                          <div className="flex gap-3">
                            <input value={newTags[index] || ''} onChange={(e) => setNewTags((prev) => ({ ...prev, [index]: e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''), }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(index, newTags[index] || ''); } }} placeholder="Type tag and hit Enter..." className={InputClass} />
                            <button type="button" onClick={() => addTag(index, newTags[index] || '')} className="px-6 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm">Add Tag</button>
                          </div>
                          {tags.length > 0 && ( <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[50px]">{tags.map((t, i) => (<span key={i} className="bg-blue-100 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-red-100 hover:text-red-700 hover:border-red-200 transition-colors shadow-sm" onClick={() => removeTag(index, i)}>{t} <IconX size={14} /></span>))}</div> )}
                        </div>
                        <input type="hidden" {...register(`supersededDocuments.${index}.newDocumentId`)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4 flex-wrap mt-2">
            <button type="button" onClick={() => appendNewEntry(false)} disabled={loading} className="flex-1 min-w-[250px] flex justify-center items-center gap-2 px-5 py-3.5 bg-white text-blue-700 border-2 border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 shadow-sm"><IconSquarePlus size={20} /> Add Another Document / Replacement</button>
            <button type="button" onClick={() => appendNewEntry(true)} disabled={loading} className="flex-1 min-w-[250px] flex justify-center items-center gap-2 px-5 py-3.5 bg-white text-amber-700 border-2 border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors disabled:opacity-50 shadow-sm"><IconDatabaseImport size={20} /> Add Metadata Entry Only (No File)</button>
          </div>

          {fields.length === 0 && metadataOnlyDocs.length === 0 && ( <div className="flex items-start gap-4 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl text-sm text-blue-900 font-medium shadow-sm"><IconInfoCircle size={24} className="shrink-0 mt-0.5 text-blue-600" /><p className="leading-relaxed">Please add at least one document entry to reopen the process. You can add a completely new document, replace an existing active SOP document, or create a metadata-only placeholder if the file is not yet available.</p></div> )}

          <div className="flex gap-4 pt-6 border-t border-gray-200 flex-wrap mt-8">
            <button type="button" onClick={handleSubmit(handleSaveDraft)} disabled={loading} className="flex-1 min-w-[150px] py-3.5 px-6 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm shadow-sm">{isEditMode ? 'Update Draft' : 'Save as Draft'}</button>
            <button type="button" onClick={close} disabled={loading} className="py-3.5 px-8 bg-white border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-all text-sm shadow-sm">Cancel</button>
            <button type="submit" disabled={loading || isSubmitting || (fields.length === 0 && metadataOnlyDocs.length === 0)} className="flex-1 min-w-[200px] py-3.5 px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed shadow-md transition-colors text-sm flex justify-center items-center gap-2">{isEditMode ? 'Submit Reopen Updates' : 'Confirm & Reopen Process'}</button>
          </div>
        </form>
      </div>

      {/* Details View Modal */}
      {Object.entries(selectedOldDocumentDetails).map(([index, details]) => (
        <div key={index} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={() => setSelectedOldDocumentDetails({})}>
          <div className="bg-white rounded-2xl p-0 max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/80">
               <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><IconFileText size={24} className="text-blue-600"/> Document Information</h3>
               <button onClick={() => setSelectedOldDocumentDetails({})} className="text-gray-400 hover:text-red-500 bg-white border border-gray-200 hover:border-red-200 p-2 rounded-full transition-all shadow-sm"><IconX size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white border border-gray-100 p-5 rounded-xl shadow-sm">
                <div className="min-w-0"><span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Document Name</span> <span className="font-bold text-gray-900 break-words text-base">{details.name}</span></div>
                {details.issueNo && ( <div className="min-w-0"><span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Current Issue No</span> <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{details.issueNo}</span></div> )}
                {details.type && ( <div className="min-w-0"><span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">File Type</span> <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">{details.type.toUpperCase()}</span></div> )}
                {details.description && ( <div className="min-w-0 md:col-span-2"><span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</span> <span className="text-gray-800 break-words whitespace-pre-wrap block leading-relaxed">{details.description}</span></div> )}
                {details.tags && details.tags.length > 0 && ( <div className="md:col-span-2"><span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Applied Tags</span><div className="flex flex-wrap gap-2">{details.tags.map((tag, idx) => ( <span key={idx} className="bg-blue-50 text-blue-800 font-bold px-3 py-1.5 rounded-lg text-xs border border-blue-200 shadow-sm">{tag}</span> ))}</div></div> )}
              </div>
              
              {details.signedBy?.length > 0 && ( 
                <div className="space-y-3">
                  <span className="block text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Approval Signatures ({details.signedBy.length})</span>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                      {details.signedBy.map((sig, idx) => ( 
                        <li key={idx} className="p-4 hover:bg-white transition-colors">
                           <div className="flex justify-between items-start gap-4">
                             <span className="font-bold text-green-700 flex items-center gap-1.5"><IconCheck size={16}/> {sig.signedBy}</span>
                             <span className="text-gray-500 text-xs font-bold whitespace-nowrap">{new Date(sig.signedAt).toLocaleString()}</span>
                           </div>
                           {sig.remarks && ( <div className="mt-2 text-gray-700 bg-white border border-gray-100 p-3 rounded-lg italic text-sm shadow-sm">"{sig.remarks}"</div> )}
                        </li> 
                      ))}
                    </ul>
                  </div>
                </div> 
              )}

              {details.rejectionDetails && ( 
                <div className="space-y-3">
                  <span className="block text-sm font-bold text-red-800 border-b border-red-200 pb-2">Rejection Record</span>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                    <div className="flex justify-between items-start gap-4 mb-2">
                       <span className="font-bold text-red-800 flex items-center gap-1.5"><IconX size={16}/> Rejected by: {details.rejectionDetails.rejectedBy}</span>
                       <span className="text-red-600 text-xs font-bold whitespace-nowrap">{new Date(details.rejectionDetails.rejectedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-red-900 text-sm font-medium bg-white p-3 rounded-lg border border-red-100 italic break-words whitespace-pre-wrap mt-2">"{details.rejectionDetails.rejectionReason}"</p>
                  </div>
                </div> 
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
               <button onClick={() => setSelectedOldDocumentDetails({})} className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-colors shadow-sm text-sm">Close Details</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}