import React, { useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';

const workflowData = [
  {
    name: 'testing',
    versions: [
      {
        id: '4786b342-779d-4bcd-95be-db9e4cea8229',
        version: 1,
        description: '1212',
        createdAt: '2025-03-12T06:31:10.411Z',
      },
    ],
  },
];

export default function InitiateProcess() {
  const {
    control,
    handleSubmit,
    register,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      processName: '',
      selectedVersion: '',
      documents: [],
    },
  });

  const {
    fields: documentFields,
    append: addDocument,
    remove: removeDocument,
  } = useFieldArray({ control, name: 'documents' });

  const [uploading, setUploading] = useState(false);
  const [tagModal, setTagModal] = useState({ isOpen: false, index: null });
  const [newTag, setNewTag] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setTimeout(() => {
      const fakeDocId = `doc-${Date.now()}`;
      addDocument({ docId: fakeDocId, tags: [] });
      setUploading(false);
    }, 1000);
  };

  const onSubmit = (data) => {
    console.log('Form Data:', data);
  };

  return (
    <div className="border border-gray-300 bg-white p-6 rounded-md shadow-md w-full max-w-6xl mx-auto">
      <h2 className="text-2xl text-center font-semibold mb-4">
        Initiate Process
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <div>
          <label className="block text-sm font-medium">Select Version</label>
          <Controller
            name="selectedVersion"
            control={control}
            rules={{ required: 'Version selection is required' }}
            render={({ field }) => (
              <select {...field} className="w-full border p-2 rounded-md">
                <option value="">Select a Version</option>
                {workflowData.flatMap((wf) =>
                  wf.versions.map((ver) => (
                    <option key={ver.id} value={ver.id}>
                      Version {ver.version} - {ver.description}
                    </option>
                  )),
                )}
              </select>
            )}
          />
          {errors.selectedVersion && (
            <p className="text-red-500 text-sm">
              {errors.selectedVersion.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Documents</label>
          <input type="file" onChange={handleFileUpload} className="mb-2" />
          {uploading && <p className="text-sm text-gray-500">Uploading...</p>}

          <table className="w-full border-collapse border border-gray-300 mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Document ID</th>
                <th className="border p-2">Tags</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documentFields.map((doc, index) => (
                <tr key={doc.id} className="border">
                  <td className="border p-2">{doc.docId}</td>
                  <td className="border p-2">
                    <Controller
                      control={control}
                      name={`documents.${index}.tags`}
                      render={({ field }) => (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((tag, i) => (
                            <span
                              key={i}
                              className="bg-blue-500 text-white px-2 py-1 text-xs rounded-md cursor-pointer"
                              onClick={() => {
                                const newTags = field.value.filter(
                                  (_, tagIndex) => tagIndex !== i,
                                );
                                setValue(`documents.${index}.tags`, newTags);
                              }}
                            >
                              {tag} &times;
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => setTagModal({ isOpen: true, index })}
                            className="bg-green-500 text-white px-2 py-1 text-xs rounded-md"
                          >
                            + Add Tag
                          </button>
                        </div>
                      )}
                    />
                  </td>
                  <td className="border p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md w-full"
        >
          Submit
        </button>
      </form>

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
                      ...documentFields[tagModal.index].tags,
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
