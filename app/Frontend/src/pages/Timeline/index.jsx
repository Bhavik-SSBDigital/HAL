import React from 'react';
import {
  IconCheck,
  IconX,
  IconClock,
  IconFileText,
  IconMessageCircle,
  IconArrowRight,
  IconUserCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconThumbUp,
  IconCheckupList,
  IconSignature,
} from '@tabler/icons-react';
import TimelineLegend from './TimelineLegend';

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

const Timeline = ({ activities }) => {
  //   const activities = [
  //     {
  //       actionType: 'PROCESS_INITIATED',
  //       description: "Initiated process 'Contract Approval Process'",
  //       createdAt: '2025-06-01T10:00:00.000Z',
  //       details: {
  //         processId: '123',
  //         processName: 'Contract Approval Process',
  //         initiatorName: 'john.doe',
  //       },
  //     },
  //     {
  //       actionType: 'DOCUMENT_SIGNED',
  //       description: "Signed 'Contract_V1.pdf'",
  //       createdAt: '2025-06-02T14:30:00.000Z',
  //       details: {
  //         signedBy: 'john.doe',
  //         signedAt: '2025-06-02T14:30:00.000Z',
  //         remarks: 'Approved after review',
  //         byRecommender: false,
  //         isAttachedWithRecommendation: false,
  //         documentId: '789',
  //         name: 'Contract_V1.pdf',
  //         path: '/documents/contract_v1.pdf',
  //       },
  //     },
  //     {
  //       actionType: 'DOCUMENT_REJECTED',
  //       description: "Rejected 'Contract_V1_Draft.pdf'",
  //       createdAt: '2025-06-02T15:00:00.000Z',
  //       details: {
  //         rejectedBy: 'john.doe',
  //         rejectionReason: 'Non-compliant terms',
  //         rejectedAt: '2025-06-02T15:00:00.000Z',
  //         byRecommender: false,
  //         isAttachedWithRecommendation: false,
  //         documentId: '790',
  //         name: 'Contract_V1_Draft.pdf',
  //         path: '/documents/contract_v1_draft.pdf',
  //       },
  //     },
  //     {
  //       actionType: 'QUERY_RAISED',
  //       description: "Raised query: 'Please clarify payment terms'",
  //       createdAt: '2025-06-02T15:30:00.000Z',
  //       details: {
  //         stepInstanceId: '456',
  //         stepName: 'Manager Review',
  //         stepNumber: 2,
  //         status: 'IN_PROGRESS',
  //         queryText: 'Please clarify payment terms',
  //         initiatorName: 'John Doe',
  //         createdAt: '2025-06-02T15:30:00.000Z',
  //         documentChanges: [
  //           {
  //             documentId: '789',
  //             requiresApproval: true,
  //             isReplacement: false,
  //             documentHistoryId: '101',
  //             document: {
  //               id: '789',
  //               name: 'Contract_V1.pdf',
  //               type: 'PDF',
  //               path: '/documents/contract_v1.pdf',
  //               tags: ['contract', 'legal'],
  //             },
  //             actionDetails: ['Updated payment clause'],
  //             user: 'John Doe',
  //             createdAt: '2025-06-02T15:30:00.000Z',
  //             replacedDocument: null,
  //           },
  //         ],
  //         documentSummaries: [
  //           {
  //             documentId: '789',
  //             feedbackText: 'Payment terms need clarification',
  //             documentHistoryId: '102',
  //             documentDetails: {
  //               id: '789',
  //               name: 'Contract_V1.pdf',
  //               path: '/documents/contract_v1.pdf',
  //             },
  //             user: 'john.doe',
  //             createdAt: '2025-06-02T15:30:00.000Z',
  //           },
  //         ],
  //         assigneeDetails: {
  //           assignedStepName: 'Manager Review',
  //           assignedAssigneeId: '2',
  //           assignedAssigneeName: 'jane.smith',
  //         },
  //         taskType: 'QUERY_UPLOAD',
  //       },
  //     },
  //     {
  //       actionType: 'QUERY_RESOLVED',
  //       description: "Resolved query: 'Please clarify payment terms'",
  //       createdAt: '2025-06-02T16:00:00.000Z',
  //       details: {
  //         stepInstanceId: '456',
  //         stepName: 'Manager Review',
  //         stepNumber: 2,
  //         status: 'IN_PROGRESS',
  //         queryText: 'Please clarify payment terms',
  //         initiatorName: 'John Doe',
  //         createdAt: '2025-06-02T15:30:00.000Z',
  //         documentChanges: [],
  //         documentSummaries: [],
  //         assigneeDetails: {
  //           assignedStepName: 'Manager Review',
  //           assignedAssigneeId: '2',
  //           assignedAssigneeName: 'jane.smith',
  //         },
  //         taskType: 'RESOLVED',
  //         answerText: 'Payment terms updated to 30 days net',
  //         answeredAt: '2025-06-02T16:00:00.000Z',
  //       },
  //     },
  //     {
  //       actionType: 'RECOMMENDATION_REQUESTED',
  //       description: "Requested recommendation: 'Review contract terms'",
  //       createdAt: '2025-06-02T16:30:00.000Z',
  //       details: {
  //         recommendationId: '202',
  //         processId: '123',
  //         processName: 'Contract Approval Process',
  //         stepInstanceId: '456',
  //         stepName: 'Manager Review',
  //         stepNumber: 2,
  //         status: 'PENDING',
  //         recommendationText: 'Review contract terms',
  //         initiatorName: 'john.doe',
  //         recommenderName: 'jane.smith',
  //         createdAt: '2025-06-02T16:30:00.000Z',
  //         responseText: null,
  //         respondedAt: null,
  //         documentDetails: [
  //           {
  //             documentId: '789',
  //             documentName: 'Contract_V1.pdf',
  //             documentPath: '/documents',
  //             queryText: 'Are terms compliant?',
  //             answerText: null,
  //             requiresApproval: true,
  //           },
  //         ],
  //         documentResponses: [],
  //       },
  //     },
  //     {
  //       actionType: 'RECOMMENDATION_PROVIDED',
  //       description: "Provided recommendation: 'Terms are compliant'",
  //       createdAt: '2025-06-02T17:00:00.000Z',
  //       details: {
  //         recommendationId: '202',
  //         processId: '123',
  //         processName: 'Contract Approval Process',
  //         stepInstanceId: '456',
  //         stepName: 'Manager Review',
  //         stepNumber: 2,
  //         status: 'RESOLVED',
  //         recommendationText: 'Review contract terms',
  //         initiatorName: 'john.doe',
  //         recommenderName: 'jane.smith',
  //         createdAt: '2025-06-02T16:30:00.000Z',
  //         responseText: 'Terms are compliant',
  //         respondedAt: '2025-06-02T17:00:00.000Z',
  //         documentDetails: [
  //           {
  //             documentId: '789',
  //             documentName: 'Contract_V1.pdf',
  //             documentPath: '/documents',
  //             queryText: 'Are terms compliant?',
  //             answerText: 'Yes, compliant with regulations',
  //             requiresApproval: true,
  //           },
  //         ],
  //         documentResponses: [
  //           {
  //             documentId: '789',
  //             answerText: 'Yes, compliant with regulations',
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       actionType: 'STEP_COMPLETED',
  //       description: "Completed step 'Manager Review'",
  //       createdAt: '2025-06-03T09:00:00.000Z',
  //       details: {
  //         stepInstanceId: '456',
  //         stepName: 'Manager Review',
  //         stepNumber: 2,
  //       },
  //     },
  //   ];
  const renderDetails = (activity) => {
    const { actionType, details = {} } = activity;

    switch (actionType) {
      case 'PROCESS_INITIATED':
        return (
          <div className="timeline-item p-4 border-l-4 border-blue-500 bg-blue-50 rounded-md mb-4">
            <div className="text-sm text-gray-500 mb-1">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <p className="text-gray-700">
              <strong>Initiator:</strong> {details.initiatorName || 'N/A'}{' '}
              <br />
              <strong>Process:</strong> {details.processName || 'N/A'}
            </p>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'DOCUMENT_SIGNED':
        return (
          <div className="timeline-item p-4 border-l-4 border-green-500 bg-green-50 rounded-md mb-4">
            <div className="text-sm text-gray-500 mb-1">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <div className="text-green-700 space-y-1">
              <p>
                <strong>Signed By:</strong> {details.signedBy || 'N/A'}
              </p>
              <p>
                <strong>Signed At:</strong>{' '}
                {details.signedAt
                  ? new Date(details.signedAt).toLocaleString()
                  : 'N/A'}
              </p>
              {details.remarks && (
                <p>
                  <strong>Remarks:</strong> {details.remarks}
                </p>
              )}
              <p>
                <strong>Document:</strong> {details.name || 'N/A'}{' '}
                {details.name && details.path && (
                  <button
                    onClick={() => handleView(details.name, details.path)}
                    className="ml-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    type="button"
                  >
                    View
                  </button>
                )}
              </p>
            </div>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'DOCUMENT_REJECTED':
        return (
          <div className="timeline-item p-4 border-l-4 border-red-600 bg-red-50 rounded-md mb-4">
            <div className="text-sm text-gray-500 mb-1">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <div className="text-red-700 space-y-1">
              <p>
                <strong>Rejected By:</strong> {details.rejectedBy || 'N/A'}
              </p>
              <p>
                <strong>Reason:</strong> {details.rejectionReason || 'N/A'}
              </p>
              <p>
                <strong>Rejected At:</strong>{' '}
                {details.rejectedAt
                  ? new Date(details.rejectedAt).toLocaleString()
                  : 'N/A'}
              </p>
              <p>
                <strong>Document:</strong> {details.name || 'N/A'}{' '}
                {details.name && details.path && (
                  <button
                    onClick={() => handleView(details.name, details.path)}
                    className="ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    type="button"
                  >
                    View
                  </button>
                )}
              </p>
            </div>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'QUERY_RAISED':
        return (
          <div className="timeline-item p-4 border-l-4 border-yellow-500 bg-yellow-50 rounded-md mb-4">
            <div className="text-sm text-gray-600 mb-2">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <div className="text-yellow-700 space-y-2">
              <p>
                <strong>Step:</strong> {details.stepName || 'N/A'}
              </p>
              <p>
                <strong>Query:</strong> {details.queryText || 'N/A'}
              </p>
              <p>
                <strong>Initiator:</strong> {details.initiatorName || 'N/A'}
              </p>

              {details.documentChanges &&
                details.documentChanges.length > 0 && (
                  <div className="ml-4 border-l-2 border-yellow-400 pl-4 space-y-3 mt-3 bg-yellow-100 p-3 rounded">
                    <strong className="block mb-2 text-yellow-800">
                      Document Changes:
                    </strong>
                    {details.documentChanges.map((doc, i) => (
                      <div key={i} className="space-y-1">
                        <p>
                          <strong>Document:</strong>{' '}
                          {doc.document?.name || 'N/A'}{' '}
                          {doc.document?.name && doc.document?.path && (
                            <button
                              onClick={() =>
                                handleView(doc.document.name, doc.document.path)
                              }
                              className="ml-2 px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                              type="button"
                            >
                              View
                            </button>
                          )}
                        </p>
                        {doc.replacedDocument && (
                          <p>
                            <strong>Replaced:</strong>{' '}
                            {doc.replacedDocument.name} → {doc.document?.name}
                          </p>
                        )}
                        <p>
                          <strong>Requires Approval:</strong>{' '}
                          {doc.requiresApproval ? 'Yes' : 'No'}
                        </p>
                        {doc.actionDetails && doc.actionDetails.length > 0 && (
                          <p>
                            <strong>Actions:</strong>{' '}
                            {doc.actionDetails.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'QUERY_RESOLVED':
        return (
          <div className="timeline-item p-4 border-l-4 border-green-600 bg-green-50 rounded-md mb-4">
            <div className="text-sm text-gray-600 mb-2">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <div className="text-green-700 space-y-2">
              <p>
                <strong>Step:</strong> {details.stepName || 'N/A'}
              </p>
              <p>
                <strong>Query:</strong> {details.queryText || 'N/A'}
              </p>
              <p>
                <strong>Answer:</strong> {details.answerText || 'N/A'}
              </p>
              <p>
                <strong>Answered At:</strong>{' '}
                {details.answeredAt
                  ? new Date(details.answeredAt).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'RECOMMENDATION_REQUESTED':
        return (
          <div className="timeline-item p-4 border-l-4 border-purple-600 bg-purple-50 rounded-md mb-4">
            <div className="text-sm text-gray-600 mb-2">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <div className="text-purple-700 space-y-1">
              <p>
                <strong>Step:</strong> {details.stepName || 'N/A'}
              </p>
              <p>
                <strong>Recommendation Text:</strong>{' '}
                {details.recommendationText || 'N/A'}
              </p>
              <p>
                <strong>Initiator:</strong> {details.initiatorName || 'N/A'}
              </p>
              <p>
                <strong>Status:</strong> {details.status || 'N/A'}
              </p>
              {details.documentDetails &&
                details.documentDetails.length > 0 && (
                  <div className="ml-4 border-l-2 border-purple-400 pl-4 mt-2 space-y-1 bg-purple-100 p-3 rounded">
                    <strong className="block text-purple-800 mb-1">
                      Related Documents:
                    </strong>
                    {details.documentDetails.map((doc, i) => (
                      <p key={i} className="flex items-center justify-between">
                        <span>{doc.documentName}</span>
                        {doc.documentPath && (
                          <button
                            onClick={() =>
                              handleView(doc.documentName, doc.documentPath)
                            }
                            className="ml-2 px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                            type="button"
                          >
                            View
                          </button>
                        )}
                      </p>
                    ))}
                  </div>
                )}
            </div>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'RECOMMENDATION_PROVIDED':
        return (
          <div className="timeline-item p-4 border-l-4 border-purple-800 bg-purple-100 rounded-md mb-4">
            <div className="text-sm text-gray-600 mb-2">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <div className="text-purple-900 space-y-1">
              <p>
                <strong>Step:</strong> {details.stepName || 'N/A'}
              </p>
              <p>
                <strong>Recommendation Text:</strong>{' '}
                {details.recommendationText || 'N/A'}
              </p>
              <p>
                <strong>Response Text:</strong> {details.responseText || 'N/A'}
              </p>
              <p>
                <strong>Responded At:</strong>{' '}
                {details.respondedAt &&
                  new Date(details.respondedAt).toLocaleString()}
              </p>

              {details.documentDetails &&
                details.documentDetails.length > 0 && (
                  <div className="ml-4 border-l-2 border-purple-600 pl-4 mt-2 space-y-1 bg-purple-200 p-3 rounded">
                    <strong className="block text-purple-900 mb-1">
                      Related Documents:
                    </strong>
                    {details.documentDetails.map((doc, i) => (
                      <p key={i} className="flex items-center justify-between">
                        <span>{doc.documentName}</span>
                        {doc.documentPath && (
                          <button
                            onClick={() =>
                              handleView(doc.documentName, doc.documentPath)
                            }
                            className="ml-2 px-2 py-1 bg-purple-700 text-white rounded hover:bg-purple-900 transition"
                            type="button"
                          >
                            View
                          </button>
                        )}
                      </p>
                    ))}
                  </div>
                )}
            </div>
            <p className="mt-2 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      case 'STEP_COMPLETED':
        return (
          <div className="timeline-item p-4 border-l-4 border-green-600 bg-green-50 rounded-md mb-4">
            <div className="text-sm text-gray-600 mb-2">
              {new Date(details?.createdAt).toLocaleString()}
            </div>
            <p className="text-green-700 font-semibold">
              <strong>Step Completed:</strong> {details.stepName || 'N/A'}
            </p>
            <p className="mt-1 text-gray-600 italic">{details?.description}</p>
          </div>
        );

      default:
        return <p className="text-gray-600 italic">No additional details</p>;
    }
  };

  return (
    <div className="mt-8 space-y-8">
      <TimelineLegend />
      <h2 className="text-2xl text-center font-bold underline text-gray-900">
        Timeline
      </h2>

      {activities.map((activity, idx) => {
        const Icon = iconMap[activity.actionType] || (
          <IconClock size={20} className="text-gray-400" />
        );
        return (
          <div key={idx} className="flex items-start space-x-4">
            {/* Timeline Icon */}
            <div className="relative flex flex-col items-center">
              <div className="z-10 bg-white border-2 border-gray-300 rounded-full p-2">
                {Icon}
              </div>
              {idx !== activities.length - 1 && (
                <div className="w-px bg-gray-300 flex-1 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 bg-white p-4 rounded-md shadow-md border border-gray-200">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400 font-mono">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
                <span className="text-sm font-semibold text-gray-700">
                  {activity.description}
                </span>
              </div>
              <div>{renderDetails(activity)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
