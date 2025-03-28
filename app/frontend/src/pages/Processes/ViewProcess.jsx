import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClaimProcess,
  CompleteProcess,
  GetProcessData,
  RejectDocument,
  SignDocument,
  ViewDocument,
} from '../../common/Apis';

import {
  IconEye,
  IconCheck,
  IconX,
  IconArrowBackUp,
  IconArrowForwardUp,
} from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import ViewFile from '../view/View';
import { toast } from 'react-toastify';
import TopLoader from '../../common/Loader/TopLoader';
import RemarksModal from '../../CustomComponents/RemarksModal';

const ViewProcess = () => {
  // states
  const { id } = useParams();
  const [actionsLoading, setActionsLoading] = useState(false);
  const [process, setProcess] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileView, setFileView] = useState(null);
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

  // network calls
  const handleCompleteProcess = async (id) => {
    setActionsLoading(true);
    try {
      const response = await CompleteProcess(id);
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
      setProcess(() => ({ ...prev, toBePicked: false }));
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
  const handleSignDocument = async (remarks) => {
    setActionsLoading(true);
    // Logic for signing the document
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
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };
  const handleRevokeSign = (doc) => {
    // Logic for revoking sign
    console.log(`Revoking sign for document: ${doc.id}`);
  };
  const handleRevokeRejection = (doc) => {
    // Logic for revoking rejection
    console.log(`Revoking rejection for document: ${doc.id}`);
  };

  useEffect(() => {
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

    fetchProcess();
  }, [id]);

  // handling
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
    <div className="mx-auto p-2">
      {actionsLoading && <TopLoader />}
      <CustomCard>
        <div className="flex justify-end flex-row gap-2">
          <CustomButton
            variant={'primary'}
            text={'Claim'}
            className={'min-w-[150px]'}
            click={handleClaim}
            disabled={actionsLoading || process?.toBePicked == false}
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

      {process?.documents && process?.documents?.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-800">Documents</h3>
          <div className="mt-3 space-y-3">
            {process?.documents?.map((doc) => (
              <CustomCard
                key={doc.id}
                className="flex items-center justify-between p-4 gap-5"
              >
                <div className="min-w-fit">
                  <p className="text-gray-900 font-semibold">{doc.name}</p>
                  <p className="text-gray-500 text-sm">
                    Type: {doc.type.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-1">
                  {/* View Document */}
                  <CustomButton
                    className="px-1"
                    click={() => handleViewFile(doc?.name, doc?.path)}
                    disabled={actionsLoading}
                    title={'View Document'}
                    text={<IconEye size={18} className="text-white" />}
                  />

                  {/* Sign Document */}
                  <CustomButton
                    variant={'success'}
                    className="px-1"
                    click={() =>
                      setRemarksModalOpen({ id: doc.id, open: 'sign' })
                    }
                    disabled={actionsLoading}
                    title={'Sign Document'}
                    text={<IconCheck size={18} className="text-white" />}
                  />

                  {/* Reject Document */}
                  <CustomButton
                    variant={'danger'}
                    className="px-1"
                    click={() =>
                      setRemarksModalOpen({ id: doc.id, open: 'reject' })
                    }
                    disabled={actionsLoading}
                    title={'Reject Document'}
                    text={<IconX size={18} className="text-white" />}
                  />

                  {/* Revoke Sign */}
                  <CustomButton
                    variant={'secondary'}
                    className="px-1"
                    click={() => handleRevokeSign(doc.id)}
                    disabled={actionsLoading}
                    title={'Revoke Sign'}
                    text={<IconArrowBackUp size={18} className="text-white" />}
                  />

                  {/* Revoke Rejection */}
                  <CustomButton
                    variant={'info'}
                    className="px-1"
                    click={() => handleRevokeRejection(doc.id)}
                    disabled={actionsLoading}
                    title={'Revoke Rejection'}
                    text={
                      <IconArrowForwardUp size={18} className="text-white" />
                    }
                  />
                </div>
              </CustomCard>
            ))}
          </div>
        </div>
      )}
      {fileView && (
        <ViewFile
          docu={fileView}
          setFileView={setFileView}
          handleViewClose={() => setFileView(null)}
        />
      )}
      <RemarksModal
        open={remarksModalOpen.open == 'sign'}
        title={'Sign Remarks'}
        onClose={() => setRemarksModalOpen({ id: null, open: false })}
        loading={actionsLoading}
        onSubmit={(remarks) => handleSignDocument(remarks)}
      />
      <RemarksModal
        open={remarksModalOpen.open == 'reject'}
        title={'Reject Remarks'}
        onClose={() => setRemarksModalOpen({ id: null, open: false })}
        loading={actionsLoading}
        onSubmit={(remarks) => handleRejectDocument(remarks)}
      />
    </div>
  );
};

export default ViewProcess;
