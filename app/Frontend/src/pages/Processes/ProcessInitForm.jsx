import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Workflow from '../../common/Workflow';

function ProcessInitForm() {
  const { control, register, handleSubmit, watch } = useForm({
    defaultValues: {
      documents: [
        { type: '', description: '', attachments: [], confidential: false },
      ],
      useSavedWorkflow: '',
      selectedWorkflow: '',
      processOwnership: '',
    },
  });

  const { fields, append } = useFieldArray({ control, name: 'documents' });
  const [workFlow, setWorkFlow] = useState([
    { step: 1, role: 'hey' },
    { step: 2, role: 'hello' },
    { step: 3, role: 'check' },
  ]);

  const watchSavedWorkflow = watch('useSavedWorkflow');
  const watchSelectedWorkflow = watch('selectedWorkflow');
  const watchProcessOwnership = watch('processOwnership');

  const onSubmit = (data) => console.log(data);

  return (
    <div className="p-8 bg-white shadow-xl rounded-lg max-w-3xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        <h2 className="text-3xl font-bold mb-6 text-black text-center">
          Initiate Process Form
        </h2>

        {/* Documents Section */}
        <div className="space-y-4">
          {fields.map((item, index) => (
            <div key={item.id} className="border p-4 rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  {...register(`documents.${index}.type`)}
                  className="border p-2 rounded w-full"
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
                className="mt-2 w-full"
              />
            </div>
          ))}
        </div>

        {/* Add Document Button */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
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

        {/* Use Saved Workflow */}
        <h3 className="text-lg font-semibold mt-6">Use Saved Workflow?</h3>
        <select
          {...register('useSavedWorkflow')}
          className="border p-2 rounded w-full mb-4"
        >
          <option value="">Select</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>

        {/* If Yes, show dropdown to select workflow */}
        {watchSavedWorkflow === 'Yes' && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Select a Workflow</h3>
            <select
              {...register('selectedWorkflow')}
              className="border p-2 rounded w-full"
            >
              <option value="">Select Workflow</option>
              <option value="Workflow A">Workflow A</option>
              <option value="Workflow B">Workflow B</option>
              <option value="Workflow C">Workflow C</option>
            </select>
          </div>
        )}

        {/* If No, show Workflow creation options */}
        {watchSavedWorkflow === 'No' && (
          <>
            <h3 className="text-lg font-semibold mt-4">
              Do you have a workflow in mind?
            </h3>
            <select
              {...register('processOwnership')}
              className="border p-2 rounded w-full mb-4"
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>

            {watchProcessOwnership === 'Yes' && (
              <Workflow
                workFlow={workFlow}
                setWorkFlow={setWorkFlow}
                maxStepNumberReached={5}
              />
            )}
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded w-full mt-6"
        >
          Submit Process
        </button>
      </form>
    </div>
  );
}

export default ProcessInitForm;
