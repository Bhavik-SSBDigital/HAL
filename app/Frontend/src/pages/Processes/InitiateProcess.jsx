import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import {
  GetWorkflows,
  ProcessInitiate,
  uploadDocumentInProcess,
} from '../../common/Apis';
import { upload } from '../../components/drop-file-input/FileUploadDownload';
import Show from '../workflows/Show';
import { toast } from 'react-toastify';
import { IconInfoCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function InitiateProcess() {
  const navigate = useNavigate();
  const [workflowData, setWorkflowData] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');

  const defaultvalues = {
    processName: '',
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
    if (!selectedFile || !tags.length) return;
    setUploading(true);
    try {
      // Pass tags along with file
      const res = await uploadDocumentInProcess(
        [selectedFile],
        selectedFile?.name,
        tags,
      );
      toast.success('File Uploaded');
      addDocument({ documentId: res[0], name: selectedFile?.name, tags: tags });
      setNewTag('');
      setTags([]);
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = null;
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const res = await ProcessInitiate(data);
      toast.success(res?.data?.message);
      navigate('/processes/work');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  return (
    <div className="border border-slate-300 bg-white p-6 rounded-lg shadow-sm w-full max-w-4xl mx-auto">
      <h2 className="text-2xl text-center font-semibold mb-4">
        Initiate Process
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Process Name */}
        <div>
          <label className="block text-sm font-medium">Process Name</label>
          <input
            {...register('processName', {
              required: 'Process Name is required',
            })}
            className="w-full border p-2 rounded-md"
          />
          {errors.processName && (
            <p className="text-red-500 text-sm">{errors.processName.message}</p>
          )}
        </div>
        {/* description */}
        <div>
          <label className="block text-sm font-medium">Description</label>
          <input
            {...register('description', {
              required: 'Description is required',
            })}
            className="w-full border p-2 rounded-md"
          />
          {errors.description && (
            <p className="text-red-500 text-sm">{errors.description.message}</p>
          )}
        </div>

        {/* Workflow Selection */}
        <div>
          <label className="block text-sm font-medium">Select Workflow</label>
          <select
            className="w-full border p-2 rounded-md"
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
          <label className="block text-sm font-medium">Select Version</label>
          <Controller
            name="workflowId"
            control={control}
            rules={{ required: 'Version selection is required' }}
            render={({ field }) => (
              <select
                {...field}
                className="w-full border p-2 rounded-md"
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
            <p className="text-red-500 text-sm">{errors.workflowId.message}</p>
          )}
        </div>

        {/* Show Workflow Steps */}
        {workflowId && (
          <div className="border border-slate-400 rounded-md p-2 shadow-xl">
            <Show
              steps={
                selectedWorkflow?.versions?.find(
                  (item) => item.id == workflowId,
                )?.steps
              }
            />
          </div>
        )}

        {/* File Upload Section */}
        <div className="p-6 bg-white border border-slate-300 rounded-lg shadow-xl mx-auto">
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
                className="border border-gray-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500"
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
                className="bg-button-success-default hover:bg-button-success-hover text-white px-4 py-2 rounded-md transition"
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
                    onClick={() => setTags(tags.filter((_, i) => i !== index))}
                  >
                    {tag} <span className="text-lg">&times;</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploading || !tags.length}
            className="w-full mt-4 py-3 bg-button-secondary-default hover:bg-button-secondary-hover text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>

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
                        <p className="text-md">Tags : {doc.tags.join(', ')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      ✖
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-button-primary-default hover:bg-button-primary-hover text-white px-4 py-2 rounded-md w-full"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
