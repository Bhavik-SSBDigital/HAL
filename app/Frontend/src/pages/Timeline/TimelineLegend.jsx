import React from 'react';
import {
  IconInfoCircle,
  IconSignature,
  IconX,
  IconAlertCircle,
  IconCheckupList,
  IconMessageCircle,
  IconThumbUp,
  IconCheck,
} from '@tabler/icons-react';

const iconMap = {
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
  const items = [
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
    <div className="bg-white border rounded p-4 max-w-full shadow-sm overflow-x-auto">
      <h3 className="text-lg text-center underline font-semibold mb-4">Timeline Legend</h3>
      <table className="min-w-full table-auto border-collapse">
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
              <td className="border px-4 py-2 text-gray-700">{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimelineLegend;
