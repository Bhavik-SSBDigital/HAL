import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import CustomButton from '../../../CustomComponents/CustomButton';
import { IconSquareX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import {
  CreateQuery,
  GenerateDocumentName,
  uploadDocumentInProcess,
} from '../../../common/Apis';
import { useNavigate } from 'react-router-dom';

export default function QuerySolve({
  workflowId,
  processId,
  close,
  stepInstanceId,
  queryRaiserStepInstanceId,
  existingQuery,
  storagePath,
}) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      ...existingQuery,
      processId,
      stepInstanceId,
      queryRaiserStepInstanceId,
    },
  });
  const navigate = useNavigate();
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
  const handleDocumentUpload = async (file, index, replacedDocId) => {
    if (!file) return;

    try {
      // 🔹 Step 1: Generate document name from backend
      const generatedName = replacedDocId
        ? { data: { documentName: file.name } }
        : await GenerateDocumentName(
            workflowId,
            replacedDocId,
            file.name.split('.').pop(),
          );

      // 🔹 Step 2: Upload document with generated name
      const response = await uploadDocumentInProcess(
        [file],
        generatedName?.data?.documentName,
        [],
        storagePath,
        replacedDocId,
      );

      if (!response || !response.length || !response[0]) {
        throw new Error('Upload failed or returned no document ID');
      }

      const uploadedDocumentId = response[0];

      // 🔹 Step 3: Update form data
      const updatedChanges = [...getValues('documentChanges')];
      updatedChanges[index].documentId = uploadedDocumentId;
      updatedChanges[index].uploadedFileName =
        generatedName?.data?.documentName;

      reset((prev) => ({
        ...prev,
        documentChanges: updatedChanges,
      }));

      toast.success('Document uploaded successfully');
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Unexpected error occurred';
      toast.error(errorMsg);
    }
  };
  const handleStepChange = (e) => {
    const selectedStepName = e.target.value;
    const fullStepObj = steps.find(
      (step) => step.stepName === selectedStepName,
    );

    setValue('assignedStepName', selectedStepName); // Update form field
    setSelectedStep(fullStepObj); // Store the full object
  };
  const onSubmit = async (data) => {
    if (!data.documentChanges.length) {
      toast.warn('Document Changes Part Is Required.');
      return;
    }
    try {
      const response = await CreateQuery(data);
      toast.success(response?.data?.message);
      navigate('/processes/work');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Query Text</label>
          <textarea
            {...register('queryText')}
            required
            disabled
            className="w-full border p-2 rounded"
            rows={3}
            placeholder="Write your query here"
          />
        </div>
        {summaryFields.length !== 0 && (
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
                {summaryFields.map((doc, index) => (
                  <tr key={doc.documentId} className="bg-white">
                    <td className="border p-2">{doc?.documentDetails?.name}</td>
                    <td className="border p-2">
                      <textarea
                        {...register(`documentSummaries.${index}.feedbackText`)}
                        className="w-full border p-2 rounded"
                        disabled
                        rows={2}
                        placeholder="Enter document summary"
                      />
                      {/* Hidden input to include documentId in form submission */}
                      <input
                        type="hidden"
                        disabled
                        value={doc.id}
                        {...register(`documentSummaries.${index}.documentId`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                {summaryFields.length !== 0 && (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      {...register(`documentChanges.${index}.isReplacement`)}
                    />
                    Is Replacement
                  </label>
                )}

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
                      {summaryFields?.map((doc) => (
                        <option key={doc.documentId} value={doc.documentId}>
                          {doc?.documentDetails?.name}
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
                      handleDocumentUpload(
                        e.target.files[0],
                        index,
                        getValues(
                          `documentChanges.${index}.replacesDocumentId`,
                        ),
                      )
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
                isReplacement: false,
              })
            }
            text={'Add Change'}
          />
        </div>
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
