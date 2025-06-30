import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  GenerateDocumentName,
  GetWorkflows,
  getWorkflowTemplates,
  ProcessInitiate,
  uploadDocumentInProcess,
  useTemplateDocument,
  ViewDocument,
} from '../../common/Apis';
import { upload } from '../../components/drop-file-input/FileUploadDownload';
import Show from '../workflows/Show';
import { toast } from 'react-toastify';
import { IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import ViewFile from '../view/View';
import CustomCard from '../../CustomComponents/CustomCard';

export default function InitiateProcess() {
  const navigate = useNavigate();
  const [workflowData, setWorkflowData] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [templates, setTemplates] = useState([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [fileView, setFileView] = useState(null);

  const defaultvalues = {
    workflowId: '',
    description: '',
    documents: [],
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
  } = useForm({
    defaultValues: defaultvalues,
  });

  const [workflowId] = watch(['workflowId']);
  const {
    fields: documentFields,
    append: addDocument,
    remove: removeDocument,
  } = useFieldArray({ control, name: 'documents' });

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

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const inputRef = useRef(null);
  const handleUpload = async () => {
    if (!workflowId) {
      toast.info('Please select workflow.');
      return;
    }

    if (!selectedFile || !tags.length) return;

    setActionsLoading(true);

    try {
      // Generate file name from backend

      const generatedName = await GenerateDocumentName(workflowId, null ,selectedFile.name.split('.').pop());

      // Upload file using generated name and tags
      const res = await uploadDocumentInProcess(
        [selectedFile],
        generatedName?.data?.documentName,
        tags,
      );

      // Success logic
      toast.success('File uploaded successfully');
      addDocument({
        documentId: res[0],
        name: generatedName?.data?.documentName,
        tags: tags,
      });

      // Reset form
      setNewTag('');
      setTags([]);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = null;
    } catch (err) {
      // Show relevant error
      toast.error(err?.response?.data?.message || err.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setActionsLoading(true);
    if (data?.documents?.length === 0) {
      toast.info('Please upload documents for process');
      return;
    }
    try {
      const res = await ProcessInitiate(data);
      toast.success(res?.data?.message);
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
      const res = await useTemplateDocument({
        workflowId: workflowId,
        templateId: template?.id,
      });
      toast.success(res?.data?.message);
      addDocument({
        documentId: res?.data?.documentId,
        name: res?.data?.documentName,
        tags: [],
        documentPath: res?.data?.documentPath,
        description:
          'This document is prepared from template document, please edit if you want to add the latest data in the document',
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

  return (
    <>
      {actionsLoading ? <TopLoader /> : null}
      <CustomCard className={'max-w-7xl mx-auto'}>
        <h2 className="text-3xl text-center font-bold mb-6 text-gray-800">
          Initiate Process
        </h2>

        <form className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              {...register('description', {
                required: 'Description is required',
              })}
              className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Workflow
            </label>
            <select
              className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => {
                const selected = workflowData.find(
                  (wf) => wf.name === e.target.value,
                );
                setSelectedWorkflow(selected);
              }}
            >
              <option value="">Select a Workflow</option>
              {workflowData.map((wf) => (
                <option key={wf.name} value={wf.name}>
                  {wf.name}
                </option>
              ))}
            </select>
          </div>

          {/* Version Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Version
            </label>
            <Controller
              name="workflowId"
              control={control}
              rules={{ required: 'Version selection is required' }}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedWorkflow}
                >
                  <option value="">Select a Version</option>
                  {selectedWorkflow?.versions.map((ver) => (
                    <option key={ver.id} value={ver.id}>
                      Version {ver.version} - {ver.description}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.workflowId && (
              <p className="text-red-500 text-sm mt-1">
                {errors.workflowId.message}
              </p>
            )}
          </div>

          {/* Show Workflow Steps */}
          {workflowId && (
            <div className="border border-gray-400 rounded-md p-4 shadow-lg">
              <Show
                steps={
                  selectedWorkflow?.versions?.find(
                    (item) => item.id === workflowId,
                  )?.steps
                }
              />
            </div>
          )}

          {/* Template Section */}
          {templates?.length > 0 && (
            <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-lg mx-auto mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Available Templates
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex justify-between items-center border p-4 rounded-md bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {template.path}
                      </p>
                    </div>
                    <CustomButton
                      type="button"
                      text={'Use'}
                      click={() => handleUseTemplate(template)}
                      title={'Use Template'}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* File Upload Section */}
          <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-lg mx-auto">
            <label className="block text-lg font-semibold text-gray-800 mb-2">
              Upload Document
            </label>

            {/* File Selection */}
            <div className="flex flex-col items-center gap-3 p-4 border border-dashed border-gray-400 rounded-lg bg-gray-100 hover:bg-gray-200 transition cursor-pointer">
              <label className="flex flex-col items-center gap-2 text-gray-700 font-medium cursor-pointer">
                <span className="text-2xl">📂</span>
                <span className="text-sm">Click to choose a file</span>
                <input
                  type="file"
                  ref={inputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="mt-2 w-full text-center">
                  <span className="text-gray-800 font-medium text-sm truncate block">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    className="text-red-500 text-xs mt-1 hover:underline"
                    onClick={() => setSelectedFile(null)}
                  >
                    Remove File
                  </button>
                </div>
              )}
            </div>

            {/* Tag Input */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                Add Tags
              </label>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => {
                    const sanitizedValue = e.target.value.replace(
                      /[^a-zA-Z0-9 ]/g,
                      '',
                    );
                    setNewTag(sanitizedValue);
                  }}
                  className="border border-gray-300 p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tag..."
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTag.trim()) {
                      setTags([...tags, newTag.trim()]);
                      setNewTag('');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
                >
                  Add
                </button>
              </div>

              {/* Tags List */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-purple-600 text-white px-3 py-1 text-sm rounded-full flex items-center gap-1 cursor-pointer hover:bg-purple-700 transition"
                      onClick={() =>
                        setTags(tags.filter((_, i) => i !== index))
                      }
                    >
                      {tag} <span className="text-lg">&times;</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Button */}
            <CustomButton
              type="button"
              click={handleUpload}
              text={'Upload Document'}
              disabled={!selectedFile || actionsLoading || !tags.length}
              className="w-full mt-4"
            />

            {/* Document List */}
            <div className="mt-5">
              <h2 className="text-xl font-semibold text-gray-800">
                Uploaded Documents
              </h2>
              {documentFields.length === 0 ? (
                <p className="flex font-semibold align-middle gap-2 text-sm text-gray-500 mt-2 bg-purple-100 p-3 rounded-md text-black">
                  <IconInfoCircle color="blue" /> No documents uploaded yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {documentFields.map((doc, index) => (
                    <li
                      key={doc.documentId}
                      className="flex items-center justify-between p-2 bg-white border rounded-lg shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-400 flex items-center justify-center rounded-full">
                          📄
                        </div>
                        <hr className="bg-slate-200 text-white w-[2px] min-h-[70px]" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            {doc.name || 'Unnamed Document'}
                          </p>
                          <p className="text-md">ID : {doc.documentId}</p>
                          <p className="text-md">
                            Tags : {doc.tags.join(', ')}
                          </p>
                          {doc.description && (
                            <p className="text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-md mt-1 w-fit">
                              ℹ️ {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <CustomButton
                          type="button"
                          click={() =>
                            handleViewFile(
                              doc.name,
                              doc.documentPath || '/check',
                              doc.documentId,
                              doc.name?.split('.').pop(),
                              true,
                            )
                          }
                          text={'View'}
                        />
                        <CustomButton
                          type="button"
                          click={() => removeDocument(index)}
                          variant={'danger'}
                          text={'✖'}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={actionsLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full transition"
          >
            Submit
          </button>
        </form>
      </CustomCard>

      {/* Section 4: File Viewer Modal */}
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
