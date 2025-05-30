import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClaimProcess,
  CompleteProcess,
  GetProcessData,
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

const ViewProcess = () => {
  // states and data
  const [selectedDocs, setSelectedDocs] = useState([]);
  const { id } = useParams();
  const [actionsLoading, setActionsLoading] = useState(false);
  const [process, setProcess] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileView, setFileView] = useState(null);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [existingQuery, setExistingQuery] = useState(null);

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
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcess();
  }, [id]);

  // custom UIS
  const DetailItem = ({ label, value }) => (
    <div>
      <span className="block text-md text-black font-medium">{label}</span>
      <span className="text-lg font-normal text-gray-900">{value}</span>
    </div>
  );

  // handlers
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

  const handleViewFile = async (name, path) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, '../check');
      if (fileData) {
        setFileView({ url: fileData.data, type: fileData.fileType });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleViewAllSelectedFiles = async () => {
    setActionsLoading(true);
    try {
      const selected = process.documents.filter((doc) =>
        selectedDocs.includes(doc.id),
      );
      const formattedDocs = await Promise.all(
        selected.map(async (doc) => {
          const res = await ViewDocument(doc.name, '../check');
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
            click={() => setQueryModalOpen(true)}
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

      {/* documnets section */}
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

                    <div className="flex items-center flex-wrap gap-1">
                      <CustomButton
                        className="px-1"
                        click={() => handleViewFile(doc?.name, doc?.path)}
                        disabled={actionsLoading}
                        title="View Document"
                        text={<IconEye size={18} className="text-white" />}
                      />
                      <CustomButton
                        variant={'success'}
                        className="px-1"
                        click={() =>
                          setRemarksModalOpen({ id: doc.id, open: 'sign' })
                        }
                        disabled={actionsLoading || doc?.signedBy?.length}
                        title="Sign Document"
                        text={<IconCheck size={18} className="text-white" />}
                      />
                      <CustomButton
                        variant={'danger'}
                        className="px-1"
                        click={() =>
                          setRemarksModalOpen({ id: doc.id, open: 'reject' })
                        }
                        disabled={actionsLoading || doc.rejectionDetails}
                        title="Reject Document"
                        text={<IconX size={18} className="text-white" />}
                      />
                      <CustomButton
                        variant={'secondary'}
                        className="px-1"
                        click={() => handleRevokeSign(doc.id)}
                        disabled={actionsLoading || !doc.signedBy.length}
                        title="Revoke Sign"
                        text={
                          <IconArrowBackUp size={18} className="text-white" />
                        }
                      />
                      <CustomButton
                        variant={'info'}
                        className="px-1"
                        click={() => handleRevokeRejection(doc.id)}
                        disabled={actionsLoading || !doc.rejectionDetails}
                        title="Revoke Rejection"
                        text={
                          <IconArrowForwardUp
                            size={18}
                            className="text-white"
                          />
                        }
                      />
                      <CustomButton
                        variant={'info'}
                        className="px-1"
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
                  </CustomCard>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* queries section*/}
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
                  {/* Query Summary */}
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

                  {/* Solve Query Button */}
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

      {/* view file modal */}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}

      {/* Documents Details Modal */}
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

            {/* Basic Info */}
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

            {/* Signed By */}
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

            {/* Rejection Details */}
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

      {/* Query Modal */}
      <CustomModal
        isOpen={queryModalOpen}
        onClose={() => {
          setQueryModalOpen(false);
          setExistingQuery(null);
        }}
        className={'max-h-[95vh] overflow-auto max-w-lg w-full'}
      >
        <Query
          processId={process.processId}
          steps={process?.steps}
          close={() => {
            setQueryModalOpen(false);
            setExistingQuery(null);
          }}
          stepInstanceId={process.processStepInstanceId}
          documents={process.documents}
        />
      </CustomModal>

      {/* Query Solve Modal */}
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

      {/*sign remarks modal */}
      <RemarksModal
        open={remarksModalOpen.open === 'sign'}
        title="Sign Remarks"
        onClose={() => setRemarksModalOpen({ id: null, open: false })}
        loading={actionsLoading}
        onSubmit={(remarks) => handleSignDocument(remarks)}
      />

      {/* reject remarks modal */}
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
