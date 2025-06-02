import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import CustomButton from '../../../CustomComponents/CustomButton';
import { IconSquareX } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  createRecommend,
  GetUsersWithDetails,
  respondRecommendation,
} from '../../../common/Apis';

export default function RespondRecommendation({
  recommendationId,
  close,
  documents,
}) {
  // variables
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
      recommendationId,
      responseText: '',
      documentResponses: [],
    },
  });
  const navigate = useNavigate();
  const {
    fields: summaryFields,
    append: appendSummary,
    remove: removeSummary,
  } = useFieldArray({ control, name: 'documentResponses' });

  //   handlers
  const onSubmit = async (data) => {
    try {
      console.log(data);
      const response = await respondRecommendation(data);
      toast.success(response?.data?.message);
      navigate('/recommendations');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">
            Response Text
          </label>
          <textarea
            {...register('responseText')}
            required
            className="w-full border p-2 rounded"
            rows={3}
            placeholder="Write your query here"
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
              {documents?.map((doc, index) => (
                <tr key={doc.documentId} className="bg-white">
                  <td className="border p-2">{doc.documentName}</td>
                  <td className="border p-2">
                    <textarea
                      {...register(`documentResponses.${index}.answerText`)}
                      className="w-full border p-2 rounded"
                      rows={2}
                      placeholder="Enter document summary"
                    />
                    {/* Hidden input for documentId */}
                    <input
                      type="hidden"
                      value={doc.documentId}
                      {...register(`documentResponses.${index}.documentId`)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
