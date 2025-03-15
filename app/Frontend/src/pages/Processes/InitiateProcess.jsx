import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { GetWorkflows } from '../../common/Apis';
import { upload } from '../../components/drop-file-input/FileUploadDownload';
import Show from '../workflows/Show';

export default function InitiateProcess() {
  const [workflowData, setWorkflowData] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tagModal, setTagModal] = useState({ isOpen: false, index: null });
  const [newTag, setNewTag] = useState('');

  const {
    control,
    handleSubmit,
    register,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      processName: '',
      selectedVersion: '',
      documents: [],
    },
  });
  const [selectedVersion] = watch(['selectedVersion']);
  const {
    fields: documentFields,
    append: addDocument,
    remove: removeDocument,
  } = useFieldArray({ control, name: 'documents' });

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    console.log(selectedFile);
    setUploading(true);
    const response = await upload([selectedFile]);
    setTimeout(() => {
      const fakeDocId = `doc-${Date.now()}`;
      addDocument({ docId: fakeDocId, tags: [] });
      setUploading(false);
      setSelectedFile(null);
    }, 1000);
  };
  const onSubmit = (data) => {
    console.log('Form Data:', data);
  };

  // Fetch workflows from API
  const getWorkflowsData = async () => {
    try {
      const response = await GetWorkflows();
      setWorkflowData(response?.data?.workflows || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getWorkflowsData();
  }, []);

  return (
    <div className="border border-slate-300 bg-white p-6 rounded-lg shadow-sm w-full max-w-6xl mx-auto">
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
              setValue('selectedVersion', ''); // Reset version selection
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

        {/* Version Selection (only enabled if workflow is selected) */}
        <div>
          <label className="block text-sm font-medium">Select Version</label>
          <Controller
            name="selectedVersion"
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
          {errors.selectedVersion && (
            <p className="text-red-500 text-sm">
              {errors.selectedVersion.message}
            </p>
          )}
        </div>

        {selectedVersion && (
          <Show
            steps={
              selectedWorkflow?.versions?.find(
                (item) => item.id == selectedVersion,
              ).steps
            }
          />
        )}

        {/* Documents Upload Section */}
        <div className="space-y-6 bg-white rounded-lg">
          {/* File Upload Section */}
          <div className="p-6 bg-gray-50 border border-slate-500 rounded-lg shadow-sm">
            <label className="block text-lg font-semibold text-gray-700">
              Upload Document
            </label>
            <div className="flex items-center gap-3 mt-4">
              {/* Choose File Button */}
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg cursor-pointer transition duration-300 shadow-md">
                📁 Choose File
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {/* Selected File Name */}
              {selectedFile && (
                <span className="text-gray-700 text-sm font-medium truncate max-w-xs">
                  {selectedFile.name}
                </span>
              )}

              {/* Upload Button */}
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition duration-300 shadow-md disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0a12 12 0 00-12 12h4zm2 5.291A8 8 0 0112 20v4a12 12 0 01-12-12h4a8 8 0 002 5.291z"
                      />
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  'Upload'
                )}
              </button>
            </div>
          </div>

          {/* Document List Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Documents</h2>
            {documentFields.length === 0 ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-300 text-blue-700 px-4 py-3 rounded-lg mt-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20 10 10 0 010-20z"
                  />
                </svg>
                <p className="text-sm font-medium">
                  No documents added yet. Upload files to proceed.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {documentFields.map((doc, index) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-gray-50 border border-slate-500 rounded-lg shadow-md"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">
                        {doc.docId}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-500 hover:text-red-600 text-sm transition"
                      >
                        ✖ Remove
                      </button>
                    </div>

                    {/* Tag Management */}
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        <Controller
                          control={control}
                          name={`documents.${index}.tags`}
                          render={({ field }) => (
                            <>
                              {field.value.map((tag, i) => (
                                <span
                                  key={i}
                                  className="bg-purple-600 text-white px-2 py-1 text-xs rounded-full cursor-pointer transition hover:bg-purple-700"
                                  onClick={() => {
                                    const newTags = field.value.filter(
                                      (_, tagIndex) => tagIndex !== i,
                                    );
                                    setValue(
                                      `documents.${index}.tags`,
                                      newTags,
                                    );
                                  }}
                                >
                                  {tag} &times;
                                </span>
                              ))}
                            </>
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setTagModal({ isOpen: true, index })}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 text-xs rounded-lg transition"
                        >
                          + Add Tag
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md w-full"
        >
          Submit
        </button>
      </form>

      {/* Tag Modal */}
      {tagModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm px-4">
          <div className="bg-white p-6 max-w-md w-full rounded-md shadow-md">
            <h3 className="text-lg font-semibold">Add Tag</h3>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="border p-2 rounded-md w-full mt-2"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setTagModal({ isOpen: false, index: null })}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newTag.trim()) {
                    setValue(`documents.${tagModal.index}.tags`, [
                      ...getValues('documents')[tagModal.index].tags,
                      newTag.trim(),
                    ]);
                    setNewTag('');
                    setTagModal({ isOpen: false, index: null });
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
