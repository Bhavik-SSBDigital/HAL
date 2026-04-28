import React, { useEffect, useMemo, useState, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconSearch, IconUsers } from '@tabler/icons-react';

/* ---------------- NODE ---------------- */
const StepNode = memo(({ data, selected }: NodeProps<any>) => {
  return (
    <div className={`w-[260px] rounded-2xl border bg-white shadow-sm transition ${
      selected ? "border-indigo-600 shadow-lg" : "border-slate-200"
    }`}>
      <Handle type="target" position={Position.Left} />

      <div className="p-3 bg-slate-900 text-white text-xs font-bold">
        Step {data.stepNumber}
      </div>

      <div className="p-4">
        <p className="font-bold text-slate-800">{data.stepName}</p>
        <p className="text-[10px] text-slate-400">
          {data.assignments?.length || 0} actions
        </p>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

/* ---------------- MAIN ---------------- */
export default function Show({ steps = [] }: { steps: any[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [active, setActive] = useState<any>(null);

  const nodeTypes = useMemo(() => ({ custom: StepNode }), []);

  useEffect(() => {
    const n = steps.map((s, i) => ({
      id: String(i),
      type: "custom",
      position: { x: i * 320, y: 120 },
      data: { ...s, stepNumber: i + 1 },
    }));

    const e = steps.slice(0, -1).map((_, i) => ({
      id: `e${i}`,
      source: String(i),
      target: String(i + 1),
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8" },
      markerEnd: { type: MarkerType.ArrowClosed },
    }));

    setNodes(n);
    setEdges(e);
  }, [steps]);

  return (
    <div className="h-full w-full flex bg-slate-50">
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => setActive(n.data)}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-[380px] bg-white border-l p-6"
          >
            <button onClick={() => setActive(null)} className="mb-4">
              <IconX />
            </button>

            <h3 className="font-bold text-lg">{active.stepName}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {active.allowParallel ? "Parallel" : "Sequential"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}