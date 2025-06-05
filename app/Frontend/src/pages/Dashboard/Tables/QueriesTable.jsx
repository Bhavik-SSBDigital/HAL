import React from 'react';

const QueriesTable = ({ data }) => {
  if (!data || data?.length === 0) {
    return <p className="text-gray-500">No queries available.</p>;
  }

  return (
    <div className="overflow-x-auto rounded shadow border border-gray-200">
      <table className="min-w-full text-sm text-left bg-white">
        <thead className="bg-gray-100 border-b text-gray-600 font-medium">
          <tr>
            <th className="px-4 py-2">Process Name</th>
            <th className="px-4 py-2">Initiator</th>
            <th className="px-4 py-2">Query</th>
            <th className="px-4 py-2">Answer</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Created At</th>
            <th className="px-4 py-2">Answered At</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((q) => (
            <tr key={q.stepInstanceId} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{q.processName}</td>
              <td className="px-4 py-2">{q.initiatorName}</td>
              <td className="px-4 py-2">{q.queryText}</td>
              <td className="px-4 py-2">{q.answerText || '-'}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    q.status === 'RESOLVED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {q.status}
                </span>
              </td>
              <td className="px-4 py-2">
                {new Date(q.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                {q.answeredAt ? new Date(q.answeredAt).toLocaleString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QueriesTable;
