import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClaimProcess,
  CompleteProcess,
  DownloadFile,
  GetProcessData,
  getRecommendations,
  RejectDocument,
  RevokeRejection,
  SignDocument,
  SignRevoke,
  ViewDocument,
} from '../../common/Apis';
import {
  IconEye,
  IconCheck,
  IconX,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconAlignBoxCenterMiddle,
  IconQuestionMark,
  IconFileText,
  IconDownload,
  IconMenu2,
  IconPencil,
} from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import ViewFile from '../view/View';
import { toast } from 'react-toastify';
import TopLoader from '../../common/Loader/TopLoader';
import RemarksModal from '../../CustomComponents/RemarksModal';
import DocumentViewer from '../Viewer';
import CustomModal from '../../CustomComponents/CustomModal';
import Query from './Actions/Query';
import QuerySolve from './Actions/QuerySolve';
import AskRecommend from './Actions/AskRecommend';
import axios from 'axios';

const ViewProcess = () => {
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef();
  const { id } = useParams();
  const [actionsLoading, setActionsLoading] = useState(false);
  const [process, setProcess] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileView, setFileView] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [existingQuery, setExistingQuery] = useState(null);
  const [openModal, setOpenModal] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [canEdit, setCanEdit] = useState({});

  const [remarksModalOpen, setRemarksModalOpen] = useState({
    id: null,
    open: false,
  });

  const processDetails = [
    { label: 'Process ID', value: process?.processId },
    { label: 'Process Name', value: process?.processName || 'N/A' },
    { label: 'Initiator Name', value: process?.initiatorName || 'Unknown' },
    {
      label: 'Status',
      value: (
        <span
          className={`px-3 py-1 rounded-full max-w-[200px] text-white text-sm font-semibold block text-center mt-1 ${
            process?.status === 'PENDING' ? 'bg-yellow-500' : 'bg-green-500'
          }`}
        >
          {process?.status}
        </span>
      ),
    },
    {
      label: 'Created At',
      value: new Date(process?.createdAt).toLocaleString(),
    },
    {
      label: 'Arrived At',
      value: new Date(process?.arrivedAt).toLocaleString(),
    },
    {
      label: 'Updated At',
      value: process?.updatedAt
        ? new Date(process?.updatedAt).toLocaleString()
        : 'N/A',
    },
    {
      label: 'Completed At',
      value: process?.completedAt
        ? new Date(process?.completedAt).toLocaleString()
        : 'N/A',
    },
  ];

  const fetchProcess = async () => {
    try {
      const response = await GetProcessData(id);
      setProcess(response?.data?.process);

      // Check edit permissions for each document
      const editChecks = {};
      await Promise.all(
        response?.data?.process?.documents.map(async (doc) => {
          try {
            await axios.get(
              `http://localhost:${process.env.REACT_APP_API_PORT || 8000}/wopi/token/${doc.id}`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              },
            );
            editChecks[doc.id] = true;
          } catch (err) {
            editChecks[doc.id] = false;
          }
        }),
      );
      setCanEdit(editChecks);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const DetailItem = ({ label, value }) => (
    <div>
      <span className="block text-md text-black font-medium">{label}</span>
      <span className="text-lg font-normal text-gray-900">{value}</span>
    </div>
  );

  const handleCompleteProcess = async (stepId) => {
    setActionsLoading(true);
    try {
      const response = await CompleteProcess(stepId);
      toast.success(response?.data?.message);
      navigate('/processes/work');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleClaim = async () => {
    setActionsLoading(true);
    try {
      const response = await ClaimProcess(
        process?.processId,
        process?.processStepInstanceId,
      );
      toast.success(response?.data?.message);
      setProcess((prev) => ({ ...prev, toBePicked: false }));
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleViewFile = async (name, path, fileId, type, isEditing) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleDownloadFile = async (name, path) => {
    setActionsLoading(true);
    await DownloadFile(name, path);
    setActionsLoading(false);
  };

  const handleViewAllSelectedFiles = async () => {
    setActionsLoading(true);
    try {
      const selected = process.documents.filter((doc) =>
        selectedDocs.includes(doc.id),
      );
      const formattedDocs = await Promise.all(
        selected.map(async (doc) => {
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

  const handleSignDocument = async (remarks) => {
    setActionsLoading(true);
    try {
      const res = await SignDocument(
        process?.processId,
        process?.processStepInstanceId,
        remarksModalOpen.id,
        remarks,
      );
      toast.success(res?.data?.message);
      setRemarksModalOpen({ id: null, open: false });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleRejectDocument = async (remarks) => {
    setActionsLoading(true);
    try {
      const response = await RejectDocument(
        process.processId,
        remarksModalOpen.id,
        process?.processStepInstanceId,
        remarks,
      );
      setRemarksModalOpen({ id: null, open: false });
      toast.success(response?.data?.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleRevokeSign = async (docId) => {
    setActionsLoading(true);
    try {
      const response = await SignRevoke(process.processId, docId);
      toast.success(response?.data?.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleRevokeRejection = async (docId) => {
    setActionsLoading(true);
    try {
      const response = await RevokeRejection(process.processId, docId);
      toast.success(response?.data?.message);
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleSolveQuery = (query) => {
    setExistingQuery({
      queryText: query?.queryText,
      documentSummaries: query?.documentSummaries,
      documentChanges: [],
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const GetRecommendations = async () => {
    try {
      const response = await getRecommendations();
      setRecommendations(response?.data?.recommendations);
    } catch (error) {
      console.error(error?.response?.data?.message || error?.message);
    }
  };

  useEffect(() => {
    fetchProcess();
    GetRecommendations();
  }, [id]);

  if (loading) return <ComponentLoader />;
  if (error)
    return (
      <CustomCard>
        <p className="text-lg font-semibold">Error: {error}</p>
        <div className="mt-4 flex space-x-4">
          <CustomButton
            click={() => navigate('/processes/work')}
            text={'Go Back'}
          />
        </div>
      </CustomCard>
    );

  if (!process)
    return (
      <div className="text-center text-gray-500 py-10">
        No process data available
      </div>
    );

  return (
    <div className="mx-auto">
      {actionsLoading && <TopLoader />}

      <CustomCard>
        <div className="flex justify-end flex-row gap-2 flex-wrap">
          <CustomButton
            variant={'primary'}
            text={'Claim'}
            className={'min-w-[150px]'}
            click={handleClaim}
            disabled={actionsLoading || process?.toBePicked === false}
          />
          <CustomButton
            variant={'secondary'}
            text={'Query'}
            className={'min-w-[150px]'}
            click={() => setOpenModal('query')}
            disabled={actionsLoading}
          />
          <CustomButton
            variant={'secondary'}
            text={'Ask Recommendation'}
            className={'min-w-[150px]'}
            click={() => setOpenModal('recommend')}
            disabled={actionsLoading}
          />
          <CustomButton
            variant={'danger'}
            text={'Complete'}
            click={() => handleCompleteProcess(process?.processStepInstanceId)}
            className={'min-w-[150px]'}
            disabled={actionsLoading}
          />
        </div>
        <hr className="text-slate-200 my-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {processDetails.map((detail, index) => (
            <div
              key={index}
              className="p-4 border border-slate-300 bg-zinc-50 rounded-lg shadow-sm"
            >
              <p className="font-semibold text-lg">{detail.label}</p>
              <p>{detail.value}</p>
            </div>
          ))}
        </div>
      </CustomCard>

      {process?.documents?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-slate-400"></div>
            <span className="mx-4 text-sm text-gray-500 uppercase tracking-wide font-medium">
              Documents
            </span>
            <div className="flex-grow border-t border-slate-400"></div>
          </div>
          <div>
            <CustomButton
              disabled={selectedDocs.length == 0}
              className={'ml-auto block'}
              text={`View All Selected (${selectedDocs.length})`}
              click={handleViewAllSelectedFiles}
            />
            <div className="mt-2 space-y-2">
              {process.documents.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                const toggleSelect = () => {
                  setSelectedDocs((prev) =>
                    isSelected
                      ? prev.filter((id) => id !== doc.id)
                      : [...prev, doc.id],
                  );
                };

                return (
                  <CustomCard
                    key={doc.id}
                    className="flex items-center justify-between p-4 gap-5 flex-wrap"
                  >
                    <div className="flex gap-4 flex-wrap">
                      <input
                        type="checkbox"
                        className="h-10 w-4"
                        checked={isSelected}
                        onChange={toggleSelect}
                      />
                      <div className="min-w-fit">
                        <p className="text-gray-900 font-semibold">
                          {doc.name}
                        </p>
                        <p className="text-gray-500 text-sm">
                          Type: {doc?.type?.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="hidden sm:flex flex-wrap gap-2">
                        <CustomButton
                          className="px-2"
                          click={() =>
                            handleViewFile(
                              doc?.name,
                              doc?.path,
                              doc?.id,
                              doc?.type,
                              false,
                            )
                          }
                          disabled={actionsLoading}
                          title="View Document"
                          text={<IconEye size={18} className="text-white" />}
                        />
                        {/* <CustomButton
                          className="px-2"
                          click={() =>
                            handleViewFile(
                              doc.name,
                              doc.path,
                              doc.id,
                              doc.type,
                              true,
                            )
                          }
                          disabled={actionsLoading || !!canEdit[doc.id]}
                          title="Edit Document"
                          text={<IconPencil size={18} className="text-white" />}
                        /> */}
                        <CustomButton
                          className="px-2"
                          click={() => handleDownloadFile(doc?.name, doc?.path)}
                          disabled={actionsLoading}
                          title="Download Document"
                          text={
                            <IconDownload size={18} className="text-white" />
                          }
                        />
                        <CustomButton
                          variant="success"
                          className="px-2"
                          click={() =>
                            setRemarksModalOpen({ id: doc.id, open: 'sign' })
                          }
                          disabled={
                            actionsLoading ||
                            doc?.signedBy?.length ||
                            doc?.type?.toUpperCase() !== 'PDF'
                          }
                          title="Sign Document"
                          text={<IconCheck size={18} className="text-white" />}
                        />
                        <CustomButton
                          variant="danger"
                          className="px-2"
                          click={() =>
                            setRemarksModalOpen({ id: doc.id, open: 'reject' })
                          }
                          disabled={actionsLoading || doc.rejectionDetails}
                          title="Reject Document"
                          text={<IconX size={18} className="text-white" />}
                        />
                        {/* <CustomButton
                          variant="secondary"
                          className="px-2"
                          click={() => handleRevokeSign(doc.id)}
                          disabled={actionsLoading || !doc.signedBy.length}
                          title="Revoke Sign"
                          text={<IconArrowBackUp size={18} className="text-white" />}
                        />
                        <CustomButton
                          variant="info"
                          className="px-2"
                          click={() => handleRevokeRejection(doc.id)}
                          disabled={actionsLoading || !doc.rejectionDetails}
                          title="Revoke Rejection"
                          text={<IconArrowForwardUp size={18} className="text-white" />}
                        /> */}
                        <CustomButton
                          variant="info"
                          className="px-2"
                          click={() => setDocumentModalOpen(doc)}
                          disabled={actionsLoading}
                          title="Details"
                          text={
                            <IconAlignBoxCenterMiddle
                              size={18}
                              className="text-white"
                            />
                          }
                        />
                      </div>

                      <div className="sm:hidden relative inline-block">
                        <CustomButton
                          variant="info"
                          className="w-full justify-center"
                          click={() => setShowActions((prev) => !prev)}
                          text={
                            <div className="flex items-center gap-2">
                              <IconMenu2 size={18} />
                              <span>Actions</span>
                            </div>
                          }
                        />
                        {showActions && (
                          <div
                            ref={menuRef}
                            className="absolute right-[-20] mt-2 w-48 bg-white border rounded-lg shadow-lg z-50"
                          >
                            <div className="p-1 flex flex-col gap-1">
                              <CustomButton
                                className="w-full justify-start"
                                click={() => {
                                  handleViewFile(doc?.name, doc?.path, doc?.id);
                                  setShowActions(false);
                                }}
                                disabled={actionsLoading}
                                text="View"
                              />
                              {/* <CustomButton
                                className="w-full justify-start"
                                click={() => {
                                  handleEditFile(
                                    doc.id,
                                    doc.name,
                                    doc.path,
                                    doc.type,
                                    true,
                                  );
                                  setShowActions(false);
                                }}
                                disabled={actionsLoading || !!canEdit[doc.id]}
                                text="Edit"
                              /> */}
                              <CustomButton
                                className="w-full justify-start"
                                click={() => {
                                  handleDownloadFile(doc?.name, doc?.path);
                                  setShowActions(false);
                                }}
                                disabled={actionsLoading}
                                text="Download"
                              />
                              <CustomButton
                                variant="success"
                                className="w-full justify-start"
                                click={() => {
                                  setRemarksModalOpen({
                                    id: doc.id,
                                    open: 'sign',
                                  });
                                  setShowActions(false);
                                }}
                                disabled={
                                  actionsLoading || doc?.signedBy?.length
                                }
                                text="Sign"
                              />
                              <CustomButton
                                variant="danger"
                                className="w-full justify-start"
                                click={() => {
                                  setRemarksModalOpen({
                                    id: doc.id,
                                    open: 'reject',
                                  });
                                  setShowActions(false);
                                }}
                                disabled={
                                  actionsLoading || doc.rejectionDetails
                                }
                                text="Reject"
                              />
                              <CustomButton
                                variant="secondary"
                                className="w-full justify-start"
                                click={() => {
                                  handleRevokeSign(doc.id);
                                  setShowActions(false);
                                }}
                                disabled={
                                  actionsLoading || !doc.signedBy.length
                                }
                                text="Revoke Sign"
                              />
                              <CustomButton
                                variant="info"
                                className="w-full justify-start"
                                click={() => {
                                  handleRevokeRejection(doc.id);
                                  setShowActions(false);
                                }}
                                disabled={
                                  actionsLoading || !doc.rejectionDetails
                                }
                                text="Revoke Rejection"
                              />
                              <CustomButton
                                variant="info"
                                className="w-full justify-start"
                                click={() => {
                                  setDocumentModalOpen(doc);
                                  setShowActions(false);
                                }}
                                disabled={actionsLoading}
                                text="Details"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CustomCard>
                );
              })}
            </div>
          </div>
        </>
      )}

      {process?.queryDetails?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-slate-400"></div>
            <span className="mx-4 text-sm text-gray-500 uppercase tracking-wide font-medium">
              Queries
            </span>
            <div className="flex-grow border-t border-slate-400"></div>
          </div>
          <div className="mt-2">
            <div className="space-y-4">
              {process?.queryDetails?.map((query, index) => (
                <CustomCard key={index}>
                  <div className="space-y-1">
                    {query.stepName && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Step Name:</span>{' '}
                        {query.stepName}
                      </p>
                    )}
                    {query.stepNumber && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Step Number:</span>{' '}
                        {query.stepNumber}
                      </p>
                    )}
                    {query.status && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Status:</span>{' '}
                        {query.status}
                      </p>
                    )}
                    {query.taskType && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Task Type:</span>{' '}
                        {query.taskType}
                      </p>
                    )}
                    {query.queryText && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Query Text:</span>{' '}
                        {query.queryText}
                      </p>
                    )}
                    {query.createdAt && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Created At:</span>{' '}
                        {new Date(query.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <CustomButton
                      text="Solve Query"
                      variant="primary"
                      click={() => handleSolveQuery(query)}
                    />
                  </div>
                </CustomCard>
              ))}
            </div>
          </div>
        </>
      )}

      {process?.recommendationDetails?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-slate-400"></div>
            <span className="mx-4 text-sm text-gray-500 uppercase tracking-wide font-medium">
              Recommendations
            </span>
            <div className="flex-grow border-t border-slate-400"></div>
          </div>
          <div className="mt-2 space-y-4">
            {process?.recommendationDetails?.map((rec, index) => (
              <CustomCard key={rec.recommendationId || index}>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">Step:</span> {rec.stepName}{' '}
                    (#{rec.stepNumber})
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span> {rec.status}
                  </p>
                  <p>
                    <span className="font-semibold">Initiator:</span>{' '}
                    {rec.initiatorName}
                  </p>
                  <p>
                    <span className="font-semibold">Recommender:</span>{' '}
                    {rec.recommenderName}
                  </p>
                  <p>
                    <span className="font-semibold">Recommendation:</span>{' '}
                    {rec.recommendationText}
                  </p>
                  {rec.responseText && (
                    <p>
                      <span className="font-semibold">Response:</span>{' '}
                      {rec.responseText}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold">Created At:</span>{' '}
                    {new Date(rec.createdAt).toLocaleString()}
                  </p>
                  {rec.respondedAt && (
                    <p>
                      <span className="font-semibold">Responded At:</span>{' '}
                      {new Date(rec.respondedAt).toLocaleString()}
                    </p>
                  )}
                  {rec.documentDetails?.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">Attached Documents:</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="border px-3 py-2 text-left">
                                Document Name
                              </th>
                              <th className="border px-3 py-2 text-left">
                                Query Text
                              </th>
                              <th className="border px-3 py-2 text-left">
                                Answer Text
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rec.documentDetails.map((doc) => (
                              <tr key={doc.documentId}>
                                <td className="border px-3 py-2">
                                  {doc.documentName}
                                </td>
                                <td className="border px-3 py-2">
                                  {doc.queryText || '-'}
                                </td>
                                <td className="border px-3 py-2">
                                  {doc.answerText || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </CustomCard>
            ))}
          </div>
        </>
      )}

      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}

      <CustomModal
        isOpen={!!documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        className={'max-h-[99vh] overflow-auto'}
      >
        {documentModalOpen ? (
          <div className="space-y-8 text-sm text-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Document Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              <DetailItem label="Name" value={documentModalOpen.name} />
              <DetailItem
                label="Type"
                value={documentModalOpen.type.toUpperCase()}
              />
              <DetailItem
                label="Access"
                value={documentModalOpen.access.flat().join(', ')}
              />
              <DetailItem
                label="Approval Count"
                value={documentModalOpen.approvalCount}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900 border-b pb-1">
                Signed By
              </h3>
              {documentModalOpen.signedBy.length > 0 ? (
                <ul className="list-disc list-inside space-y-2 pl-2 text-gray-700">
                  {documentModalOpen.signedBy.map((entry, idx) => (
                    <li key={idx}>
                      <div>
                        <span className="font-medium">{entry.signedBy}</span>
                        <span className="text-gray-600">
                          ({new Date(entry.signedAt).toLocaleString()})
                        </span>
                      </div>
                      {entry.remarks && (
                        <div className="ml-4 italic text-gray-600">
                          Remarks: {entry.remarks}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-gray-900 border-b pb-1">
                Rejection Details
              </h3>
              {documentModalOpen.rejectionDetails ? (
                <div className="space-y-1 pl-1">
                  <p>
                    <span className="font-semibold">Rejected By:</span>{' '}
                    {documentModalOpen.rejectionDetails.rejectedBy}
                  </p>
                  <p>
                    <span className="font-semibold">Reason:</span>{' '}
                    {documentModalOpen.rejectionDetails.rejectionReason}
                  </p>
                  <p>
                    <span className="font-semibold">Rejected At:</span>{' '}
                    {new Date(
                      documentModalOpen.rejectionDetails.rejectedAt,
                    ).toLocaleString()}
                  </p>
                </div>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>
        ) : null}
      </CustomModal>

      <CustomModal
        isOpen={openModal == 'query'}
        onClose={() => {
          setOpenModal('');
          setExistingQuery(null);
        }}
        className={'max-h-[95vh] overflow-auto max-w-lg w-full'}
      >
        <Query
          processId={process.processId}
          steps={process?.steps}
          close={() => {
            setOpenModal('');
            setExistingQuery(null);
          }}
          stepInstanceId={process.processStepInstanceId}
          documents={process.documents}
        />
      </CustomModal>

      <CustomModal
        isOpen={existingQuery}
        onClose={() => {
          setExistingQuery(null);
        }}
        className={'max-h-[95vh] overflow-auto max-w-lg w-full'}
      >
        <QuerySolve
          processId={process.processId}
          close={() => {
            setExistingQuery(null);
          }}
          stepInstanceId={process.processStepInstanceId}
          queryRaiserStepInstanceId={process?.queryDetails[0]?.stepInstanceId}
          existingQuery={existingQuery}
        />
      </CustomModal>

      <CustomModal
        isOpen={openModal == 'recommend'}
        onClose={() => {
          setOpenModal('');
        }}
        className={'max-h-[95vh] overflow-auto max-w-lg w-full'}
      >
        <AskRecommend
          processId={process.processId}
          close={() => {
            setOpenModal('');
          }}
          stepInstanceId={process.processStepInstanceId}
          documents={process.documents}
        />
      </CustomModal>

      <RemarksModal
        open={remarksModalOpen.open === 'sign'}
        title="Sign Remarks"
        onClose={() => setRemarksModalOpen({ id: null, open: false })}
        loading={actionsLoading}
        onSubmit={(remarks) => handleSignDocument(remarks)}
        showPassField={true}
      />

      <RemarksModal
        open={remarksModalOpen.open === 'reject'}
        title="Reject Remarks"
        onClose={() => setRemarksModalOpen({ id: null, open: false })}
        loading={actionsLoading}
        onSubmit={(remarks) => handleRejectDocument(remarks)}
      />
    </div>
  );
};

export default ViewProcess;
