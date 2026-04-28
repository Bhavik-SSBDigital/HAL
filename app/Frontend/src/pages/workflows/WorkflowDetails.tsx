import React, { useEffect, useState, useMemo, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconArrowLeft, IconSitemap, IconListDetails, IconUsers,
  IconX, IconSearch, IconLayersIntersect, IconChevronRight,
  IconChevronDown, IconChevronLeft, IconTarget, IconCheck,
  IconAlertCircle, IconBuilding, IconShield, IconUser,
  IconGitBranch, IconEye
} from '@tabler/icons-react';
import { toast } from 'react-toastify';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  useNodesState, useEdgesState, MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import moment from 'moment';
import { GetWorkflowById } from '../../common/Apis';

// --- LIGHT THEME CONFIGURATION ---
const C = {
  bg: '#F4F7F9',            // Soft light gray background
  surface: '#FFFFFF',       // Pure white cards and panels
  surfaceHover: '#F8FAFC',  // Very subtle hover state
  surfaceActive: '#F1F5F9', // Slightly deeper active state
  border: '#E2E8F0',        // Standard light border
  borderLight: '#F1F5F9',   // Softer inner border
  accent: '#2563EB',        // Vibrant blue
  accentDim: '#1D4ED8',     // Darker blue
  accentGlow: 'rgba(37,99,235,0.12)',
  green: '#059669',         // Emerald green for readability
  greenGlow: 'rgba(5,150,105,0.12)',
  amber: '#D97706',         // Amber orange
  amberGlow: 'rgba(217,119,6,0.12)',
  red: '#DC2626',           // Crimson red
  redGlow: 'rgba(220,38,38,0.12)',
  purple: '#7C3AED',        // Deep violet
  purpleGlow: 'rgba(124,58,237,0.12)',
  teal: '#0D9488',          // Teal
  tealGlow: 'rgba(13,148,136,0.12)',
  textPrimary: '#0F172A',   // Near-black for maximum readability
  textSecondary: '#475569', // Slate gray for secondary details
  textMuted: '#64748B',     // Lighter slate for muted items
};

const STEP_TYPE_CONFIG = {
  APPROVAL: { color: C.green, glow: C.greenGlow, label: 'Approval', icon: <IconCheck size={14} stroke={3} /> },
  REVIEW: { color: C.amber, glow: C.amberGlow, label: 'Review', icon: <IconEye size={14} stroke={2.5} /> },
  NOTIFICATION: { color: C.teal, glow: C.tealGlow, label: 'Notification', icon: <IconAlertCircle size={14} stroke={2.5} /> },
  DEFAULT: { color: C.accent, glow: C.accentGlow, label: 'Task', icon: <IconTarget size={14} stroke={2.5} /> }
};

const ASSIGNEE_TYPE_CONFIG = {
  USER: { color: C.accent, icon: <IconUser size={12} stroke={2.5} /> },
  ROLE: { color: C.purple, icon: <IconShield size={12} stroke={2.5} /> },
  DEPARTMENT: { color: C.teal, icon: <IconBuilding size={12} stroke={2.5} /> },
};

// Helper to safely extract step type from nested JSON structure
const getStepType = (step) => {
  const actionType = step?.assignments?.[0]?.actionType;
  return STEP_TYPE_CONFIG[actionType] || STEP_TYPE_CONFIG.DEFAULT;
};

// --- COMPONENTS ---

