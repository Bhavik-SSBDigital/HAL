import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClaimProcess,
  CompleteProcess,
  GetProcessData,
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
import CustomButtom from '../../CustomComponents/CustomButton';
import ViewFile from '../view/View';
import { toast } from 'react-toastify';
import TopLoader from '../../common/Loader/TopLoader';

const ViewProcess = () => {
  // states
  const { id } = useParams();
  const [actionsLoading, setActionsLoading] = useState(false);
  const [process, setProcess] = useState(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileView, setFileView] = useState(null);
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
  const handleSignDocument = (doc) => {
    // Logic for signing the document
    console.log(`Signing document: ${doc.id}`);
  };

  const handleRejectDocument = (doc) => {
    // Logic for rejecting the document
    console.log(`Rejecting document: ${doc.id}`);
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
          <CustomButtom
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
          <CustomButtom
            type={'primary'}
            text={'Claim'}
            className={'min-w-[150px]'}
            click={handleClaim}
            disabled={actionsLoading || process?.toBePicked == false}
          />
          <CustomButtom
            type={'danger'}
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
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="text-gray-900 font-semibold">{doc.name}</p>
                  <p className="text-gray-500 text-sm">
                    Type: {doc.type.toUpperCase()}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {/* View Document */}
                  <button
                    className="p-2 bg-button-primary-default hover:bg-button-primary-hover rounded-lg"
                    onClick={() => handleViewFile(doc?.name, doc?.path)}
                    title="View Document"
                  >
                    <IconEye size={18} className="text-white" />
                  </button>

                  {/* Sign Document */}
                  <button
                    className="p-2 bg-button-success-default hover:bg-button-success-hover rounded-md"
                    onClick={() => handleSignDocument(doc.id)}
                    title="Sign Document"
                  >
                    <IconCheck size={18} className="text-white" />
                  </button>

                  {/* Reject Document */}
                  <button
                    className="p-2 bg-button-danger-default hover:bg-button-danger-hover rounded-md"
                    onClick={() => handleRejectDocument(doc.id)}
                    title="Reject Document"
                  >
                    <IconX size={18} className="text-white" />
                  </button>

                  {/* Revoke Sign */}
                  <button
                    className="p-2 bg-button-warning-default hover:bg-button-warning-hover rounded-md"
                    onClick={() => handleRevokeSign(doc.id)}
                    title="Revoke Sign"
                  >
                    <IconArrowBackUp size={18} className="text-white" />
                  </button>

                  {/* Revoke Rejection */}
                  <button
                    className="p-2 bg-button-info-default hover:bg-button-info-hover rounded-md"
                    onClick={() => handleRevokeRejection(doc.id)}
                    title="Revoke Rejection"
                  >
                    <IconArrowForwardUp size={18} className="text-white" />
                  </button>
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
    </div>
  );
};

export default ViewProcess;
