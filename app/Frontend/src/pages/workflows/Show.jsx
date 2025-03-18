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
          <div className="p-2 bg-gray-100 shadow-lg rounded-xl border border-gray-300">
            {/* Header Section */}
            <div className="bg-blue-600 text-white p-4 rounded-md shadow-sm flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Step {step.stepNumber}: {step.stepName}
              </h3>
            </div>

            {/* Assignments Section */}
            <div className="bg-blue-600 p-3 rounded-lg mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Assignments
              </p>

              {step.assignments.length > 0 ? (
                <div className="max-w-[300px] overflow-auto">
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
                <p className="text-sm italic text-gray-500">No assignments</p>
              )}
            </div>
          </div>
        ),
      },
      position: { x: index * 300, y: 100 }, // Increase spacing
      style: {
        minWidth: 'fit-content', // Make the node wider
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
        // fitView
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background color="#ccc" gap={12} />
      </ReactFlow>
    </div>
  );
}
