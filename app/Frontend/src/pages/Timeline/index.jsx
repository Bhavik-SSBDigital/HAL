import React, { useState } from 'react';
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
import CustomButton from '../../CustomComponents/CustomButton';
import { ViewDocument } from '../../common/Apis';
import ViewFile from '../view/View';
import CustomCard from '../../CustomComponents/CustomCard';

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

const Timeline = ({ activities, setActionsLoading, actionsLoading }) => {
  // handlers
  const handleViewAllSelectedFiles = async (documents) => {
    setActionsLoading(true);
    try {
      const formattedDocs = await Promise.all(
        documents.map(async (doc) => {
          const res = await ViewDocument(doc.name, doc.path);
          return {
            url: res.data,
            type: res.fileType,
            name: doc.name,
            fileId: doc.id,
            signed: doc.signed,
          };
        }),
      );
      setFileView({ multi: true, docs: formattedDocs });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

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
                  <CustomButton
                    disabled={actionsLoading}
                    click={() => handleView(details.name, details.path)}
                    variant={'success'}
                    type="button"
                    text={'View'}
                    className={'ml-2'}
                  ></CustomButton>
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
                  <CustomButton
                    disabled={actionsLoading}
                    click={() => handleView(details.name, details.path)}
                    variant={'danger'}
                    type="button"
                    text={'View'}
                    className={'ml-2'}
                  ></CustomButton>
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

              {/* Document Changes */}
              {details.documentChanges?.length > 0 && (
                <div className="ml-4 border-l-2 border-yellow-400 pl-4 space-y-3 mt-3 bg-yellow-100 p-3 rounded">
                  <strong className="block mb-2 text-yellow-800">
                    Document Changes:
                  </strong>
                  {details.documentChanges.map((doc, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <strong>Document:</strong> {doc.document?.name || 'N/A'}
                        {doc.document?.name && doc.document?.path && (
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleView(doc.document.name, doc.document.path)
                            }
                            variant="warning"
                            type="button"
                            text="View"
                            className="ml-2"
                          />
                        )}
                      </p>

                      {doc.replacedDocument && (
                        <p>
                          <strong>Replaced:</strong> {doc.replacedDocument.name}
                          {doc.replacedDocument.path && (
                            <CustomButton
                              disabled={actionsLoading}
                              click={() =>
                                handleView(
                                  doc.replacedDocument.name,
                                  doc.replacedDocument.path,
                                )
                              }
                              variant="warning"
                              type="button"
                              text="View"
                              className="ml-2"
                            />
                          )}
                        </p>
                      )}

                      {doc.document && doc.replacedDocument && (
                        <div>
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleViewAllSelectedFiles([
                                {
                                  id: doc.document.id,
                                  name: doc.document.name,
                                  path: doc.document.path,
                                  signed: doc.document.signed,
                                },
                                {
                                  id: doc.replacedDocument.id,
                                  name: doc.replacedDocument.name,
                                  path: doc.replacedDocument.path,
                                  signed: doc.replacedDocument.signed,
                                },
                              ])
                            }
                            variant="warning"
                            type="button"
                            text="View Both"
                            className="mt-1"
                          />
                        </div>
                      )}

                      <p>
                        <strong>Requires Approval:</strong>{' '}
                        {doc.requiresApproval ? 'Yes' : 'No'}
                      </p>
                      {doc.actionDetails?.length > 0 && (
                        <p>
                          <strong>Actions:</strong>{' '}
                          {doc.actionDetails.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Document Summaries */}
              {details.documentSummaries?.length > 0 && (
                <div className="ml-4 border-l-2 border-yellow-400 pl-4 space-y-3 mt-3 bg-yellow-100 p-3 rounded">
                  <strong className="block mb-2 text-yellow-800">
                    Document Feedback:
                  </strong>
                  {details.documentSummaries.map((summary, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <strong>Document:</strong>{' '}
                        {summary.documentDetails?.name || 'N/A'}
                        {summary.documentDetails?.name &&
                          summary.documentDetails?.path && (
                            <CustomButton
                              disabled={actionsLoading}
                              click={() =>
                                handleView(
                                  summary.documentDetails.name,
                                  summary.documentDetails.path,
                                )
                              }
                              className={'ml-2'}
                              variant={'warning'}
                              text={'View'}
                              type="button"
                            ></CustomButton>
                          )}
                      </p>
                      <p>
                        <strong>Feedback:</strong>{' '}
                        {summary.feedbackText || 'N/A'}
                      </p>
                      <p>
                        <strong>User:</strong> {summary.user || 'N/A'}
                      </p>
                      <p>
                        <strong>Given At:</strong>{' '}
                        {summary.createdAt
                          ? new Date(summary.createdAt).toLocaleString()
                          : 'N/A'}
                      </p>
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

              {/* Document Changes */}
              {details.documentChanges?.length > 0 && (
                <div className="ml-4 border-l-2 border-green-400 pl-4 space-y-3 mt-3 bg-green-100 p-3 rounded">
                  <strong className="block mb-2 text-green-800">
                    Document Changes:
                  </strong>
                  {details.documentChanges.map((doc, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <strong>Document:</strong> {doc.document?.name || 'N/A'}
                        {doc.document?.name && doc.document?.path && (
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleView(doc.document.name, doc.document.path)
                            }
                            variant="success"
                            type="button"
                            text="View"
                            className="ml-2"
                          />
                        )}
                      </p>

                      {doc.replacedDocument && (
                        <p>
                          <strong>Replaced:</strong> {doc.replacedDocument.name}
                          {doc.replacedDocument.path && (
                            <CustomButton
                              disabled={actionsLoading}
                              click={() =>
                                handleView(
                                  doc.replacedDocument.name,
                                  doc.replacedDocument.path,
                                )
                              }
                              variant="success"
                              type="button"
                              text="View"
                              className="ml-2"
                            />
                          )}
                        </p>
                      )}

                      {doc.document && doc.replacedDocument && (
                        <div>
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleViewAllSelectedFiles([
                                {
                                  id: doc.document.id,
                                  name: doc.document.name,
                                  path: doc.document.path,
                                  signed: doc.document.signed,
                                },
                                {
                                  id: doc.replacedDocument.id,
                                  name: doc.replacedDocument.name,
                                  path: doc.replacedDocument.path,
                                  signed: doc.replacedDocument.signed,
                                },
                              ])
                            }
                            variant="success"
                            type="button"
                            text="View Both"
                            className="mt-1"
                          />
                        </div>
                      )}

                      <p>
                        <strong>Requires Approval:</strong>{' '}
                        {doc.requiresApproval ? 'Yes' : 'No'}
                      </p>
                      {doc.actionDetails?.length > 0 && (
                        <p>
                          <strong>Actions:</strong>{' '}
                          {doc.actionDetails.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Document Summaries */}
              {details.documentSummaries?.length > 0 && (
                <div className="ml-4 border-l-2 border-green-400 pl-4 space-y-3 mt-3 bg-green-100 p-3 rounded">
                  <strong className="block mb-2 text-green-800">
                    Document Feedback:
                  </strong>
                  {details.documentSummaries.map((summary, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <strong>Document:</strong>{' '}
                        {summary.documentDetails?.name || 'N/A'}
                        {summary.documentDetails?.name &&
                          summary.documentDetails?.path && (
                            <CustomButton
                              disabled={actionsLoading}
                              click={() =>
                                handleView(
                                  summary.documentDetails.name,
                                  summary.documentDetails.path,
                                )
                              }
                              className={'ml-2'}
                              variant={'success'}
                              type="button"
                              text={'View'}
                            ></CustomButton>
                          )}
                      </p>
                      <p>
                        <strong>Feedback:</strong>{' '}
                        {summary.feedbackText || 'N/A'}
                      </p>
                      <p>
                        <strong>User:</strong> {summary.user || 'N/A'}
                      </p>
                      <p>
                        <strong>Given At:</strong>{' '}
                        {summary.createdAt
                          ? new Date(summary.createdAt).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleView(doc.documentName, doc.documentPath)
                            }
                            className={'ml-2'}
                            variant={'info'}
                            type="button"
                            text={'View'}
                          ></CustomButton>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              {/* Document Changes */}
              {details.documentChanges?.length > 0 && (
                <div className="ml-4 border-l-2 border-purple-400 pl-4 space-y-3 mt-3 bg-purple-100 p-3 rounded">
                  <strong className="block mb-2 text-purple-800">
                    Document Changes:
                  </strong>
                  {details.documentChanges.map((doc, i) => (
                    <div key={i} className="space-y-1">
                      <p>
                        <strong>Document:</strong> {doc.document?.name || 'N/A'}
                        {doc.document?.name && doc.document?.path && (
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleView(doc.document.name, doc.document.path)
                            }
                            variant="info"
                            type="button"
                            text="View"
                            className="ml-2"
                          />
                        )}
                      </p>

                      {doc.replacedDocument && (
                        <p>
                          <strong>Replaced:</strong> {doc.replacedDocument.name}
                          {doc.replacedDocument.path && (
                            <CustomButton
                              disabled={actionsLoading}
                              click={() =>
                                handleView(
                                  doc.replacedDocument.name,
                                  doc.replacedDocument.path,
                                )
                              }
                              variant="info"
                              type="button"
                              text="View"
                              className="ml-2"
                            />
                          )}
                        </p>
                      )}

                      {doc.document && doc.replacedDocument && (
                        <div>
                          <CustomButton
                            disabled={actionsLoading}
                            click={() =>
                              handleViewAllSelectedFiles([
                                {
                                  id: doc.document.id,
                                  name: doc.document.name,
                                  path: doc.document.path,
                                  signed: doc.document.signed,
                                },
                                {
                                  id: doc.replacedDocument.id,
                                  name: doc.replacedDocument.name,
                                  path: doc.replacedDocument.path,
                                  signed: doc.replacedDocument.signed,
                                },
                              ])
                            }
                            variant="info"
                            type="button"
                            text="View Both"
                            className="mt-1"
                          />
                        </div>
                      )}

                      <p>
                        <strong>Requires Approval:</strong>{' '}
                        {doc.requiresApproval ? 'Yes' : 'No'}
                      </p>
                      {doc.actionDetails?.length > 0 && (
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
                {details.respondedAt
                  ? new Date(details.respondedAt).toLocaleString()
                  : 'N/A'}
              </p>

              {/* Related Documents */}
              {details.documentDetails?.length > 0 && (
                <div className="ml-4 border-l-2 border-purple-600 pl-4 mt-2 space-y-1 bg-purple-200 p-3 rounded">
                  <strong className="block text-purple-900 mb-1">
                    Related Documents:
                  </strong>
                  {details.documentDetails.map((doc, i) => (
                    <p key={i} className="flex items-center justify-between">
                      <span>{doc.documentName}</span>
                      {doc.documentPath && (
                        <CustomButton
                          disabled={actionsLoading}
                          click={() =>
                            handleView(doc.documentName, doc.documentPath)
                          }
                          className={'ml-2'}
                          variant={'info'}
                          type="button"
                          text={'View'}
                        ></CustomButton>
                      )}
                    </p>
                  ))}
                </div>
              )}

              {/* Document Responses */}
              {details.documentResponses?.length > 0 && (
                <div className="ml-4 border-l-2 border-purple-600 pl-4 mt-3 space-y-1 bg-purple-200 p-3 rounded">
                  <strong className="block text-purple-900 mb-1">
                    Document Responses:
                  </strong>
                  {details.documentResponses.map((response, i) => (
                    <p key={i}>
                      <strong>Document ID:</strong>{' '}
                      {response.documentId || 'N/A'}
                      <br />
                      <strong>Answer:</strong> {response.answerText || 'N/A'}
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

  //   states
  const [fileView, setFileView] = useState(null);
  // handlers
  const handleView = async (name, path) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path);
      if (fileData) {
        setFileView({ url: fileData.data, type: fileData.fileType });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  return (
    <>
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
              <CustomCard className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-400 font-mono">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                  <span className="text-sm font-semibold text-gray-700">
                    {activity.description}
                  </span>
                </div>
                <div>{renderDetails(activity)}</div>
              </CustomCard>
            </div>
          );
        })}
      </div>
      {/* View File Modal */}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
    </>
  );
};

export default Timeline;
