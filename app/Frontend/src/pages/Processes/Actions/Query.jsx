import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import CustomButton from '../../../CustomComponents/CustomButton';
import { IconSquareX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { CreateQuery, uploadDocumentInProcess } from '../../../common/Apis';

export default function Query({ processId, close, stepInstanceId, documents }) {
  const [formType, setFormType] = useState('replacement');

  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      processId,
      stepInstanceId,
      queryText: '',
      documentChanges: [],
      documentSummaries: [],
    },
  });

  const {
    fields: summaryFields,
    append: appendSummary,
    remove: removeSummary,
  } = useFieldArray({ control, name: 'documentSummaries' });

  const {
    fields: changeFields,
    append: appendChange,
    remove: removeChange,
  } = useFieldArray({ control, name: 'documentChanges' });

  //   handlers
  const handleDocumentUpload = async (file, index) => {
    if (!file) return;

    try {
      const response = await uploadDocumentInProcess([file]);
      const uploadedDocumentId = response[0];

      const updatedChanges = [...getValues('documentChanges')];
      updatedChanges[index].documentId = uploadedDocumentId;
      updatedChanges[index].uploadedFileName = file.name; // <-- Store file name

      reset((prev) => ({
        ...prev,
        documentChanges: updatedChanges,
      }));

      toast.success('Document uploaded successfully');
    } catch (err) {
      toast.error(
        'Upload failed: ' + (err.response?.data?.message || err.message),
      );
    }
  };

  const onSubmit = async (data) => {
    try {
      const response = await CreateQuery(data);
      toast.success(response?.data?.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* <div className="w-full">
        <label className="block text-sm font-medium mb-1">Form Type</label>
        <select
          className="border rounded p-2 w-full"
          value={formType}
          onChange={(e) => {
            reset({
              processId,
              stepInstanceId,
              queryText: '',
              // processSummary: '',
              documentChanges: [],
              documentSummaries: [],
              recirculateFromStepId: '',
            });
            setFormType(e.target.value);
          }}
        >
          <option value="query">Query</option>
          <option value="replacement">Replacement</option>
        </select>
      </div> */}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Common Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* <div>
            <label className="block text-sm font-medium mb-1">Process ID</label>
            <input
              {...register('processId')}
              disabled
              className="w-full border p-2 rounded"
              placeholder="Process ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Step Instance ID
            </label>
            <input
              disabled
              {...register('stepInstanceId')}
              className="w-full border p-2 rounded"
              placeholder="Step Instance ID"
            />
          </div> */}

          {/* <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Recirculate From Step ID
            </label>
            <input
              {...register('recirculateFromStepId')}
              className="w-full border p-2 rounded"
              placeholder="Recirculate From Step ID"
            />
          </div> */}
        </div>

        {/* Query Form */}
        {formType === 'query' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Query Text
              </label>
              <textarea
                {...register('queryText')}
                required
                className="w-full border p-2 rounded"
                rows={3}
                placeholder="Enter your query here"
              />
            </div>

            {/* <div>
              <label className="block text-sm font-medium mb-1">
                Process Summary
              </label>
              <textarea
                {...register('processSummary')}
                required
                className="w-full border p-2 rounded"
                rows={3}
                placeholder="Write a summary of the process"
              />
            </div> */}

            <div>
              <h3 className="text-lg font-semibold mb-2">Document Summaries</h3>
              {summaryFields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded p-4 mb-4 space-y-3 bg-gray-50 relative"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Document
                    </label>
                    <select
                      {...register(`documentSummaries.${index}.documentId`)}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">Select Document</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Summary Text
                    </label>
                    <textarea
                      {...register(`documentSummaries.${index}.feedbackText`)}
                      className="w-full border p-2 rounded"
                      required
                      rows={2}
                      placeholder="Enter document summary"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSummary(index)}
                    className="font-bold text-red-500 absolute top-[-5px] right-1"
                  >
                    <IconSquareX size={20} />
                  </button>
                </div>
              ))}
              <CustomButton
                type="button"
                click={() => appendSummary({ documentId: '', feedbackText: '' })}
                text={'Add Summary'}
              />
            </div>
          </>
        )}

        {/* Replacement Form */}
        {formType === 'replacement' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Query Text
              </label>
              <textarea
                {...register('queryText')}
                required
                className="w-full border p-2 rounded"
                rows={3}
                placeholder="Write a summary of the process"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Document Summaries</h3>
              <table className="w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Document Name</th>
                    <th className="border p-2 text-left">Summary Text</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={doc.id} className="bg-white">
                      <td className="border p-2">{doc.name}</td>
                      <td className="border p-2">
                        <textarea
                          {...register(
                            `documentSummaries.${index}.feedbackText`,
                          )}
                          className="w-full border p-2 rounded"
                          rows={2}
                          placeholder="Enter document summary"
                        />
                        {/* Hidden input to include documentId in form submission */}
                        <input
                          type="hidden"
                          value={doc.id}
                          {...register(`documentSummaries.${index}.documentId`)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Document Changes</h3>
              {changeFields.map((field, index) => {
                const isReplacement = watch(
                  `documentChanges.${index}.isReplacement`,
                );
                const uploadedFileName = watch(
                  `documentChanges.${index}.uploadedFileName`,
                );

                return (
                  <div
                    key={field.id}
                    className="border rounded p-4 mb-4 space-y-3 bg-gray-50 relative"
                  >
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        {...register(`documentChanges.${index}.isReplacement`)}
                      />
                      Is Replacement
                    </label>

                    {isReplacement && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Document to Change
                        </label>
                        <select
                          {...register(
                            `documentChanges.${index}.replacesDocumentId`,
                          )}
                          required
                          className="w-full border p-2 rounded"
                        >
                          <option value="">Select Document</option>
                          {documents.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                              {doc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Upload {!isReplacement ? 'New' : 'Replacement'} Document
                      </label>
                      <input
                        type="file"
                        className="block w-full border p-2 rounded"
                        onChange={(e) =>
                          handleDocumentUpload(e.target.files[0], index)
                        }
                      />
                      {uploadedFileName && (
                        <p className="text-sm text-green-600 mt-1">
                          Uploaded: {uploadedFileName}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeChange(index)}
                      className="font-bold text-red-500 absolute top-[-5px] right-1"
                    >
                      <IconSquareX size={20} />
                    </button>
                  </div>
                );
              })}

              <CustomButton
                type="button"
                click={() =>
                  appendChange({
                    documentId: '',
                    requiresApproval: false,
                    isReplacement: true,
                  })
                }
                text={'Add Change'}
              />
            </div>
          </>
        )}

        <div className="flex gap-1">
          <CustomButton
            className={'w-full'}
            click={close}
            type="button"
            variant={'danger'}
            text={'Cancel'}
            disabled={isSubmitting}
          />
          <CustomButton
            className={'w-full'}
            type="submit"
            text={'Submit'}
            disabled={isSubmitting}
          />
        </div>
      </form>
    </div>
  );
}
