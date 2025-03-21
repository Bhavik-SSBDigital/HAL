import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { GetProcessData } from '../../common/Apis';
import { IconEye } from '@tabler/icons-react';

const ViewProcess = () => {
  const { id } = useParams();
  const [process, setProcess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProcess = async () => {
      try {
        const response = await GetProcessData(id);
        setProcess(response?.data?.process);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProcess();
  }, [id]);

  if (loading)
    return <div className="text-center text-gray-500 py-10">Loading...</div>;
  if (error)
    return <div className="text-center text-red-500 py-10">Error: {error}</div>;
  if (!process)
    return (
      <div className="text-center text-gray-500 py-10">
        No process data available
      </div>
    );

  const processDetails = [
    { label: 'Process ID', value: process.processId },
    { label: 'Process Name', value: process.processName || 'N/A' },
    { label: 'Initiator Name', value: process.initiatorName || 'Unknown' },
    {
      label: 'Status',
      value: (
        <span
          className={`px-3 py-1 rounded-full max-w-[200px] text-white text-sm font-semibold block text-center mt-1 ${
            process.status === 'PENDING' ? 'bg-yellow-500' : 'bg-green-500'
          }`}
        >
          {process.status}
        </span>
      ),
    },
    {
      label: 'Created At',
      value: new Date(process.createdAt).toLocaleString(),
    },
    {
      label: 'Arrived At',
      value: new Date(process.arrivedAt).toLocaleString(),
    },
    {
      label: 'Updated At',
      value: process.updatedAt
        ? new Date(process.updatedAt).toLocaleString()
        : 'N/A',
    },
    {
      label: 'Completed At',
      value: process.completedAt
        ? new Date(process.completedAt).toLocaleString()
        : 'N/A',
    },
  ];

  return (
    <div className="mx-auto p-2">
      <div className="bg-white shadow-md rounded-md p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center">
          Process : {process.processName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processDetails.map((detail, index) => (
            <div
              key={index}
              className="p-4 border border-slate-300 bg-slate-50 rounded-lg shadow-sm"
            >
              <p className="font-semibold text-lg">{detail.label}</p>
              <p>{detail.value}</p>
            </div>
          ))}
        </div>
      </div>

      {process.documents && process.documents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-800">Documents</h3>
          <div className="mt-3 space-y-3">
            {process.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-white p-4 rounded-md shadow-md border border-gray-200"
              >
                <div>
                  <p className="text-gray-900 font-semibold">{doc.name}</p>
                  <p className="text-gray-500 text-sm">
                    Type: {doc.type.toUpperCase()}
                  </p>
                </div>
                <button
                  className="p-2 bg-button-primary-default hover:bg-button-primary-hover rounded-lg"
                  // onClick={() => handleView(params.row.processId)}
                >
                  <IconEye color="white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewProcess;
