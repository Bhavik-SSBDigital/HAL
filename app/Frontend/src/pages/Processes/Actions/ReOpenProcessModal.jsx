import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  uploadDocumentInProcess,
  ReOpenProcess,
  GenerateDocumentName,
  GetDraftForEditing,
  SaveOrUpdateDraft,
  SubmitDraft,
} from '../../../common/Apis';
import { toast } from 'react-toastify';
import CustomButton from '../../../CustomComponents/CustomButton';
import { IconSquarePlus, IconSquareX, IconEye, IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopLoader from '../../../common/Loader/TopLoader';

export default function ReOpenProcessModal({
  workflowId,
  processId,
  documents = [],
  close,
  storagePath,
  draftId: initialDraftId,
}) {
  const navigate = useNavigate();
  const fileInputRefs = useRef({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(initialDraftId || null);
  const [loading, setLoading] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [selectedOldDocumentDetails, setSelectedOldDocumentDetails] = useState({});

  const {
    control,
    handleSubmit,
    register,
    watch,
    setValue,
    getValues,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      processId,
      issueNo: '',
      supersededDocuments: [
        {
          isNewDocument: false,
          preApproved: false,
          oldDocumentId: '',
          newDocumentId: '',
          uploadedFileName: '',
          reasonOfSupersed: '',
          issueNo: '',
          partNumber: '',
          fileDescription: '',
          tags: [],
        },
      ],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'supersededDocuments',
  });

  const [newTags, setNewTags] = useState({});

  // Load draft if draftId is provided
  useEffect(() => {
    if (initialDraftId && !draftLoaded) {
      loadDraftForEdit(initialDraftId);
    }
  }, [initialDraftId, draftLoaded]);

  const loadDraftForEdit = async (id) => {
    setLoading(true);
    try {
      const response = await GetDraftForEditing(id);
      const { type, draftId: fetchedDraftId, formData, originalDocuments } = response.data;

      if (type !== "REOPEN") {
        toast.error("This is not a reopen draft");
        return;
      }

      console.log("Loaded draft data:", formData.supersededDocuments);

      if (formData.supersededDocuments && formData.supersededDocuments.length > 0) {
        // Replace the entire field array with draft data
        replace(formData.supersededDocuments);
      }

      // Set other form values
      setValue('processId', formData.processId);
      setValue('issueNo', formData.issueNo);

      setCurrentDraftId(fetchedDraftId);
      setIsEditMode(true);
      setDraftLoaded(true);

      // Initialize tag inputs
      const tagInputs = {};
      formData.supersededDocuments?.forEach((doc, index) => {
        if (doc.tags && doc.tags.length > 0) {
          tagInputs[index] = '';
        }
      });
      setNewTags(tagInputs);

      toast.success('Draft loaded successfully');
    } catch (error) {
      console.error("Error loading draft:", error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFileInput = (index) => {
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index].value = '';
    }
  };

  const handleUpload = async (file, index) => {
    if (!file) return;

    const row = getValues(`supersededDocuments.${index}`);
    const extension = file.name.split('.').pop();

    try {
      let finalFileName = '';

      if (row.preApproved) {
        if (!row.uploadedFileName) {
          toast.warning('Enter filename for pre-approved document');
          resetFileInput(index);
          return;
        }
        finalFileName = row.uploadedFileName.includes('.')
          ? row.uploadedFileName
          : `${row.uploadedFileName}.${extension}`;
      } else {
        const res = await GenerateDocumentName(
          workflowId,
          row.isNewDocument ? null : row.oldDocumentId,
          extension,
        );
        finalFileName = res?.data?.documentName;
        if (!finalFileName) {
          toast.error('Failed to generate document name');
          return;
        }
        setValue(
          `supersededDocuments.${index}.uploadedFileName`,
          finalFileName,
        );
      }

      const uploadRes = await uploadDocumentInProcess(
        [file],
        finalFileName,
        [],
        storagePath,
      );

      setValue(`supersededDocuments.${index}.newDocumentId`, uploadRes[0]);
      setValue(`supersededDocuments.${index}.uploadedFileName`, finalFileName);

      toast.success('Document uploaded successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    }
  };

  const viewOldDocumentDetails = (documentId, index) => {
    const document = documents.find(doc => doc.id === parseInt(documentId));
    if (document) {
      setSelectedOldDocumentDetails({
        [index]: {
          id: document.id,
          name: document.name,
          description: document.description,
          issueNo: document.issueNo,
          signedBy: document.signedBy || [],
          rejectionDetails: document.rejectionDetails,
          tags: document.tags || [],
          type: document.type,
        }
      });
    }
  };

  // Save as draft
  const handleSaveDraft = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        saveAsDraft: true,
        draftId: currentDraftId,
        type: "REOPEN",
        workflowId: workflowId,
        storagePath: storagePath,
      };

      console.log("Saving draft payload:", payload);

      const res = await SaveOrUpdateDraft(payload);
      
      toast.success(res?.data?.message || 'Draft saved successfully');
      setCurrentDraftId(res?.data?.draftId);
      setIsEditMode(true);
      
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit draft
  const handleSubmitDraft = async () => {
    if (!currentDraftId) {
      toast.error("No draft to submit");
      return;
    }

    setLoading(true);
    try {
      const res = await SubmitDraft(currentDraftId);
      toast.success(res?.data?.message || 'Process reopened successfully');
      
      close();
      if (window.location.pathname.includes('drafted')) {
        navigate('/processes/drafted');
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit immediately
  const handleSubmitImmediately = async (data) => {
    const valid = data.supersededDocuments.every((d) => {
      return (
        d.uploadedFileName &&
        d.newDocumentId &&
        (d.isNewDocument || d.oldDocumentId)
      );
    });

    if (!valid) {
      toast.warning('Please fill all required fields and upload all documents.');
      return;
    }

    setLoading(true);
    try {
      await ReOpenProcess({
        processId,
        issueNo: data.issueNo,
        supersededDocuments: data.supersededDocuments.map((d) => ({
          isNewDocument: d.isNewDocument,
          preApproved: d.preApproved,
          oldDocumentId: d.isNewDocument ? null : Number(d.oldDocumentId),
          newDocumentId: d.newDocumentId,
          reasonOfSupersed: d.reasonOfSupersed,
          issueNo: d.issueNo,
          partNumber: d.partNumber,
          fileDescription: d.fileDescription,
          tags: d.tags,
          uploadedFileName: d.uploadedFileName,
        })),
      });

      toast.success('Process reopened successfully');
      close();
      window.location.reload();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setLoading(false);
    }
  };

  const addTag = (index, tag) => {
    if (!tag.trim()) return;
    
    const currentTags = watch(`supersededDocuments.${index}.tags`) || [];
    setValue(`supersededDocuments.${index}.tags`, [...currentTags, tag.trim()]);
    setNewTags(prev => ({ ...prev, [index]: '' }));
  };

  const removeTag = (index, tagIndex) => {
    const currentTags = watch(`supersededDocuments.${index}.tags`) || [];
    const newTags = currentTags.filter((_, i) => i !== tagIndex);
    setValue(`supersededDocuments.${index}.tags`, newTags);
  };

  return (
    <>
      {loading && <TopLoader />}
      <div className="max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit(handleSubmitImmediately)} className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {isEditMode ? 'Edit Reopen Draft' : 'Reopen Process'}
            </h2>
            {isEditMode && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Editing Draft #{currentDraftId?.substring(0, 8)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              SOP Issue / Revision No *
            </label>
            <input
              {...register('issueNo', {
                required: 'SOP Issue/Revision No is required',
              })}
              placeholder="Enter SOP Issue / Revision No"
              className="w-full border p-2 rounded"
            />
          </div>

          {fields.map((field, index) => {
            const isNew = watch(`supersededDocuments.${index}.isNewDocument`);
            const preApproved = watch(`supersededDocuments.${index}.preApproved`);
            const uploaded = watch(`supersededDocuments.${index}.uploadedFileName`);
            const tags = watch(`supersededDocuments.${index}.tags`) || [];
            const oldDocumentId = watch(`supersededDocuments.${index}.oldDocumentId`);
            const reasonOfSupersed = watch(`supersededDocuments.${index}.reasonOfSupersed`);
            const partNumber = watch(`supersededDocuments.${index}.partNumber`);
            const fileDescription = watch(`supersededDocuments.${index}.fileDescription`);
            const documentIssueNo = watch(`supersededDocuments.${index}.issueNo`);
            
            const oldDocument = documents.find(doc => doc.id === parseInt(oldDocumentId));

            return (
              <div key={field.id} className="border p-4 rounded-lg relative space-y-4 bg-gray-50">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    title="Remove this document"
                  >
                    <IconSquareX size={20} />
                  </button>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">
                    Document {index + 1}
                    {isEditMode && uploaded && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Saved in Draft
                      </span>
                    )}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-4">
                    <label className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        {...register(`supersededDocuments.${index}.isNewDocument`)}
                      />
                      New document (not replacement)
                    </label>

                    <label className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        {...register(`supersededDocuments.${index}.preApproved`)}
                      />
                      Pre-approved document
                    </label>
                  </div>

                  {!isNew && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Select Document to Replace *
                      </label>
                      <select
                        {...register(`supersededDocuments.${index}.oldDocumentId`, {
                          required: !isNew && 'Select document to replace',
                        })}
                        className="w-full border p-2 rounded"
                        onChange={(e) => {
                          if (e.target.value) {
                            viewOldDocumentDetails(e.target.value, index);
                          }
                        }}
                      >
                        <option value="">Select document to supersede</option>
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.name} (Issue: {doc.issueNo || 'N/A'})
                          </option>
                        ))}
                      </select>
                      
                      {oldDocument && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm text-blue-700">Superseding Document:</p>
                              <p className="text-sm">{oldDocument.name}</p>
                              {oldDocument.description && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Description: {oldDocument.description}
                                </p>
                              )}
                              {oldDocument.issueNo && (
                                <p className="text-xs text-gray-600">
                                  Current Issue No: {oldDocument.issueNo}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => viewOldDocumentDetails(oldDocument.id, index)}
                              className="text-blue-600 hover:text-blue-800"
                              title="View full details"
                            >
                              <IconEye size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {preApproved && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Enter File Name (without extension) *
                      </label>
                      <input
                        {...register(
                          `supersededDocuments.${index}.uploadedFileName`,
                          {
                            required:
                              preApproved &&
                              'Filename is required for pre-approved document',
                          },
                        )}
                        className="w-full border p-2 rounded"
                        placeholder="Enter file name without extension"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Upload Document *
                    </label>
                    <input
                      type="file"
                      ref={(el) => (fileInputRefs.current[index] = el)}
                      onChange={(e) => handleUpload(e.target.files[0], index)}
                      className="w-full"
                    />
                    {uploaded && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-green-700 text-sm font-medium">
                          ✓ Document uploaded successfully
                        </p>
                        <p className="text-green-600 text-sm">
                          File: {uploaded}
                        </p>
                        {isEditMode && (
                          <p className="text-xs text-gray-500 mt-1">
                            This document is saved in your draft.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Reason for Superseding *
                    </label>
                    <textarea
                      {...register(`supersededDocuments.${index}.reasonOfSupersed`, {
                        required: 'Reason is required',
                      })}
                      className="w-full border p-2 rounded"
                      placeholder="Enter detailed reason for superseding this document"
                      rows="3"
                    />
                    {reasonOfSupersed && (
                      <p className="text-xs text-gray-500 mt-1">
                        Character count: {reasonOfSupersed.length}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Document Description *
                      </label>
                      <input
                        {...register(`supersededDocuments.${index}.partNumber`, {
                          required: 'Description is required',
                        })}
                        className="w-full border p-2 rounded"
                        placeholder="Enter document description"
                      />
                      {partNumber && (
                        <p className="text-xs text-gray-500 mt-1">
                          Description: {partNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Part Number *
                      </label>
                      <input
                        {...register(`supersededDocuments.${index}.fileDescription`, {
                          required: 'Part Number is required',
                        })}
                        className="w-full border p-2 rounded"
                        placeholder="Enter part number"
                      />
                      {fileDescription && (
                        <p className="text-xs text-gray-500 mt-1">
                          Part No: {fileDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Document Issue / Revision No *
                    </label>
                    <input
                      {...register(`supersededDocuments.${index}.issueNo`, {
                        required: 'Issue/Revision no is required',
                      })}
                      className="w-full border p-2 rounded"
                      placeholder="Enter document issue / revision number"
                    />
                    {documentIssueNo && (
                      <p className="text-xs text-gray-500 mt-1">
                        New Issue No: {documentIssueNo}
                        {oldDocument?.issueNo && (
                          <span className="ml-2 text-gray-400">
                            (Previous: {oldDocument.issueNo})
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium block">Tags</label>
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newTags[index] || ''}
                        onChange={(e) =>
                          setNewTags(prev => ({
                            ...prev,
                            [index]: e.target.value.replace(/[^a-zA-Z0-9 ]/g, '')
                          }))
                        }
                        placeholder="Enter tag"
                        className="border p-2 rounded w-full"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(index, newTags[index] || '');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addTag(index, newTags[index] || '')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map((t, i) => (
                          <span
                            key={i}
                            onClick={() => removeTag(index, i)}
                            className="bg-purple-600 text-white px-3 py-1 rounded cursor-pointer hover:bg-purple-700 text-sm"
                            title="Click to remove"
                          >
                            {t} ×
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="hidden"
                    {...register(`supersededDocuments.${index}.newDocumentId`)}
                  />
                </div>
              </div>
            );
          })}

          <CustomButton
            type="button"
            variant="secondary"
            click={() =>
              append({
                isNewDocument: false,
                preApproved: false,
                oldDocumentId: '',
                newDocumentId: '',
                uploadedFileName: '',
                reasonOfSupersed: '',
                issueNo: '',
                partNumber: '',
                fileDescription: '',
                tags: [],
              })
            }
            disabled={loading}
            text={
              <div className="flex gap-2 items-center">
                <IconSquarePlus /> Add Another Document
              </div>
            }
          />

          <div className="flex justify-between gap-2 pt-4 border-t">
            <div className="flex gap-2">
              {isEditMode && (
                <CustomButton
                  type="button"
                  variant="success"
                  click={handleSubmitDraft}
                  disabled={loading}
                  text="Submit Draft"
                />
              )}
              <CustomButton
                type="button"
                variant="secondary"
                click={handleSubmit((data) => handleSaveDraft(data))}
                disabled={loading}
                text={isEditMode ? "Update Draft" : "Save as Draft"}
              />
            </div>
            <div className="flex gap-2">
              <CustomButton
                type="button"
                variant="danger"
                click={close}
                text="Cancel"
              />
              <CustomButton
                type="submit"
                disabled={loading || isSubmitting}
                text={isEditMode ? "Reopen Process (Update)" : "Reopen Process"}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Old Document Details Modal */}
      {Object.entries(selectedOldDocumentDetails).map(([index, details]) => (
        <div
          key={index}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedOldDocumentDetails({})}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Document Details</h3>
              <button
                onClick={() => setSelectedOldDocumentDetails({})}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="font-medium">Document Name:</label>
                <p className="text-gray-700">{details.name}</p>
              </div>
              
              {details.description && (
                <div>
                  <label className="font-medium">Description:</label>
                  <p className="text-gray-700">{details.description}</p>
                </div>
              )}
              
              {details.issueNo && (
                <div>
                  <label className="font-medium">Current Issue No:</label>
                  <p className="text-gray-700">{details.issueNo}</p>
                </div>
              )}
              
              {details.type && (
                <div>
                  <label className="font-medium">Type:</label>
                  <p className="text-gray-700">{details.type.toUpperCase()}</p>
                </div>
              )}
              
              {details.tags && details.tags.length > 0 && (
                <div>
                  <label className="font-medium">Tags:</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {details.tags.map((tag, idx) => (
                      <span key={idx} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {details.signedBy?.length > 0 && (
                <div>
                  <label className="font-medium">Signatures:</label>
                  <ul className="list-disc pl-5 text-gray-700">
                    {details.signedBy.map((signature, idx) => (
                      <li key={idx}>
                        {signature.signedBy} - {new Date(signature.signedAt).toLocaleString()}
                        {signature.remarks && (
                          <span className="text-gray-500 text-sm ml-2">
                            (Remarks: {signature.remarks})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {details.rejectionDetails && (
                <div className="bg-red-50 p-3 rounded">
                  <label className="font-medium text-red-700">Rejection Details:</label>
                  <p className="text-red-600">
                    {details.rejectionDetails.rejectionReason} 
                    <span className="text-sm text-red-500 ml-2">
                      (By: {details.rejectionDetails.rejectedBy})
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}