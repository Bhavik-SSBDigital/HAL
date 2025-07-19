import React, { useState } from 'react';
import {
  IconInfoCircle,
  IconSignature,
  IconX,
  IconAlertCircle,
  IconCheckupList,
  IconMessageCircle,
  IconThumbUp,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconUpload,
} from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';

const iconMap = {
  DOCUMENT_UPLOADED: <IconUpload size={20} className="text-green-700" />,
  PROCESS_INITIATED: <IconInfoCircle size={20} className="text-blue-600" />,
  DOCUMENT_SIGNED: <IconSignature size={20} className="text-green-600" />,
  DOCUMENT_REJECTED: <IconX size={20} className="text-red-600" />,
  QUERY_RAISED: <IconAlertCircle size={20} className="text-yellow-600" />,
  QUERY_RESOLVED: <IconCheckupList size={20} className="text-green-600" />,
  RECOMMENDATION_REQUESTED: (
    <IconMessageCircle size={20} className="text-purple-600" />
  ),
  RECOMMENDATION_PROVIDED: (
    <IconThumbUp size={20} className="text-purple-800" />
  ),
  STEP_COMPLETED: <IconCheck size={20} className="text-green-700" />,
};

const TimelineLegend = () => {
  const [expanded, setExpanded] = useState(false);

  const items = [
    {
      key: 'DOCUMENT_UPLOADED',
      label: 'Document Uploaded',
      description: 'Indicates that new document is uploaded in process.',
      icon: iconMap.DOCUMENT_UPLOADED,
    },
    {
      key: 'PROCESS_INITIATED',
      label: 'Process Initiated',
      description: 'Indicates the initiation of a process.',
      icon: iconMap.PROCESS_INITIATED,
    },
    {
      key: 'DOCUMENT_SIGNED',
      label: 'Document Signed',
      description: 'Indicates a document was signed.',
      icon: iconMap.DOCUMENT_SIGNED,
    },
    {
      key: 'DOCUMENT_REJECTED',
      label: 'Document Rejected',
      description: 'Indicates a document was rejected.',
      icon: iconMap.DOCUMENT_REJECTED,
    },
    {
      key: 'QUERY_RAISED',
      label: 'Query Raised',
      description: 'Indicates a query was raised during the process.',
      icon: iconMap.QUERY_RAISED,
    },
    {
      key: 'QUERY_RESOLVED',
      label: 'Query Resolved',
      description: 'Indicates a query was resolved successfully.',
      icon: iconMap.QUERY_RESOLVED,
    },
    {
      key: 'RECOMMENDATION_REQUESTED',
      label: 'Recommendation Requested',
      description: 'Indicates a recommendation was requested.',
      icon: iconMap.RECOMMENDATION_REQUESTED,
    },
    {
      key: 'RECOMMENDATION_PROVIDED',
      label: 'Recommendation Provided',
      description: 'Indicates a recommendation response was provided.',
      icon: iconMap.RECOMMENDATION_PROVIDED,
    },
    {
      key: 'STEP_COMPLETED',
      label: 'Step Completed',
      description: 'Indicates a step was successfully completed.',
      icon: iconMap.STEP_COMPLETED,
    },
  ];

  return (
    <CustomCard className="transition-all duration-300 ease-in-out">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between text-left text-green-700 font-semibold mb-2 hover:underline"
      >
        <span>Timeline Legend</span>
        {expanded ? (
          <IconChevronUp className="transition-transform duration-300" />
        ) : (
          <IconChevronDown className="transition-transform duration-300" />
        )}
      </button>

      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <table className="min-w-full table-auto border-collapse mt-2">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Icon</th>
              <th className="border px-4 py-2 text-left">Label</th>
              <th className="border px-4 py-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ key, label, description, icon }) => (
              <tr key={key} className="hover:bg-gray-50 cursor-default">
                <td className="border px-4 py-2">{icon}</td>
                <td className="border px-4 py-2 font-medium">{label}</td>
                <td className="border px-4 py-2 text-gray-700">
                  {description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CustomCard>
  );
};

export default TimelineLegend;
