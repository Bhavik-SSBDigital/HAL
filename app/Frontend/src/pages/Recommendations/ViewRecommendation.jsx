import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getRecommendationDetails,
  signRecommendDocument,
  ViewDocument,
} from '../../common/Apis';
import CustomCard from '../../CustomComponents/CustomCard';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import ViewFile from '../view/View';
import { toast } from 'react-toastify';
import TopLoader from '../../common/Loader/TopLoader';
import { IconArrowLeft, IconCheck, IconEye } from '@tabler/icons-react';
import RemarksModal from '../../CustomComponents/RemarksModal';
import CustomModal from '../../CustomComponents/CustomModal';
import RespondRecommendation from './Actions/RespondRecommendation';

const ViewRecommendation = () => {
  // variables
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [data, setData] = useState();
  const [fileView, setFileView] = useState(null);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [remarksModalOpen, setRemarksModalOpen] = useState({
    id: null,
    open: false,
  });
  const [openModal, setOpenModal] = useState('');

  // handlers
  const handleViewFile = async (name, path) => {
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

  const handleViewAllSelectedFiles = async () => {
    setActionsLoading(true);
    try {
      const selected = data.documentSummaries.filter((doc) =>
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

  const handleSignDocument = async (reason) => {
    try {
      const response = await signRecommendDocument({
        reason,
        documentId: remarksModalOpen.id,
        recommendationId: data?.recommendationId,
      });
      toast.success(response?.data?.message);
      setRemarksModalOpen({ id: null, open: false });
    } catch (error) {
      toast.error(error?.respone?.data?.message || error?.message);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // network
  const fetchData = async () => {
    try {
      const response = await getRecommendationDetails(id);
      setData(response?.data?.recommendation);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // initials
  const recommendationDetails = [
    { label: 'Recommendation ID', value: data?.recommendationId },
    { label: 'Process ID', value: data?.processId },
    { label: 'Process Name', value: data?.processName || 'N/A' },
    { label: 'Initiator Name', value: data?.initiatorUsername || 'Unknown' },
    {
      label: 'Status',
      value: (
        <span
          className={`px-3 py-1 rounded-full text-white text-sm font-semibold block text-center max-w-[200px] ${
            data?.status === 'PENDING'
              ? 'bg-yellow-500'
              : data?.status === 'OPEN'
                ? 'bg-blue-500'
                : 'bg-green-500'
          }`}
        >
          {data?.status}
        </span>
      ),
    },
    {
      label: 'Created At',
      value: data?.createdAt
        ? new Date(data.createdAt).toLocaleString()
        : 'N/A',
    },
    {
      label: 'Responded At',
      value: data?.respondedAt
        ? new Date(data.respondedAt).toLocaleString()
        : 'N/A',
    },
    {
      label: 'Response Text',
      value: data?.responseText || 'N/A',
    },
  ];
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

  if (!data)
    return (
      <div className="text-center text-gray-500 py-10">
        No recommendation data available
      </div>
    );

  return (
    <div className="mx-auto">
      {actionsLoading && <TopLoader />}

      {/* details */}
      <CustomCard>
        <div className="flex justify-end flex-row gap-2 flex-wrap">
          <CustomButton
            variant={'primary'}
            text={<div className="flex items-center  gap-2">Respond</div>}
            click={() => setOpenModal('recommend')}
            disabled={actionsLoading}
          />
          <CustomButton
            variant={'none'}
            text={
              <div className="flex items-center  gap-2">
                <IconArrowLeft size={18} /> List
              </div>
            }
            click={handleBack}
            disabled={actionsLoading}
          />
        </div>
        <hr className="text-slate-200 my-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recommendationDetails.map((detail, index) => (
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

      {/* documents details */}
      {data?.documentSummaries?.length > 0 && (
        <>
          <div className="flex items-center mt-12 mb-2">
            <div className="flex-grow border-t border-slate-400"></div>
            <span className="mx-4 text-sm text-gray-500 uppercase tracking-wide font-medium">
              Documents
            </span>
            <div className="flex-grow border-t border-slate-400"></div>
          </div>

          <CustomButton
            disabled={selectedDocs.length === 0}
            className={'ml-auto block'}
            text={`View All Selected (${selectedDocs.length})`}
            click={handleViewAllSelectedFiles}
          />

          <div className="mt-2 space-y-2">
            {data?.documentSummaries?.map((doc) => {
              const isSelected = selectedDocs.includes(doc.documentId);
              const toggleSelect = () => {
                setSelectedDocs((prev) =>
                  isSelected
                    ? prev.filter((id) => id !== doc.documentId)
                    : [...prev, doc.documentId],
                );
              };

              return (
                <CustomCard
                  key={doc.documentId}
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
                        {doc.documentName}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Query: {doc.queryText}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-1 mt-1 inline-block rounded-full ${
                          doc.requiresApproval
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {doc.requiresApproval
                          ? 'Requires Approval'
                          : 'No Approval Needed'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-1">
                    <CustomButton
                      className="px-1"
                      click={() =>
                        handleViewFile(doc.documentName, doc.documentPath)
                      }
                      disabled={actionsLoading}
                      title="View Document"
                      text={
                        <>
                          <div className="flex items-center  gap-2">
                            <IconEye size={18} className="text-white" />
                            View
                          </div>
                        </>
                      }
                    />
                    {doc?.requiresApproval ? (
                      <CustomButton
                        variant={'success'}
                        className="px-1"
                        click={() =>
                          setRemarksModalOpen({
                            id: doc.documentId,
                            open: 'sign',
                          })
                        }
                        disabled={actionsLoading}
                        title="Sign Document"
                        text={
                          <div className="flex items-center  gap-2">
                            <IconCheck size={18} className="text-white" /> Sign
                          </div>
                        }
                      />
                    ) : null}
                  </div>
                </CustomCard>
              );
            })}
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

      {/* Respond Recommendation Modal */}
      <CustomModal
        isOpen={openModal == 'recommend'}
        onClose={() => {
          setOpenModal('');
        }}
        className={'max-h-[95vh] overflow-auto max-w-lg w-full'}
      >
        <RespondRecommendation
          recommendationId={data?.recommendationId}
          close={() => {
            setOpenModal('');
          }}
          documents={data?.documentSummaries || []}
        />
      </CustomModal>

      {/* sign remarks modal */}
      <RemarksModal
        open={remarksModalOpen.open === 'sign'}
        title="Sign Remarks"
        onClose={() => setRemarksModalOpen({ id: null, open: false })}
        loading={actionsLoading}
        onSubmit={(remarks) => handleSignDocument(remarks)}
      />
    </div>
  );
};

export default ViewRecommendation;
