import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { useState } from 'react';

export default function ProcessInitForm() {
  const { control, register, handleSubmit, watch } = useForm({
    defaultValues: {
      documents: [
        { type: '', description: '', attachments: [], confidential: false },
      ],
      useSavedWorkflow: '',
      workflowDetails: {},
      processOwnership: 'department',
      workflowType: 'serial',
      approvalFlow: [],
      additionalSettings: {
        timeLimit: '',
        allowQA: false,
        allowRemarks: false,
      },
    },
  });

  const { fields, append } = useFieldArray({ control, name: 'documents' });
  const watchSavedWorkflow = watch('useSavedWorkflow');
  const watchWorkflowType = watch('workflowType');

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        <h2 className="text-2xl font-bold mb-4 text-black text-center">
          Initiate Process Form
        </h2>

        {/* Document Details */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Document Details</h3>
          {fields.map((item, index) => (
            <div key={item.id} className="border p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  {...register(`documents.${index}.type`)}
                  className="border p-2 rounded"
                >
                  <option value="">Select Type</option>
                  <option value="PO">PO</option>
                  <option value="QC Report">QC Report</option>
                  <option value="Incident Report">Incident Report</option>
                </select>
                <input
                  {...register(`documents.${index}.description`)}
                  placeholder="Description"
                  className="border p-2 rounded w-full"
                />
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register(`documents.${index}.confidential`)}
                  />
                  <span>Confidential</span>
                </label>
              </div>
              <input
                type="file"
                multiple
                {...register(`documents.${index}.attachments`)}
                className="mt-2"
              />
            </div>
          ))}
          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() =>
              append({
                type: '',
                description: '',
                attachments: [],
                confidential: false,
              })
            }
          >
            + Add Document
          </button>
        </div>

        {/* Workflow Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Use Saved Workflow?</h3>
          <select
            {...register('useSavedWorkflow')}
            className="border p-2 rounded w-full"
          >
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
          {watchSavedWorkflow === 'Yes' && (
            <select
              {...register('workflowDetails.savedWorkflow')}
              className="border p-2 rounded w-full mt-2"
            >
              <option value="">Select Workflow</option>
              <option value="Workflow A">Workflow A</option>
              <option value="Workflow B">Workflow B</option>
            </select>
          )}
        </div>

        {/* Process Ownership */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Process Ownership</h3>
          <select
            {...register('processOwnership')}
            className="border p-2 rounded w-full"
          >
            <option value="department">Department</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        {/* Process Type & Flow */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Process Type & Flow</h3>
          <select
            {...register('workflowType')}
            className="border p-2 rounded w-full"
          >
            <option value="serial">Serial</option>
            <option value="parallel">Parallel</option>
          </select>
          {watchWorkflowType === 'serial' && (
            <input
              {...register('approvalFlow.step1')}
              placeholder="Approval Flow"
              className="border p-2 rounded w-full mt-2"
            />
          )}
        </div>

        {/* Additional Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Additional Settings</h3>
          <input
            {...register('additionalSettings.timeLimit')}
            placeholder="Time Limit (days)"
            className="border p-2 rounded w-full"
          />
          <div className="flex items-center space-x-4 mt-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('additionalSettings.allowQA')}
              />
              <span>Allow Private Q/A?</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('additionalSettings.allowRemarks')}
              />
              <span>Allow Public Remarks?</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-green-500 text-white px-6 py-2 rounded w-full"
        >
          Submit Process
        </button>
      </form>
    </div>
  );
}