const StepFlowNode = memo(({ data, selected }) => {
  const cfg = getStepType(data);
  const assigneeCount = (data.assignments || []).reduce((sum, a) => sum + (a.assigneeIds?.length || 0), 0);

  return (
    <div className="relative font-sans transition-transform hover:scale-[1.02]">
      <Handle type="target" position={Position.Left}
        style={{ background: cfg.color, width: 10, height: 10, border: `2px solid ${C.surface}`, boxShadow: `0 0 10px ${cfg.glow}` }} />
      
      <div style={{
        width: 260,
        background: selected ? C.surfaceActive : C.surface,
        border: `1px solid ${selected ? cfg.color : C.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: selected ? `0 0 0 2px ${cfg.glow}, 0 12px 30px rgba(0,0,0,0.12)` : '0 8px 24px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Node Header */}
        <div style={{ background: selected ? `${cfg.color}1A` : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${C.border}`, padding: '10px 14px' }}
          className="flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span style={{ background: cfg.color, color: C.surface, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.5 }}>
              S-{data.stepNumber}
            </span>
            <span style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          {data.allowParallel && (
            <span style={{ color: C.purple, background: C.purpleGlow, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>
              ∥ PARALLEL
            </span>
          )}
        </div>

        {/* Node Body */}
        <div style={{ padding: '14px' }}>
          <p style={{ color: C.textPrimary, fontWeight: 600, fontSize: 14, lineHeight: 1.4, marginBottom: 12 }} className="line-clamp-2">
            {data.stepName}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(data.assignments || []).slice(0, 3).map((a, i) => {
                const ac = ASSIGNEE_TYPE_CONFIG[a.assigneeType] || ASSIGNEE_TYPE_CONFIG.USER;
                return (
                  <span key={i} style={{ color: ac.color, background: `${ac.color}15`, border: `1px solid ${ac.color}30`, fontSize: 10, padding: '2px 6px', borderRadius: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {ac.icon} {a.assigneeType}
                  </span>
                );
              })}
            </div>
            {assigneeCount > 0 && (
               <span style={{ color: C.textSecondary, fontSize: 10, fontWeight: 600, background: C.surfaceHover, padding: '2px 6px', borderRadius: 6, border: `1px solid ${C.border}` }}>
                 {assigneeCount} User{assigneeCount !== 1 ? 's' : ''}
               </span>
            )}
          </div>
        </div>
      </div>
      
      <Handle type="source" position={Position.Right}
        style={{ background: cfg.color, width: 10, height: 10, border: `2px solid ${C.surface}`, boxShadow: `0 0 10px ${cfg.glow}` }} />
    </div>
  );
});

const FlowCanvas = memo(({ steps = [], onNodeClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ step: StepFlowNode }), []);

  useEffect(() => {
    if (!steps.length) return;
    const newNodes = steps.map((s, i) => ({
      id: s.id ? String(s.id) : `node-${i}`,
      type: 'step',
      position: { x: i * 340, y: i % 2 === 0 ? 100 : 200 },
      data: { ...s, stepNumber: i + 1 },
    }));
    
    const newEdges = steps.slice(0, -1).map((_, i) => {
      const sourceStep = steps[i];
      const cfg = getStepType(sourceStep);
      return {
        id: `e-${i}`,
        source: steps[i].id ? String(steps[i].id) : `node-${i}`,
        target: steps[i + 1].id ? String(steps[i + 1].id) : `node-${i + 1}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: cfg.color, strokeWidth: 2, opacity: 0.8 },
        markerEnd: { type: MarkerType.ArrowClosed, color: cfg.color, width: 20, height: 20 },
      };
    });
    setNodes(newNodes);
    setEdges(newEdges);
  }, [steps, setNodes, setEdges]);

  return (
    <div className="h-full w-full relative" style={{ background: C.bg }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onNodeClick?.(node)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color={C.border} gap={24} size={2} variant="dots" />
        <Controls style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}
          showInteractive={false} className="shadow-sm" />
        <MiniMap
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}
          nodeColor={n => getStepType(n.data).color}
          maskColor={`${C.bg}E6`}
        />
      </ReactFlow>
    </div>
  );
});

const AssigneeCard = ({ item }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}` }}
    className="flex items-center gap-3 p-3 rounded-xl hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group shadow-sm">
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0"
      style={{ background: C.accentGlow, color: C.accent, border: `1px solid ${C.accent}30` }}>
      {(item.name || item.username || 'U')[0]}
    </div>
    <div className="truncate min-w-0">
      <p className="text-sm font-semibold truncate tracking-tight" style={{ color: C.textPrimary }}>
        {item.name || item.username || `ID: ${item}`}
      </p>
      {item.id && <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: C.textMuted }}>ID: {item.id}</p>}
    </div>
  </div>
);

const AssigneeList = ({ list = [] }) => {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 6;

  const filtered = useMemo(() =>
    list.filter(item =>
      String(item.name || item.username || item || '').toLowerCase().includes(q.toLowerCase())
    ), [list, q]);

  const visible = expanded ? filtered : filtered.slice(0, LIMIT);

  if (!list.length) return null;

  return (
    <div className="space-y-4 mt-3">
      {list.length > LIMIT && (
        <div className="relative">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <input type="text" placeholder="Filter assignees…" value={q}
            onChange={e => setQ(e.target.value)}
            style={{ background: C.surfaceHover, border: `1px solid ${C.border}`, color: C.textPrimary }}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((item, i) => <AssigneeCard key={i} item={typeof item === 'object' ? item : { name: String(item) }} />)}
      </div>
      {filtered.length > LIMIT && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ color: C.accent, border: `1px dashed ${C.border}`, background: C.surfaceHover }}
          className="w-full py-3 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all">
          {expanded ? 'Collapse List ↑' : `View All ${filtered.length} Assignees ↓`}
        </button>
      )}
    </div>
  );
};

const RolesBadges = ({ roles = [] }) => {
  if (!roles.length) return null;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-3">
      {roles.map((roleObj, i) => (
        <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}` }} className="rounded-xl p-4 shadow-sm">
          {roleObj.department && (
            <div className="flex items-center gap-2 mb-3">
              <IconBuilding size={14} style={{ color: C.teal }} />
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.teal }}>
                Dept: {roleObj.department}
              </p>
            </div>
          )}
          
          {roleObj.roles && roleObj.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roleObj.roles.map((r, j) => (
                <div key={j} style={{ background: C.surfaceHover, border: `1px solid ${C.border}` }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.purple }} />
                  <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                    {r.name || r}
                  </span>
                  {r.id && <span className="text-[10px] text-slate-400 font-mono ml-1">#{r.id}</span>}
                </div>
              ))}
            </div>
          ) : (
             <span style={{ color: C.textMuted }} className="text-xs italic">No specific roles defined</span>
          )}
        </div>
      ))}
    </div>
  );
};

const AssignmentLayer = ({ assignment, index }) => {
  const [expanded, setExpanded] = useState(true);
  const ac = ASSIGNEE_TYPE_CONFIG[assignment.assigneeType] || ASSIGNEE_TYPE_CONFIG.USER;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${ac.color}` }}
      className="rounded-xl overflow-hidden shadow-sm transition-all">
      <button className="w-full px-5 py-4 flex flex-wrap items-center justify-between hover:bg-black/[0.02] transition-colors gap-4"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-wrap items-center gap-3">
          <span style={{ background: `${ac.color}10`, color: ac.color, border: `1px solid ${ac.color}30` }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide">
            {ac.icon} {assignment.assigneeType}
          </span>
          
          <IconChevronRight size={14} style={{ color: C.textMuted }} />
          
          <span style={{ background: C.surfaceHover, color: C.textPrimary, border: `1px solid ${C.border}` }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide shadow-sm">
            Action: {assignment.actionType}
          </span>
          
          {assignment.allowParallel && (
            <span style={{ color: C.purple, background: C.purpleGlow, border: `1px solid ${C.purple}30` }}
              className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">
              Parallel Enabled
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            {Array.from({ length: Math.min(assignment.assigneeIds?.length || 0, 3) }).map((_, i) => (
               <div key={i} className="w-6 h-6 rounded-full border-2" style={{ borderColor: C.surface, background: C.border }} />
            ))}
            {(assignment.assigneeIds?.length || 0) > 3 && (
               <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold" 
                    style={{ borderColor: C.surface, background: C.surfaceHover, color: C.textSecondary }}>
                 +{(assignment.assigneeIds?.length || 0) - 3}
               </div>
            )}
          </div>
          <span className="text-xs font-semibold" style={{ color: C.textMuted }}>
            {assignment.assigneeIds?.length || 0} Target{(assignment.assigneeIds?.length !== 1) ? 's' : ''}
          </span>
          <div style={{ background: C.surfaceHover, padding: '4px', borderRadius: '6px' }}>
            {expanded ? <IconChevronDown size={16} color={C.textPrimary} /> : <IconChevronRight size={16} color={C.textMuted} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}` }} className="px-6 py-5 space-y-6 bg-black/[0.02]">
          
          {assignment.assigneeIds?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b pb-2" style={{ color: C.textPrimary, borderColor: C.border }}>
                <IconUsers size={14} style={{ color: C.accent }} /> Specific Assignees
              </h4>
              <AssigneeList list={assignment.assigneeIds} />
            </div>
          )}

          {assignment.selectedRoles?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b pb-2" style={{ color: C.textPrimary, borderColor: C.border }}>
                <IconShield size={14} style={{ color: C.purple }} /> Department & Role Mapping
              </h4>
              <RolesBadges roles={assignment.selectedRoles} />
            </div>
          )}
          
          {!(assignment.assigneeIds?.length > 0) && !(assignment.selectedRoles?.length > 0) && (
            <p className="text-sm italic" style={{ color: C.textMuted }}>No specific targets defined for this assignment block.</p>
          )}
        </div>
      )}
    </div>
  );
};

const StepDetailPanel = ({ step }) => {
  if (!step) return (
    <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: C.textMuted }}>
      <div className="w-16 h-16 mb-4 rounded-full flex items-center justify-center shadow-inner" style={{ background: C.surfaceHover, border: `1px solid ${C.border}` }}>
         <IconTarget size={28} className="opacity-40" />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest opacity-80">Select a workflow step</p>
      <p className="text-xs mt-2 max-w-xs leading-relaxed">Click on any node in the visual map or the sidebar to view its configuration.</p>
    </div>
  );

  const cfg = getStepType(step);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div style={{ background: C.surface, border: `1px solid ${C.border}` }} className="rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 shadow-inner"
            style={{ background: cfg.glow, color: cfg.color, border: `2px solid ${cfg.color}30` }}>
            {step.stepNumber}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black tracking-tight mb-3" style={{ color: C.textPrimary }}>{step.stepName}</h2>
            <div className="flex flex-wrap items-center gap-2.5">
              <span style={{ color: cfg.color, background: cfg.glow, border: `1px solid ${cfg.color}30` }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wide">
                {cfg.icon} {cfg.label}
              </span>
              <span style={{ color: step.allowParallel ? C.purple : C.amber, background: step.allowParallel ? C.purpleGlow : C.amberGlow, border: `1px solid ${step.allowParallel ? C.purple : C.amber}30` }}
                className="text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1.5">
                {step.allowParallel ? '∥ Parallel Execution' : '⟶ Sequential Execution'}
              </span>
              {step.requiresDocument !== undefined && (
                <span style={{ color: step.requiresDocument ? C.green : C.textMuted, background: step.requiresDocument ? C.greenGlow : C.surfaceHover, border: `1px solid ${step.requiresDocument ? C.green : C.border}40` }}
                  className="text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1.5">
                  {step.requiresDocument ? '✓ Requires Document' : '✗ No Document Required'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
           <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: C.textPrimary }}>
             <IconLayersIntersect size={18} style={{ color: C.accent }} />
             Assignment Blocks
           </h3>
           <span style={{ color: C.accent, background: C.accentGlow, border: `1px solid ${C.accent}30` }} 
                 className="text-xs px-2.5 py-1 rounded-md font-black">
             {step.assignments?.length || 0} Configured
           </span>
        </div>

        {step.assignments?.length ? (
          <div className="space-y-4">
            {step.assignments.map((a, i) => <AssignmentLayer key={i} assignment={a} index={i} />)}
          </div>
        ) : (
          <div style={{ background: C.surfaceHover, border: `1px dashed ${C.border}` }} className="rounded-2xl p-8 text-center shadow-inner">
            <IconAlertCircle size={32} className="mx-auto mb-3 opacity-30" style={{ color: C.textMuted }} />
            <p className="text-sm font-semibold" style={{ color: C.textSecondary }}>No assignments configured for this step</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function WorkflowDetails({ modalId, isModalView = false, closeModal, readOnly = true }) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const activeId = modalId || paramId;

  // Initialized to null for actual API fetching
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visual');
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ACTUAL API FETCH LOGIC
  useEffect(() => {
    const fetchWorkflowData = async () => {
      if (!activeId) return;
      try {
        setLoading(true);
        const res = await GetWorkflowById(activeId);
        // Map the payload to match the backend structure dynamically
        setWorkflow(res?.data?.workflow || res?.data || res?.workflow);
      } catch (err) {
        toast.error('Error fetching workflow data');
      } finally {
        setLoading(false);
        // 👇 Force the window to the top right after the loader disappears
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 10);
      }
    };
    fetchWorkflowData();
  }, [activeId]);

  const handleNodeClick = useCallback((node) => {
    const idx = workflow?.steps?.findIndex(s => String(s.id) === String(node.id));
    if (idx !== undefined && idx >= 0) {
      setSelectedStepIdx(idx);
      setActiveTab('config');
    }
  }, [workflow]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen" style={{ background: C.bg }}>
      <div className="relative w-12 h-12 mb-5">
        <div className="absolute inset-0 rounded-full border-4 opacity-20" style={{ borderColor: C.accent }} />
        <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: C.accent }} />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest animate-pulse" style={{ color: C.accent }}>Loading Workflow…</p>
    </div>
  );

  if (!workflow) return (
    <div className="flex flex-col items-center justify-center h-screen" style={{ background: C.bg }}>
      <IconAlertCircle size={48} className="mb-4 drop-shadow-md" style={{ color: C.red }} />
      <p className="text-lg font-black uppercase tracking-widest" style={{ color: C.textPrimary }}>Workflow Not Found</p>
      <p className="text-sm mt-2" style={{ color: C.textMuted }}>The requested workflow could not be loaded or does not exist.</p>
    </div>
  );

  const totalAssignees = (workflow.steps || []).reduce((sum, s) =>
    sum + (s.assignments || []).reduce((s2, a) => s2 + (a.assigneeIds?.length || 0) + (a.selectedRoles?.length || 0), 0), 0);

  return (
    <div className={`flex flex-col overflow-hidden font-sans ${isModalView ? 'h-[92vh] rounded-2xl border' : 'h-[calc(100vh-96px)]'}`}
      style={{ background: C.bg, borderColor: C.border, boxShadow: isModalView ? '0 30px 100px rgba(0,0,0,0.15)' : 'none' }}>

      {/* TOP HEADER */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
        className="px-6 py-4 flex items-center justify-between shrink-0 gap-6 z-10 shadow-sm">
        
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {!isModalView && (
            <button onClick={() => navigate(-1)}
              style={{ color: C.textPrimary, background: C.surface, border: `1px solid ${C.border}` }}
              className="p-2.5 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shrink-0 shadow-sm">
              <IconArrowLeft size={18} />
            </button>
          )}

          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
              style={{ background: `linear-gradient(135deg, ${C.accentGlow}, transparent)`, border: `1px solid ${C.accent}30` }}>
              <IconGitBranch size={22} style={{ color: C.accent }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0 mb-1">
                <h1 className="text-lg font-black truncate tracking-tight" style={{ color: C.textPrimary }}>{workflow.name}</h1>
                <span style={{ color: C.accent, background: C.accentGlow, border: `1px solid ${C.accent}30` }}
                  className="text-[10px] font-black px-2 py-0.5 rounded shrink-0 uppercase tracking-widest shadow-sm">v{workflow.version}</span>
                {readOnly && (
                  <span style={{ color: C.amber, background: C.amberGlow, border: `1px solid ${C.amber}30` }}
                    className="text-[10px] font-black px-2 py-0.5 rounded shrink-0 uppercase tracking-widest shadow-sm">Read Only</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium" style={{ color: C.textMuted }}>
                <span className="flex items-center gap-1.5"><IconUser size={12} /> {workflow.createdBy?.username || 'System'}</span>
                <span>•</span>
                <span>Created {moment(workflow.createdAt).format('MMM D, YYYY')}</span>
                {(workflow.parentWorkflowId || workflow.parentWorkflowName) && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">
                      Parent: {workflow.parentWorkflowName || workflow.parentWorkflow?.name || (workflow.parentWorkflowId && `${workflow.parentWorkflowId.split('-')[0]}...`)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div style={{ background: C.surfaceHover, border: `1px solid ${C.border}` }} className="flex p-1.5 rounded-xl gap-1 shadow-inner">
            {[
              { id: 'visual', icon: <IconSitemap size={16} />, label: 'Flow Map' },
              { id: 'config', icon: <IconListDetails size={16} />, label: 'Settings' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={activeTab === tab.id
                  ? { background: C.accent, color: '#fff', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }
                  : { color: C.textSecondary }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all hover:text-slate-900">
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {isModalView && (
            <button onClick={closeModal}
              style={{ color: C.textMuted, background: C.surfaceHover, border: `1px solid ${C.border}` }}
              className="p-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm ml-2">
              <IconX size={18} />
            </button>
          )}
        </div>
      </header>

      {/* STATS BAR */}
      <div style={{ background: C.surfaceHover, borderBottom: `1px solid ${C.border}` }}
        className="px-6 py-3 flex items-center gap-8 overflow-x-auto shrink-0 hide-scrollbar shadow-inner">
        {[
          { label: 'Total Steps', value: workflow.steps?.length ?? 0, color: C.accent },
          { label: 'Rule Blocks', value: totalAssignees, color: C.purple },
        ].map(stat => (
          <div key={stat.label} className="flex items-baseline gap-2.5 shrink-0">
            <span className="text-xl font-black tabular-nums tracking-tight" style={{ color: stat.color }}>{stat.value}</span>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.textMuted }}>{stat.label}</span>
          </div>
        ))}
        {workflow.description && (
          <>
            <div className="w-px h-6 shrink-0 opacity-50" style={{ background: C.border }} />
            <p className="text-sm font-medium italic truncate max-w-xl" style={{ color: C.textSecondary }}>{workflow.description}</p>
          </>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'visual' ? (
          <div className="flex-1 relative">
            <FlowCanvas steps={workflow.steps || []} onNodeClick={handleNodeClick} />
            
            <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: C.textMuted }}>Node Legend</p>
              {Object.entries(STEP_TYPE_CONFIG).filter(([k]) => k !== 'DEFAULT').map(([key, val]) => (
                <div key={key} className="flex items-center gap-3 mb-2.5">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: val.color, boxShadow: `0 0 6px ${val.color}60` }} />
                  <span className="text-xs font-bold tracking-wide" style={{ color: C.textSecondary }}>{val.label} Node</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}` }} className="mt-4 pt-3">
                <p className="text-xs italic" style={{ color: C.textMuted }}>Click any node to view configuration</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* CONFIG SIDEBAR */}
            <aside style={{ background: C.surface, borderRight: `1px solid ${C.border}`, width: sidebarOpen ? 320 : 64 }}
              className="flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 z-10 shadow-lg relative">
              
              <div style={{ borderBottom: `1px solid ${C.border}` }} className="flex items-center justify-between px-5 py-4 bg-black/[0.03]">
                {sidebarOpen && (
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.textSecondary }}>Workflow Path</p>
                )}
                <button onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{ color: C.textMuted, background: C.surface, border: `1px solid ${C.border}` }} 
                  className="hover:text-slate-900 transition-colors p-1.5 rounded-lg shadow-sm ml-auto">
                  {sidebarOpen ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {workflow.steps?.map((s, idx) => {
                  const cfg = getStepType(s);
                  const isActive = selectedStepIdx === idx;
                  return (
                    <button key={idx} onClick={() => setSelectedStepIdx(idx)}
                      style={{
                        background: isActive ? `${cfg.color}10` : C.surface,
                        border: `1px solid ${isActive ? `${cfg.color}40` : C.border}`,
                      }}
                      className={`w-full px-4 py-3.5 text-left transition-all rounded-xl flex items-center gap-4 relative overflow-hidden group hover:border-blue-300 ${isActive ? 'shadow-sm' : 'shadow-sm hover:bg-black/[0.02]'}`}>
                      
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: cfg.color }} />}
                      
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors"
                        style={{ background: isActive ? cfg.color : C.surfaceHover, color: isActive ? '#fff' : C.textMuted, border: `1px solid ${isActive ? 'transparent' : C.border}` }}>
                        {idx + 1}
                      </span>
                      
                      {sidebarOpen && (
                        <div className="truncate min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate mb-1 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>{s.stepName}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: cfg.color }}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* CONFIG MAIN PANEL */}
            <section className="flex-1 overflow-y-auto p-8 lg:p-12 relative" style={{ background: C.bg }}>
               <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-500/[0.03] to-transparent pointer-events-none" />
               <StepDetailPanel step={workflow.steps?.[selectedStepIdx] ? { ...workflow.steps[selectedStepIdx], stepNumber: selectedStepIdx + 1 } : null} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}