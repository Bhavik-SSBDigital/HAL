import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function Show({ steps }) {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  useEffect(() => {
    if (!steps || steps.length === 0) return;

    const newNodes = steps.map((step, index) => ({
      id: `${index}`,
      data: {
        label: (
          <div className="p-4 bg-blue-500 text-white rounded-md text-sm shadow-md w-full">
            <p className="font-semibold text-base">
              Step {step.stepNumber}: {step.stepName}
            </p>
            <p className="text-sm">
              Parallel Allowed: {step.allowParallel ? 'Yes' : 'No'}
            </p>
            <p className="text-sm font-semibold mt-2">Assignments:</p>
            {step.assignments.length > 0 ? (
              <div className="overflow-auto">
                <table className="text-sm w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2">
                        Assignee Type
                      </th>
                      <th className="border border-gray-300 px-3 py-2">
                        Action Type
                      </th>
                      <th className="border border-gray-300 px-3 py-2">
                        Assignee IDs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.assignments.map((assignment) => (
                      <tr
                        key={assignment.id}
                        className="border border-gray-300"
                      >
                        <td className="border border-gray-300 px-3 py-2">
                          {assignment.assigneeType}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          {assignment.actionType}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          {assignment.assigneeIds.length > 0
                            ? assignment.assigneeIds.join(', ')
                            : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm italic">No assignments</p>
            )}
          </div>
        ),
      },
      position: { x: index * 300, y: 100 }, // Increase spacing
      style: {
        minWidth: 300, // Make the node wider
        minHeight: 150, // Increase height
        padding: 12,
        borderRadius: 12,
        background: '#3b82f6',
        color: 'white',
      },
    }));

    const newEdges = steps.slice(0, -1).map((_, index) => ({
      id: `e${index}-${index + 1}`,
      source: `${index}`,
      target: `${index + 1}`,
      animated: true,
      style: { stroke: '#3b82f6' },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [steps]);
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  return (
    <div className="h-[500px] rounded-lg overflow-hidden">
      <ReactFlow
        onNodesChange={onNodesChange}
        nodes={nodes}
        edges={edges}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background color="#ccc" gap={12} />
      </ReactFlow>
    </div>
  );
}
