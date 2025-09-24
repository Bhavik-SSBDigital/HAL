import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import CustomCard from '../../CustomComponents/CustomCard';
import ComponentLoader from '../../common/Loader/ComponentLoader';
import CustomButton from '../../CustomComponents/CustomButton';
import TopLoader from '../../common/Loader/TopLoader';
import { IconArrowLeft } from '@tabler/icons-react';
import { viewLog } from '../../common/Apis';
import Timeline from '../Timeline';

const ViewLog = () => {
  // variables
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [data, setData] = useState();
  function extractDocumentsByReopenCycle(processData) {
    const { documentVersioning } = processData;

    // Get all unique reopen cycles and sort them
    const allReopenCycles = new Set();
    const documentLineage = new Map();

    // First, get the original document order from cycle 0
    const originalOrder = [];
    const originalDocumentsMap = new Map();

    // Pre-process all document versions and find original order
    documentVersioning.forEach((docGroup) => {
      const versions = docGroup.versions.sort(
        (a, b) => a.reopenCycle - b.reopenCycle,
      );
      documentLineage.set(docGroup.latestDocumentId, versions);

      // Find the original version (cycle 0) to establish order
      const originalVersion = versions.find((v) => v.reopenCycle === 0);
      if (originalVersion) {
        originalOrder.push(originalVersion.id);
        originalDocumentsMap.set(originalVersion.id, versions);
      }

      versions.forEach((version) => {
        allReopenCycles.add(version.reopenCycle);
      });
    });

    const reopenCycles = Array.from(allReopenCycles).sort((a, b) => a - b);

    // Build result for each cycle
    const result = reopenCycles.map((currentCycle) => {
      const cycleDocuments = [];

      // Process documents in the original order
      originalOrder.forEach((originalDocId) => {
        const versions = originalDocumentsMap.get(originalDocId);
        if (versions) {
          // Find the latest version that exists at or before current cycle
          let appropriateVersion = null;

          for (let i = versions.length - 1; i >= 0; i--) {
            if (versions[i].reopenCycle <= currentCycle) {
              appropriateVersion = versions[i];
              break;
            }
          }

          if (appropriateVersion) {
            cycleDocuments.push(appropriateVersion);
          }
        }
      });

      return {
        reopenCycle: currentCycle,
        documents: cycleDocuments,
      };
    });

    return result;
  }

  const DocumentsCycle = (process) => {
    // Extract cycles
    const cycles = extractDocumentsByReopenCycle(process);

    // Maximum number of documents in any cycle
    const maxDocs = Math.max(...cycles?.map((cycle) => cycle.documents.length));

    return (
      <CustomCard className={'mt-2'}>
        <h2 className="text-xl font-semibold mb-4">
          Documents by Reopen Cycle
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border">SOP</th>
                {Array.from({ length: maxDocs }).map((_, idx) => (
                  <th key={idx} className="py-2 px-4 border">
                    Document {idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycles.map((cycle) => (
                <tr key={cycle.reopenCycle}>
                  <td className="py-2 px-4 border font-medium">
                    {cycle.reopenCycle}
                  </td>

                  {Array.from({ length: maxDocs }).map((_, idx) => {
                    const doc = cycle.documents[idx];

                    return (
                      <td key={idx} className="py-2 px-4 border">
                        {doc ? (
                          <div className="flex items-center space-x-2">
                            {/* Document icon */}
                            <img
                              width={28}
                              src={
                                ImageConfig[doc.type] || ImageConfig['default']
                              }
                              alt={doc.type}
                            />
                            <div className="flex flex-col">
                              {/* Document name */}
                              <span
                                title={doc.name}
                                className={`truncate ${doc.active ? 'font-semibold' : 'text-gray-400'}`}
                              >
                                {doc.name}
                              </span>
                              {/* Highlight issueNo */}

                              <span className="text-sm text-blue-600 font-medium">
                                Issue No: {doc?.issueNo || '--'}
                              </span>
                            </div>
                            <CustomButton
                              className="px-2"
                              click={() =>
                                handleViewFile(
                                  doc.name,
                                  doc.path,
                                  doc.id,
                                  doc.type,
                                  false,
                                )
                              }
                              disabled={actionsLoading}
                              title="View Document"
                              text={
                                <IconEye size={18} className="text-white" />
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CustomCard>
    );
  };

  // handlers
  const handleBack = () => {
    navigate(-1);
  };

  // network
  const fetchData = async () => {
    try {
      const response = await viewLog(id);
      setData(response?.data?.process);
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
  const logDetails = [
    // { label: 'Step Name', value: data?.stepName || '--' },
    { label: 'Process ID', value: data?.processId || '--' },
    { label: 'Process Name', value: data?.processName || '--' },
    // { label: 'Recirculation Cycle', value: data?.recirculationCycle || '--' },
    // { label: 'Step Instance ID', value: data?.processStepInstanceId || '--' },
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
        No logs data available
      </div>
    );

  return (
    <div className="mx-auto">
      {actionsLoading && <TopLoader />}

      {/* details */}
      <CustomCard>
        <div className="flex justify-end flex-row gap-2 flex-wrap">
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
          {logDetails.map((detail, index) => (
            <div
              key={index}
              className="p-4 border border-slate-300 bg-zinc-50 rounded-lg shadow-sm"
            >
              <p className="font-semibold text-lg">{detail.label}</p>
              <p>{detail.value}</p>
            </div>
          ))}

          {data?.documentVersioning && DocumentsCycle(data)}
        </div>
      </CustomCard>
      <div>
        <Timeline
          activities={data?.activities}
          actionsLoading={actionsLoading}
          setActionsLoading={setActionsLoading}
          workflow={data?.workflow?.steps}
        />
      </div>
    </div>
  );
};

export default ViewLog;
