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
import Show from '../workflows/Show';
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
  IconPencil
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import ViewFile from '../view/View';
import Title from '../../CustomComponents/Title';

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
  });

  const [newTag, setNewTag] = useState('');
  const [templates, setTemplates] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [fileView, setFileView] = useState(null);

  // Copy feature state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [processList, setProcessList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyingDocs, setCopyingDocs] = useState(false);

  // Document edit modal state
  const [editingDocument, setEditingDocument] = useState(null); // { index, documentId, partNumber, issueNo, description, tags }
  const [editTagInput, setEditTagInput] = useState('');

  const defaultValues = {
    workflowId: '',
    description: '',
    documents: [],
    issueNo: '',
  };

  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm({ defaultValues });

  const [workflowId] = watch(['workflowId']);
  const {
    fields: documentFields,
    append: addDocument,
    remove: removeDocument,
    update: updateDocument,
  } = useFieldArray({ control, name: 'documents' });

  // Watch documents array to re-render tags accurately when editing
  const watchedDocuments = watch('documents');

  useEffect(() => {
    if (draftId) {
      loadDraftForEdit(draftId);
    }
  }, [draftId]);

  const loadDraftForEdit = async (id) => {
    setActionsLoading(true);
    try {
      const response = await GetDraftForEditing(id);
      const { type, draftId: fetchedDraftId, formData } = response.data;

      if (type !== "INITIATE") {
        toast.error("This is not an initiation draft");
        navigate('/processes/initiate');
        return;
      }

      reset({
        workflowId: formData.workflowId,
        description: formData.description,
        issueNo: formData.issueNo,
        documents: formData.documents.map(doc => ({
          documentId: doc.documentId,
          name: doc.name,
          tags: doc.tags || [],
          partNumber: doc.partNumber,
          description: doc.description,
          issueNo: doc.issueNo,
          preApproved: doc.preApproved,
          documentPath: doc.documentPath,
        })),
      });

      setCurrentDraftId(fetchedDraftId);
      setIsEditMode(true);

      if (formData.workflowId) {
        const allWorkflows = await GetWorkflows();
        const workflows = allWorkflows.data.workflows || [];
        const workflowMatch = workflows.find(wf => 
          wf.versions?.some(ver => ver.id === formData.workflowId)
        );
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

  const handleDeleteDocument = async (index, id) => {
    setActionsLoading(true);
    try {
      await DeleteFile(id);
      toast.success('Document removed');
      removeDocument(index);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
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

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);
  const inputRef = useRef(null);

  const handleUpload = async () => {
    if (!workflowId) {
      toast.info('Please select workflow.');
      return;
    }
    if (!selectedFile) return;

    setActionsLoading(true);
    try {
      const generatedName = fileDetails.preApproved
        ? { data: { documentName: fileDetails.name + '.' + selectedFile.name.split('.').pop() } }
        : await GenerateDocumentName(workflowId, null, selectedFile.name.split('.').pop());

      const res = await uploadDocumentInProcess(
        [selectedFile],
        generatedName?.data?.documentName,
        fileDetails?.tags,
      );

      toast.success('File uploaded successfully');

      addDocument({
        documentId: res[0],
        name: generatedName?.data?.documentName,
        tags: fileDetails.tags,
        description: fileDetails.fileDescription,
        partNumber: fileDetails.partNumber,
        preApproved: fileDetails.preApproved,
        issueNo: fileDetails.issueNo,
      });

      setFileDetails({ tags: [], partNumber: '', preApproved: false, fileDescription: '', issueNo: '', name: '' });
      setNewTag('');
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = null;
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setActionsLoading(false);
    }
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

      // Overwrite process details
      setValue('description', description || '');
      setValue('issueNo', issueNo || '');

      const duplicatePromises = documents.map(doc =>
        DuplicateDocumentForCopy({
          sourceProcessId: process.id,
          sourceDocumentId: doc.documentId,
          targetWorkflowId: workflowId 
        }).then(res => ({
          ...res.data,
          metadata: {
            tags: doc.tags || [],
            partNumber: doc.partNumber,
            description: doc.description,
            preApproved: doc.preApproved,
            issueNo: doc.issueNo,
            SOPIssueNo: doc.SOPIssueNo
          }
        }))
      );

      const duplicatedDocs = await Promise.all(duplicatePromises);

      duplicatedDocs.forEach(doc => {
        addDocument({
          documentId: doc.documentId,
          name: doc.name,
          tags: doc.metadata.tags || [],
          description: doc.metadata.description,
          partNumber: doc.metadata.partNumber,
          preApproved: doc.metadata.preApproved,
          issueNo: doc.metadata.issueNo,
        });
      });

      toast.success(`Copied ${duplicatedDocs.length} document(s). You can edit their details below.`);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setCopyingDocs(false);
    }
  };

  const handleSaveDraft = async (data) => {
    setActionsLoading(true);
    try {
      const payload = { ...data, saveAsDraft: true, draftId: currentDraftId, type: "INITIATE" };
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
    if (data?.documents?.length === 0) {
      toast.info('Please upload or copy documents for process');
      return;
    }

    setActionsLoading(true);
    try {
      const res = await ProcessInitiate(data);
      if (draftIdRef.current) {
        await deleteDraft({ draftId: draftIdRef.current });
      }
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
        info: 'Prepared from template. Please edit to add the latest data.',
      });
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

  const draftIdRef = useRef(null);
  useEffect(() => { draftIdRef.current = currentDraftId; }, [currentDraftId]);

  useEffect(() => {
    if (workflowId) {
      const getTemplates = async () => {
        try {
          const res = await getWorkflowTemplates(workflowId);
          setTemplates(res.data.templates);
        } catch (error) {
          console.error(error?.response?.data?.message || error?.message);
        }
      };
      getTemplates();
    }
  }, [workflowId]);

  // Document edit modal handlers
  const openEditModal = (doc, index) => {
    setEditingDocument({
      index,
      documentId: doc.documentId,
      partNumber: doc.partNumber || '',
      issueNo: doc.issueNo || '',
      description: doc.description || '',
      tags: doc.tags || [],
    });
    setEditTagInput('');
  };

  const closeEditModal = () => {
    setEditingDocument(null);
    setEditTagInput('');
  };

  const handleSaveDocumentEdit = () => {
    if (!editingDocument) return;
    const { index, partNumber, issueNo, description, tags } = editingDocument;
    updateDocument(index, {
      ...documentFields[index],
      partNumber,
      issueNo,
      description,
      tags,
    });
    closeEditModal();
    toast.success('Document details updated');
  };

  const addTagToEditing = () => {
    if (!editTagInput.trim()) return;
    setEditingDocument(prev => ({
      ...prev,
      tags: [...prev.tags, editTagInput.trim()]
    }));
    setEditTagInput('');
  };

  const removeTagFromEditing = (tagIndex) => {
    setEditingDocument(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== tagIndex)
    }));
  };

  const Section = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-5">{title}</h3>
      {children}
    </div>
  );

  const InputClass = "w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50 text-sm";
  const LabelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  return (
    <>
      {(actionsLoading || copyingDocs) && <TopLoader />}
      
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

        {copyingDocs && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg flex items-center gap-3 shadow-sm">
            <IconLoader className="animate-spin text-blue-600" size={24} />
            <span className="font-medium">Duplicating documents from source process...</span>
          </div>
        )}

        <form className="space-y-6">
          {/* Process Info Section */}
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
                <input 
                  {...register('issueNo')} 
                  className={InputClass} 
                  placeholder="Enter issue/revision number" 
                />
              </div>

              <div>
                <label className={LabelClass}>Select Workflow</label>
                <select
                  className={InputClass}
                  onChange={(e) => {
                    const selected = workflowData.find(wf => wf.name === e.target.value);
                    setSelectedWorkflow(selected);
                    setValue('workflowId', '');
                  }}
                  value={selectedWorkflow?.name || ''}
                >
                  <option value="">-- Choose a Workflow --</option>
                  {workflowData.map(wf => <option key={wf.id} value={wf.name}>{wf.name}</option>)}
                </select>
              </div>

              <div>
                <label className={LabelClass}>Select Version</label>
                <Controller
                  name="workflowId"
                  control={control}
                  rules={{ required: 'Version selection is required' }}
                  render={({ field }) => (
                    <select {...field} className={InputClass} disabled={!selectedWorkflow}>
                      <option value="">-- Choose a Version --</option>
                      {selectedWorkflow?.versions?.map(ver => (
                        <option key={ver.id} value={ver.id}>Version {ver.version} - {ver.description}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.workflowId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.workflowId.message}</p>}
                
                {/* Copy Context Area */}
                <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">Want to reuse documents?</p>
                  <button
                    type="button"
                    disabled={!workflowId || copyingDocs}
                    onClick={() => {
                      if (!workflowId) return;
                      setShowCopyModal(true);
                      fetchProcessesForCopy();
                    }}
                    className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 font-medium rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200"
                  >
                    <IconCopy size={18} />
                    Copy from existing process
                  </button>
                  {!workflowId && <p className="text-xs text-indigo-600 mt-2 text-center">Select a workflow version above to enable copying.</p>}
                </div>
              </div>
            </div>

            {workflowId && (
              <div className="mt-6 border border-gray-200 rounded-lg p-5 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-3">Workflow Steps Preview</p>
                <Show steps={selectedWorkflow?.versions?.find(item => item.id === workflowId)?.steps} />
              </div>
            )}
          </Section>

          {/* Templates Section */}
          {templates?.length > 0 && (
            <Section title="Available Templates">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map(template => (
                  <div key={template.id} className="flex flex-col justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all group">
                    <div className="mb-4">
                      <p className="font-semibold text-gray-800 text-sm">{template.name}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate" title={template.path}>{template.path}</p>
                    </div>
                    <button 
                      type="button" 
                      disabled={actionsLoading} 
                      onClick={() => handleUseTemplate(template)} 
                      className="w-full py-2 bg-gray-50 text-blue-600 text-sm font-semibold rounded-lg border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Upload File Section */}
          <Section title="Upload New Document">
             <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 flex flex-col">
                <label className={LabelClass}>Choose File</label>
                <div 
                  className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                >
                  <input type="file" ref={inputRef} className="hidden" onChange={handleFileChange} />
                  
                  {!selectedFile ? (
                    <div className="text-center cursor-pointer" onClick={() => inputRef.current?.click()}>
                      <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <IconCloudUpload className="text-blue-500" size={24} />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Click to browse or drag file here</p>
                      <p className="text-xs text-gray-500 mt-1">Supports PDF, DOCX, etc.</p>
                    </div>
                  ) : (
                    <div className="text-center w-full min-w-0">
                      <IconFileText className="mx-auto text-blue-600 mb-2" size={32} />
                      <span className="text-gray-800 font-semibold text-sm truncate block px-2 break-all">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500 block mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                      <button 
                        type="button" 
                        className="text-red-500 text-xs font-semibold mt-3 hover:text-red-700 flex items-center justify-center gap-1 mx-auto" 
                        onClick={() => {
                          setSelectedFile(null);
                          if(inputRef.current) inputRef.current.value = null;
                        }}
                      >
                        <IconTrash size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-2/3 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={LabelClass}>Document Number</label>
                    <input 
                      value={fileDetails.partNumber} 
                      onChange={(e) => setFileDetails(prev => ({ ...prev, partNumber: e.target.value }))} 
                      className={InputClass} 
                      placeholder="e.g. DOC-123" 
                    />
                  </div>
                  <div>
                    <label className={LabelClass}>Issue / Revision Number</label>
                    <input 
                      value={fileDetails.issueNo} 
                      onChange={(e) => setFileDetails(prev => ({ ...prev, issueNo: e.target.value }))} 
                      className={InputClass} 
                      placeholder="e.g. Rev 1.0" 
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LabelClass}>Document Description</label>
                    <input 
                      value={fileDetails.fileDescription} 
                      onChange={(e) => setFileDetails(prev => ({ ...prev, fileDescription: e.target.value }))} 
                      className={InputClass} 
                      placeholder="Brief description of this document" 
                    />
                  </div>
                  {fileDetails.preApproved && (
                    <div className="sm:col-span-2">
                      <label className={LabelClass}>Custom Document Name</label>
                      <input 
                        value={fileDetails.name} 
                        onChange={(e) => setFileDetails(prev => ({ ...prev, name: e.target.value }))} 
                        className={InputClass} 
                        placeholder="Enter preferred name" 
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className={LabelClass}>Tags</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTag.trim()) {
                            setFileDetails(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
                            setNewTag('');
                          }
                        }
                      }}
                      className={InputClass}
                      placeholder="Type a tag and press Enter or Add"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTag.trim()) {
                          setFileDetails(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
                          setNewTag('');
                        }
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg border border-gray-300 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {fileDetails.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {fileDetails.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5"
                        >
                          {tag} 
                          <IconX 
                            size={14} 
                            className="cursor-pointer hover:text-red-500" 
                            onClick={() => setFileDetails(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }))} 
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={fileDetails.preApproved} 
                        onChange={(e) => setFileDetails(prev => ({ ...prev, preApproved: e.target.checked }))} 
                        className="peer w-5 h-5 cursor-pointer appearance-none rounded border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 transition-all" 
                      />
                      <svg className="absolute w-3.5 h-3.5 left-[3px] top-[3px] text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 select-none group-hover:text-blue-600 transition-colors">Mark as Pre-Approved</span>
                  </label>

                  <button 
                    type="button" 
                    onClick={handleUpload} 
                    disabled={!selectedFile || actionsLoading} 
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                  >
                    <IconCloudUpload size={18} />
                    Upload File
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* Uploaded Documents List */}
          <Section title={`Attached Documents (${documentFields.length})`}>
            {documentFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <IconInfoCircle className="text-gray-400 mb-2" size={32} />
                <p className="text-gray-500 text-sm font-medium">No documents have been attached yet.</p>
                <p className="text-gray-400 text-xs mt-1">Upload a file or copy from an existing process.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4">
                {documentFields.map((doc, index) => {
                  const currentDocState = watchedDocuments[index] || doc;
                  return (
                    <li key={doc.documentId} className="flex flex-col p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center rounded-lg text-blue-600 flex-shrink-0 mt-1">
                            <IconFileText size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 break-words line-clamp-2" title={currentDocState.name}>{currentDocState.name || 'Unnamed Document'}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
                              <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-700">ID: {String(currentDocState.documentId).substring(0,8)}...</span>
                              {currentDocState.partNumber && <span>Part: <span className="font-medium">{currentDocState.partNumber}</span></span>}
                              {currentDocState.issueNo && <span>Issue: <span className="font-medium">{currentDocState.issueNo}</span></span>}
                            </div>
                            {currentDocState.description && <p className="text-xs text-gray-500 mt-1 truncate max-w-md" title={currentDocState.description}>{currentDocState.description}</p>}
                            {currentDocState.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {currentDocState.tags.map(t => <span key={t} className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded">{t}</span>)}
                              </div>
                            )}
                            {currentDocState.info && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-2 w-fit">💡 {currentDocState.info}</p>}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                          <button 
                            type="button" 
                            disabled={actionsLoading} 
                            onClick={() => openEditModal(currentDocState, index)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            <IconEdit size={16} /> Edit
                          </button>
                          <button 
                            type="button" 
                            disabled={actionsLoading} 
                            onClick={() => handleViewFile(doc.name, doc.documentPath || '/check', doc.documentId, doc.name?.split('.').pop(), true)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            <IconEye size={16} /> View
                          </button>
                          <button 
                            type="button" 
                            disabled={actionsLoading} 
                            onClick={() => handleDeleteDocument(index, doc.documentId)} 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            <IconTrash size={16} /> Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={handleSubmit((data) => handleSaveDraft(data))} 
              disabled={actionsLoading || documentFields.length === 0} 
              className="flex-1 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-colors"
            >
              Save as Draft
            </button>
            <button 
              type="button" 
              onClick={handleSubmit(handleSubmitImmediately)} 
              disabled={actionsLoading || documentFields.length === 0} 
              className="flex-1 py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed shadow-md transition-colors"
            >
              Submit Process
            </button>
          </div>
        </form>
      </div>

      {/* Copy Process Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Copy From Existing Process</h3>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition-colors">
                <IconX size={20} />
              </button>
            </div>
            
            {/* Search */}
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, description, or ID..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow bg-white text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable List */}
            <div className="p-5 sm:p-6 flex-1 overflow-y-auto bg-gray-50/50 min-h-[300px]">
              {processList.length === 0 ? (
                <div className="text-center py-12">
                  <IconLoader className="animate-spin mx-auto text-gray-400 mb-3" size={32} />
                  <p className="text-gray-500 text-sm font-medium">Loading available processes...</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {processList
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())))
                    .map(process => (
                      <li
                        key={process.id}
                        className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group flex flex-col"
                        onClick={() => handleSelectProcess(process)}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                          <h4 className="font-bold text-gray-800 group-hover:text-blue-700 break-words leading-tight">{process.name}</h4>
                          <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded whitespace-nowrap self-start sm:self-auto">
                            {new Date(process.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3 break-words">
                          {process.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 w-fit px-2.5 py-1.5 rounded-md mt-auto">
                          <IconInfoCircle size={14} />
                          <span className="truncate">Workflow: {process.workflow.name} (v{process.workflow.version})</span>
                        </div>
                      </li>
                    ))}
                  
                  {processList.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && (
                    <div className="text-center py-10 text-gray-500 text-sm font-medium bg-white rounded-xl border border-dashed border-gray-300">
                      No processes match your search query.
                    </div>
                  )}
                </ul>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end flex-shrink-0">
              <button 
                onClick={() => setShowCopyModal(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Edit Modal */}
      {editingDocument && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <IconPencil size={20} className="text-blue-600" />
                Edit Document Details
              </h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full transition-colors">
                <IconX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className={LabelClass}>Part Number</label>
                <input
                  type="text"
                  className={InputClass}
                  value={editingDocument.partNumber}
                  onChange={(e) => setEditingDocument({ ...editingDocument, partNumber: e.target.value })}
                  placeholder="Enter part number"
                />
              </div>
              <div>
                <label className={LabelClass}>Issue / Revision Number</label>
                <input
                  type="text"
                  className={InputClass}
                  value={editingDocument.issueNo}
                  onChange={(e) => setEditingDocument({ ...editingDocument, issueNo: e.target.value })}
                  placeholder="Enter issue number"
                />
              </div>
              <div>
                <label className={LabelClass}>Description</label>
                <input
                  type="text"
                  className={InputClass}
                  value={editingDocument.description}
                  onChange={(e) => setEditingDocument({ ...editingDocument, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className={LabelClass}>Tags</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={InputClass}
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value.replace(/[^a-zA-Z0-9 ]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTagToEditing();
                      }
                    }}
                    placeholder="Add tag and press Enter"
                  />
                  <button
                    type="button"
                    onClick={addTagToEditing}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg border border-gray-300"
                  >
                    Add
                  </button>
                </div>
                {editingDocument.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editingDocument.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5"
                      >
                        {tag}
                        <IconX
                          size={14}
                          className="cursor-pointer hover:text-red-500"
                          onClick={() => removeTagFromEditing(idx)}
                        />
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-5 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDocumentEdit}
                className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <IconCheck size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}
    </>
  );
}