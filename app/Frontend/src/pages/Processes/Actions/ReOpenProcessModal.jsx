import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { uploadDocumentInProcess, ReOpenProcess } from '../../../common/Apis';
import { toast } from 'react-toastify';
import CustomButton from '../../../CustomComponents/CustomButton';
import { IconSquarePlus, IconSquareX } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function ReOpenProcessModal({
  processId,
  documents = [],
  close,
}) {
  const {
    control,
    handleSubmit,
    register,
    getValues,
    setValue,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      processId,
      supersededDocuments: [
        {
          oldDocumentId: '',
          newDocumentId: '',
          uploadedFileName: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'supersededDocuments',
  });
  const navigate = useNavigate();

  const handleUpload = async (file, index) => {
    if (!file) return;
    try {
      const res = await uploadDocumentInProcess([file]);
      const newId = res[0];
      const updated = [...getValues('supersededDocuments')];
      updated[index].newDocumentId = newId;
      updated[index].uploadedFileName = file.name;

      reset((prev) => ({
        ...prev,
        supersededDocuments: updated,
      }));

      toast.success('Document uploaded successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message);
    }
  };

  const onSubmit = async (data) => {
    const valid = data.supersededDocuments.every(
      (item) => item.oldDocumentId && item.newDocumentId,
    );
    if (!valid) {
      toast.warning('Please select documents and upload replacements.');
      return;
    }

    try {
      const res = await ReOpenProcess({
        processId,
        supersededDocuments: data.supersededDocuments.map((d) => ({
          oldDocumentId: parseInt(d.oldDocumentId, 10),
          newDocumentId: d.newDocumentId,
        })),
      });

      toast.success(res?.data?.message || 'Process reopened');
      navigate('/processes/completed');
      close();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Reopen Process</h2>

      {fields.map((field, index) => {
        const uploadedFileName = watch(
          `supersededDocuments.${index}.uploadedFileName`,
        );
        const selectedId = watch(`supersededDocuments.${index}.oldDocumentId`);

        return (
          <div
            key={field.id}
            className="p-4 border bg-gray-50 rounded-md shadow-sm space-y-3 relative"
          >
            {index !== 0 ? (
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-1 right-1 text-red-500"
                title="Remove"
              >
                <IconSquareX size={20} />
              </button>
            ) : null}

            <div>
              <label className="block text-sm font-medium mb-1">
                Select Document to Replace
              </label>
              <select
                {...register(`supersededDocuments.${index}.oldDocumentId`)}
                required
                className="w-full border p-2 rounded text-sm"
              >
                <option value="">-- Select Document --</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Upload Replacement Document
              </label>
              <input
                type="file"
                className="w-full border p-2 rounded text-sm"
                onChange={(e) => handleUpload(e.target.files[0], index)}
              />
              {uploadedFileName && (
                <p className="text-sm text-green-600 mt-1">
                  Uploaded: {uploadedFileName}
                </p>
              )}
            </div>

            <input
              type="hidden"
              {...register(`supersededDocuments.${index}.newDocumentId`)}
            />
            <input
              type="hidden"
              {...register(`supersededDocuments.${index}.uploadedFileName`)}
            />
          </div>
        );
      })}

      <CustomButton
        type="button"
        variant="secondary"
        click={() =>
          append({
            oldDocumentId: '',
            newDocumentId: '',
            uploadedFileName: '',
          })
        }
        className={'mx-auto block'}
        text={
          <div className="flex items-center gap-2">
            <IconSquarePlus size={18} />
            Add Document to Replace
          </div>
        }
      />

      <div className="flex justify-end gap-2 pt-4">
        <CustomButton
          type="button"
          variant="danger"
          text="Cancel"
          click={close}
          disabled={isSubmitting}
        />
        <CustomButton
          type="submit"
          text="Reopen Process"
          disabled={isSubmitting}
        />
      </div>
    </form>
  );
}
