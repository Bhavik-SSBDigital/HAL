import React, { useState } from 'react';
import {
  IconClock,
  IconUser,
  IconFileText,
  IconAlertCircle,
  IconFileCheck,
  IconFileX,
  IconReplace,
} from '@tabler/icons-react';
import CustomCard from '../../CustomComponents/CustomCard';
import CustomTabs from '../../CustomComponents/CustomTabs';

const WorkflowAnalysisDetails = ({ data }) => {
  const [activeTab, setActiveTab] = useState('summary');

  const {
    workflow,
    stepCompletionTimes,
    pendingProcessesByStep,
    assigneeCompletionTimes,
    pendingProcesses,
    queries,
    signedDocuments,
    rejectedDocuments,
    replacedDocuments,
  } = data;

  const tabs = [
    { key: 'summary', label: 'Summary' },
    { key: 'steps', label: 'Step Times' },
    { key: 'pending', label: 'Step Wise Pending' },
    { key: 'assignees', label: 'Assignee Stats' },
    { key: 'queries', label: 'Queries' },
    { key: 'signedDocs', label: 'Signed Docs' },
    { key: 'rejectedDocs', label: 'Rejected Docs' },
    { key: 'replacedDocs', label: 'Replaced Docs' },
  ];

  return (
    <div className="p-4 space-y-4">
      <CustomCard>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{workflow.name}</h2>
            <p className="text-sm text-gray-500">{workflow.description}</p>
            <p className="text-xs text-gray-400">Version: {workflow.version}</p>
          </div>
          <IconClock className="text-blue-500" />
        </div>
      </CustomCard>

      <CustomTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="max-h-[calc(100vh_-_50vh)] overflow-auto">
        {activeTab === 'summary' && (
          <div className="grid md:grid-cols-2 gap-4">
            <CustomCard>
              <h3 className="font-medium mb-2">
                Workflow Name : {workflow.name} (v{workflow.version})
              </h3>

              <p className="text-sm text-gray-500">
                Description : {workflow.description}
              </p>
            </CustomCard>
            <CustomCard>
              <h3 className="font-medium mb-2">Created / Updated</h3>
              <p>
                Created: {new Date(workflow.createdAt).toLocaleDateString()}
                <br />
                Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
              </p>
            </CustomCard>
            <CustomCard>
              <h3 className="font-medium mb-2">Total Pending</h3>
              <p>{pendingProcesses.total}</p>
            </CustomCard>
            <CustomCard>
              <h3 className="font-medium mb-2">Queries (Solved / Total)</h3>
              <p>
                {queries.solved} / {queries.total}
              </p>
            </CustomCard>
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-2">
            {stepCompletionTimes.map((step) => (
              <CustomCard key={step.stepId}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      {step.stepName} (#{step.stepNumber})
                    </h4>
                    <p className="text-sm text-gray-500">
                      Type: {step.stepType}
                    </p>
                  </div>
                  <p className="text-sm text-blue-600">
                    {step.averageCompletionTimeHours} hrs
                  </p>
                </div>
              </CustomCard>
            ))}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingProcessesByStep.map((step) => (
              <CustomCard key={step.stepId}>
                <h4 className="font-medium mb-1">Step : {step.stepName}</h4>
                <h4 className="font-medium mb-1">
                  Pending Processes: {step.pendingCount}
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {step.processes.map((p) => (
                    <li key={p.processId}>
                      {p.processName} by {p.createdBy} on
                      {new Date(p.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </CustomCard>
            ))}
          </div>
        )}

        {activeTab === 'assignees' && (
          <div className="space-y-2">
            {assigneeCompletionTimes.map((assignee) => (
              <CustomCard key={assignee.assigneeId}>
                <div className="flex justify-between">
                  <span>{assignee.assigneeUsername}</span>
                  <span>
                    {assignee.averageCompletionTimeHours} hrs /{' '}
                    {assignee.totalTasks} tasks
                  </span>
                </div>
              </CustomCard>
            ))}
          </div>
        )}

        {activeTab === 'queries' && (
          <div className="space-y-2">
            {/* Header with total and solved counts */}
            <div className="flex justify-between items-center text-sm font-medium text-gray-700">
              <span>Total Queries: {queries.total}</span>
              <span>Solved: {queries.solved}</span>
            </div>

            {/* List of queries */}
            {queries.details.map((query) => (
              <CustomCard key={query.id}>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{query.queryText}</span>
                    <span
                      className={`text-${query.status === 'RESOLVED' ? 'green' : 'red'}-600`}
                    >
                      {query.status}
                    </span>
                  </div>
                  <p>
                    By: {query.initiatorName} | On:{' '}
                    {new Date(query.createdAt).toLocaleDateString()}
                  </p>
                  <p>Process: {query.processName}</p>
                  {query.answeredAt && (
                    <p>
                      Answered:{' '}
                      {new Date(query.answeredAt).toLocaleDateString()}
                    </p>
                  )}
                  {query.answerText && (
                    <p className="text-gray-600">Answer: {query.answerText}</p>
                  )}
                </div>
              </CustomCard>
            ))}
          </div>
        )}

        {activeTab === 'signedDocs' && (
          <div className="space-y-2">
            {signedDocuments.map((doc) => (
              <CustomCard key={doc.documentId}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{doc.documentName}</p>
                    <p className="text-sm text-gray-600">
                      Process: {doc.processName}
                    </p>
                  </div>
                  <span className="text-sm text-green-600">
                    {new Date(doc.signedAt).toLocaleString()}
                  </span>
                </div>
              </CustomCard>
            ))}
          </div>
        )}

        {activeTab === 'rejectedDocs' && (
          <div className="space-y-2">
            {rejectedDocuments.map((doc) => (
              <CustomCard key={doc.documentId}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{doc.documentName}</p>
                    <p className="text-sm text-gray-600">
                      Process: {doc.processName}
                    </p>
                  </div>
                  <span className="text-sm text-red-600">
                    {new Date(doc.rejectedAt).toLocaleString()}
                  </span>
                </div>
              </CustomCard>
            ))}
          </div>
        )}

        {activeTab === 'replacedDocs' && (
          <div className="space-y-2">
            {replacedDocuments.map((doc) => (
              <CustomCard key={doc.replacedDocumentId}>
                <div className="text-sm">
                  <p>
                    <span className="font-medium">{doc.replacedDocName}</span>{' '}
                    replaced{' '}
                    <span className="text-gray-700">
                      {doc.replacesDocumentName}
                    </span>
                  </p>
                  <p className="text-gray-500">By: {doc.replacedBy}</p>
                </div>
              </CustomCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowAnalysisDetails;
