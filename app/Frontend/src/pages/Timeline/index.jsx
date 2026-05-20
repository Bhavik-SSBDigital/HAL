import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import html2pdf from 'html2pdf.js';
import { toast } from 'react-hot-toast';
import {
  IconCheck, IconX, IconClock, IconFileText, IconMessageCircle,
  IconLayersIntersect,
  IconAlertCircle, IconInfoCircle, IconThumbUp, IconCheckupList,
  IconSignature, IconUpload, IconChevronUp, IconChevronDown,
  IconFileArrowRight, IconArrowLeft, IconEye, IconAlignBoxCenterMiddle,
  IconCalendarEvent, IconUser, IconDatabase, IconFolderOpen,
  IconHash, IconLayoutList, IconTag, IconNotes, IconGitCommit,
  IconTarget, IconShield, IconBuilding, IconSitemap, IconListDetails,
  IconUsers, IconChevronRight, IconChevronLeft, IconSearch
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  useNodesState, useEdgesState, MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TimelineLegend from './TimelineLegend';
import CustomButton from '../../CustomComponents/CustomButton';
import { ViewDocument } from '../../common/Apis';
import ViewFile from '../view/View';
import { ImageConfig } from '../../config/ImageConfig';
import ReOpenProcessModal from '../Processes/Actions/ReOpenProcessModal';
import CustomModal from '../../CustomComponents/CustomModal';

// --- HELPERS ---
const renderValue = (val, fallback = '--') => {
  if (val === 0 || val === '0') return val;
  if (val === false) return 'No';
  if (val === true) return 'Yes';
  if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return fallback;
  return val;
};

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- CONFIGURATION MATRIX ---
const C = {
  bg: '#F4F7F9',            
  surface: '#FFFFFF',       
  surfaceHover: '#F8FAFC',  
  surfaceActive: '#F1F5F9', 
  border: '#E2E8F0',        
  accent: '#2563EB',        
  accentGlow: 'rgba(37,99,235,0.12)',
  green: '#059669',         
  greenGlow: 'rgba(5,150,105,0.12)',
  amber: '#D97706',         
  amberGlow: 'rgba(217,119,6,0.12)',
  red: '#DC2626',           
  purple: '#7C3AED',        
  purpleGlow: 'rgba(124,58,237,0.12)',
  teal: '#0D9488',          
  tealGlow: 'rgba(13,148,136,0.12)',
  textPrimary: '#0F172A',   
  textSecondary: '#475569', 
  textMuted: '#64748B',     
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

const getStepType = (step) => {
  const actionType = step?.assignments?.[0]?.actionType;
  return STEP_TYPE_CONFIG[actionType] || STEP_TYPE_CONFIG.DEFAULT;
};

// --- TIMELINE CONSTANTS ---
const iconMap = {
  PROCESS_INITIATED: <IconInfoCircle size={18} className="text-blue-600" />,
  DOCUMENT_SIGNED: <IconSignature size={18} className="text-emerald-600" />,
  DOCUMENT_REJECTED: <IconX size={18} className="text-rose-600" />,
  QUERY_RAISED: <IconAlertCircle size={18} className="text-amber-600" />,
  QUERY_RESOLVED: <IconCheckupList size={18} className="text-emerald-600" />,
  RECOMMENDATION_REQUESTED: <IconMessageCircle size={18} className="text-violet-600" />,
  RECOMMENDATION_PROVIDED: <IconThumbUp size={18} className="text-violet-600" />,
  STEP_COMPLETED: <IconCheck size={18} className="text-teal-600" />,
  DOCUMENT_UPLOADED: <IconUpload size={18} className="text-cyan-600" />,
};

// --- REACT FLOW NODE SUB-COMPONENTS ---
const StepFlowNode = memo(({ data, selected }) => {
  const cfg = getStepType(data);
  const assigneeCount = (data.assignments || []).reduce((sum, a) => sum + (a.assigneeIds?.length || 0), 0);

  return (
    <div className="relative font-sans transition-transform hover:scale-[1.02]">
      <Handle type="target" position={Position.Left} style={{ background: cfg.color, width: 10, height: 10, border: `2px solid ${C.surface}`, boxShadow: `0 0 10px ${cfg.glow}` }} />
      <div style={{
        width: 260, background: selected ? C.surfaceActive : C.surface, border: `1px solid ${selected ? cfg.color : C.border}`,
        borderRadius: 16, overflow: 'hidden', boxShadow: selected ? `0 0 0 2px ${cfg.glow}, 0 12px 30px rgba(0,0,0,0.12)` : '0 8px 24px rgba(0,0,0,0.06)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ background: selected ? `${cfg.color}1A` : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${C.border}`, padding: '10px 14px' }} className="flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span style={{ background: cfg.color, color: C.surface, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: 0.5 }}>S-{data.stepNumber}</span>
            <span style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{cfg.icon} {cfg.label}</span>
          </div>
          {data.allowParallel && (
            <span style={{ color: C.purple, background: C.purpleGlow, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>∥ PARALLEL</span>
          )}
        </div>
        <div style={{ padding: '14px' }}>
          <p style={{ color: C.textPrimary, fontWeight: 600, fontSize: 14, lineHeight: 1.4, marginBottom: 12 }} className="line-clamp-2">{data.stepName}</p>
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
      <Handle type="source" position={Position.Right} style={{ background: cfg.color, width: 10, height: 10, border: `2px solid ${C.surface}`, boxShadow: `0 0 10px ${cfg.glow}` }} />
    </div>
  );
});

const FlowCanvas = memo(({ steps = [], onNodeClick }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeTypes = useMemo(() => ({ step: StepFlowNode }), []);

  useEffect(() => {
    if (!steps || !steps.length) return;
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
    <div className="h-full w-full absolute inset-0 rounded-xl overflow-hidden" style={{ background: C.bg }}>
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
        <Controls style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }} showInteractive={false} className="shadow-sm" />
        <MiniMap style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }} nodeColor={n => getStepType(n.data).color} maskColor={`${C.bg}E6`} />
      </ReactFlow>
    </div>
  );
});

// --- STEP SETTINGS CONFIG SUB-COMPONENTS ---
const AssigneeCard = ({ item }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.border}` }} className="flex items-center gap-3 p-3 rounded-xl hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group shadow-sm">
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0" style={{ background: C.accentGlow, color: C.accent, border: `1px solid ${C.accent}30` }}>
      {(item.name || item.username || 'U')[0]}
    </div>
    <div className="truncate min-w-0">
      <p className="text-sm font-semibold truncate tracking-tight" style={{ color: C.textPrimary }}>{item.name || item.username || `ID: ${item}`}</p>
      {item.id && <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: C.textMuted }}>ID: {item.id}</p>}
    </div>
  </div>
);

const AssigneeList = ({ list = [] }) => {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 6;

  const filtered = useMemo(() => list.filter(item => String(item.name || item.username || item || '').toLowerCase().includes(q.toLowerCase())), [list, q]);
  const visible = expanded ? filtered : filtered.slice(0, LIMIT);

  if (!list.length) return null;

  return (
    <div className="space-y-4 mt-3">
      {list.length > LIMIT && (
        <div className="relative">
          <IconSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <input type="text" placeholder="Filter assignees…" value={q} onChange={e => setQ(e.target.value)} style={{ background: C.surfaceHover, border: `1px solid ${C.border}`, color: C.textPrimary }} className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((item, i) => <AssigneeCard key={i} item={typeof item === 'object' ? item : { name: String(item) }} />)}
      </div>
      {filtered.length > LIMIT && (
        <button onClick={() => setExpanded(!expanded)} style={{ color: C.accent, border: `1px dashed ${C.border}`, background: C.surfaceHover }} className="w-full py-3 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all">
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
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.teal }}>Dept: {roleObj.department}</p>
            </div>
          )}
          {roleObj.roles && roleObj.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roleObj.roles.map((r, j) => (
                <div key={j} style={{ background: C.surfaceHover, border: `1px solid ${C.border}` }} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.purple }} />
                  <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>{r.name || r}</span>
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

const AssignmentLayer = ({ assignment }) => {
  const [expanded, setExpanded] = useState(true);
  const ac = ASSIGNEE_TYPE_CONFIG[assignment.assigneeType] || ASSIGNEE_TYPE_CONFIG.USER;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${ac.color}` }} className="rounded-xl overflow-hidden shadow-sm transition-all">
      <button className="w-full px-5 py-4 flex flex-wrap items-center justify-between hover:bg-black/[0.02] transition-colors gap-4" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-wrap items-center gap-3">
          <span style={{ background: `${ac.color}10`, color: ac.color, border: `1px solid ${ac.color}30` }} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide">
            {ac.icon} {assignment.assigneeType}
          </span>
          <IconChevronRight size={14} style={{ color: C.textMuted }} />
          <span style={{ background: C.surfaceHover, color: C.textPrimary, border: `1px solid ${C.border}` }} className="text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide shadow-sm">
            Action: {assignment.actionType}
          </span>
          {assignment.allowParallel && (
            <span style={{ color: C.purple, background: C.purpleGlow, border: `1px solid ${C.purple}30` }} className="text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide">Parallel Enabled</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-2">
            {Array.from({ length: Math.min(assignment.assigneeIds?.length || 0, 3) }).map((_, i) => (
               <div key={i} className="w-6 h-6 rounded-full border-2" style={{ borderColor: C.surface, background: C.border }} />
            ))}
          </div>
          <span className="text-xs font-semibold" style={{ color: C.textMuted }}>{assignment.assigneeIds?.length || 0} Target{(assignment.assigneeIds?.length !== 1) ? 's' : ''}</span>
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
    <div className="flex flex-col items-center justify-center h-full text-center py-12" style={{ color: C.textMuted }}>
      <div className="w-16 h-16 mb-4 rounded-full flex items-center justify-center shadow-inner" style={{ background: C.surfaceHover, border: `1px solid ${C.border}` }}>
         <IconTarget size={28} className="opacity-40" />
      </div>
      <p className="text-sm font-bold uppercase tracking-widest opacity-80">Select a workflow step</p>
      <p className="text-xs mt-2 max-w-xs leading-relaxed">Click on any node in the list checklist to view its underlying target configurations.</p>
    </div>
  );

  const cfg = getStepType(step);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div style={{ background: C.surface, border: `1px solid ${C.border}` }} className="rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-inner" style={{ background: cfg.glow, color: cfg.color, border: `2px solid ${cfg.color}30` }}>
            {step.stepNumber}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black tracking-tight mb-2" style={{ color: C.textPrimary }}>{step.stepName}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span style={{ color: cfg.color, background: cfg.glow, border: `1px solid ${cfg.color}30` }} className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                {cfg.icon} {cfg.label}
              </span>
              <span style={{ color: step.allowParallel ? C.purple : C.amber, background: step.allowParallel ? C.purpleGlow : C.amberGlow, border: `1px solid ${step.allowParallel ? C.purple : C.amber}30` }} className="text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1.5">
                {step.allowParallel ? '∥ Parallel Execution' : '⟶ Sequential Execution'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: C.textPrimary }}>
             <IconLayersIntersect size={16} style={{ color: C.accent }} /> Assignment Blocks
           </h3>
        </div>
        {step.assignments?.length ? (
          <div className="space-y-4">
            {step.assignments.map((a, i) => <AssignmentLayer key={i} assignment={a} />)}
          </div>
        ) : (
          <div style={{ background: C.surfaceHover, border: `1px dashed ${C.border}` }} className="rounded-2xl p-6 text-center shadow-inner">
            <IconAlertCircle size={24} className="mx-auto mb-2 opacity-30" style={{ color: C.textMuted }} />
            <p className="text-sm font-semibold" style={{ color: C.textSecondary }}>No assignments configured for this step</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMBINED TIMELINE PANEL ---
const Timeline = ({ activities, setActionsLoading, actionsLoading, workflow, print, id, process, reOpen }) => {
  const navigate = useNavigate();
  const [fileView, setFileView] = useState(null);
  const [openModal, setOpenModal] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(null);

  // Workflow visualizer integration internal state
  const [activeTab, setActiveTab] = useState('visual');
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleView = async (name, path, fileId, type) => {
    setActionsLoading(true);
    try {
      const fileData = await ViewDocument(name, path, type, fileId);
      setFileView(fileData);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setActionsLoading(false);
    }
  };

  const handleBack = () => navigate(-1);

  const openDocDetails = (doc) => {
    const uploadActivity = activities.find((a) => a.actionType === 'DOCUMENT_UPLOADED' && a.details?.documentId === doc.id);
    const workflowName = process?.workflow?.name || activities.find((a) => a.details?.workflow)?.details?.workflow || '--';
    setDocumentModalOpen({
      ...doc,
      createdBy: uploadActivity?.details?.uploadedBy || 'System / Unknown',
      createdOn: uploadActivity?.createdAt || null,
      processName: process?.processName || '--',
      workflowName: workflowName,
      SOPIssueNo: doc.SOPIssueNo,
      issueNo: doc.issueNo
    });
  };

  const workflowSteps = useMemo(() => {
    return Array.isArray(workflow) ? workflow : (workflow?.steps || []);
  }, [workflow]);

  const handleNodeClick = useCallback((node) => {
    const idx = workflowSteps.findIndex(s => String(s.id) === String(node.id));
    if (idx !== undefined && idx >= 0) {
      setSelectedStepIdx(idx);
      setActiveTab('config');
    }
  }, [workflowSteps]);

  // Helper to render dynamic status badge based on state
  const getStatusBadge = (status) => {
    if (!status) return '--';
    const s = String(status).toUpperCase();
    
    // Default styling (fallback)
    let colorClass = 'text-slate-700 bg-slate-100 border-slate-200';
    
    // Custom mappings
    if (s === 'IN_PROGRESS') colorClass = 'text-blue-700 bg-blue-50 border-blue-200';
    else if (s === 'COMPLETED' || s === 'APPROVED') colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    else if (s === 'REJECTED' || s === 'CANCELLED') colorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border tracking-wider uppercase shadow-sm ${colorClass}`}>
        {s.replace(/_/g, ' ')}
      </span>
    );
  };

  const logDetails = [
    { label: 'Process ID', value: renderValue(process?.processId) },
    { label: 'Process Name', value: renderValue(process?.processName) },
    { label: 'Status', value: getStatusBadge(process?.processStatus) }, // Status Display Added Here
  ];

  const renderDocumentProperties = (details) => {
    return (
      <div className="mt-4 bg-slate-50/50 rounded-lg border border-slate-200/60 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Doc Issue No</p>
             <p className="text-sm font-medium text-slate-900 truncate">{renderValue(details.issueNo)}</p>
           </div>
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Process SOP No</p>
             <p className="text-sm font-medium text-slate-900 truncate">{renderValue(details.SOPIssueNo)}</p>
           </div>
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Part No</p>
             <p className="text-sm font-medium text-slate-900 truncate">{renderValue(details.partNumber)}</p>
           </div>
           <div className="min-w-0">
             <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Cycle</p>
             <div className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-sm">
               {renderValue(details.reopenCycle, '0')}
             </div>
           </div>
        </div>
        {details.description && (
          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Description</p>
            <p className="text-sm text-slate-700 break-words leading-relaxed">{details.description}</p>
          </div>
        )}
        {(details.superseding || details.isReplacement) && details.reasonOfSupersed && (
          <div className="mt-3 pt-3 border-t border-rose-100/60">
            <p className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-1">Supersed Reason</p>
            <p className="text-sm text-rose-800 break-words leading-relaxed">{details.reasonOfSupersed}</p>
          </div>
        )}
        {details.tags && details.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-1.5 flex-wrap">
            <IconTag size={14} className="text-slate-400 shrink-0"/>
            {details.tags.map((tag, i) => (
              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-white border border-slate-200 text-slate-600 truncate max-w-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetails = (activity) => {
    const { actionType, details = {} } = activity;

    switch (actionType) {
      case 'DOCUMENT_UPLOADED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">By:</span> <span className="font-medium text-slate-900">{renderValue(details?.uploadedBy, 'N/A')}</span></p>
                  <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Workflow:</span> <span className="font-medium text-slate-900">{renderValue(details?.workflow, 'N/A')}</span></p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full">
                  <IconFileText size={18} className="text-cyan-600 shrink-0"/>
                  <span className="text-sm font-medium text-slate-900 truncate" title={details?.name}>{renderValue(details?.name, 'Unknown Document')}</span>
                </div>
              </div>
              {details?.name && details?.path && (
                <div className="shrink-0">
                  <button onClick={() => handleView(details?.name, details?.path, details?.documentId, details?.type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors shadow-sm">
                    <IconEye size={16}/> View File
                  </button>
                </div>
              )}
            </div>
            {renderDocumentProperties(details)}
          </div>
        );

      case 'PROCESS_INITIATED':
        return (
          <div className="mt-3 space-y-2 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
               <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Initiator:</span> <span className="font-medium text-slate-900">{renderValue(details.initiatorName, 'N/A')}</span></p>
               <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Process:</span> <span className="font-medium text-slate-900">{renderValue(details.processName, 'N/A')}</span></p>
            </div>
            {details?.description && (
               <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 break-words leading-relaxed">
                 {details.description}
               </div>
            )}
          </div>
        );

      case 'DOCUMENT_SIGNED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div className="space-y-2 min-w-0 flex-1">
                 <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Signed By:</span> <span className="font-medium text-slate-900">{renderValue(details.signedBy, 'N/A')}</span></p>
                 {details.remarks && (
                   <p className="text-sm text-slate-700 break-words bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                     <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-0.5">Remarks</span> 
                     {details.remarks}
                   </p>
                 )}
                 <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full mt-1">
                    <IconFileText size={18} className="text-emerald-600 shrink-0"/>
                    <span className="text-sm font-medium text-slate-900 truncate" title={details.name}>{renderValue(details.name, 'Unknown Document')}</span>
                 </div>
               </div>
               {details.name && details.path && (
                 <div className="shrink-0">
                   <button onClick={() => handleView(details.name, details.path, details.id, details.type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors shadow-sm">
                     <IconEye size={16}/> View File
                   </button>
                 </div>
               )}
            </div>
            {renderDocumentProperties(details)}
          </div>
        );

      case 'DOCUMENT_REJECTED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div className="space-y-3 min-w-0 flex-1">
                 <p className="text-sm text-slate-600 truncate"><span className="text-slate-400 mr-1">Rejected By:</span> <span className="font-medium text-slate-900">{renderValue(details.rejectedBy, 'N/A')}</span></p>
                 <div className="text-sm text-rose-900 bg-rose-50/50 p-3 rounded-lg border border-rose-200 break-words">
                   <span className="text-[10px] uppercase tracking-widest text-rose-500 font-bold block mb-1">Reason for Rejection</span> 
                   {renderValue(details.rejectionReason, 'No reason provided')}
                 </div>
                 <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full">
                    <IconFileText size={18} className="text-rose-600 shrink-0"/>
                    <span className="text-sm font-medium text-slate-900 truncate" title={details.name}>{renderValue(details.name, 'Unknown Document')}</span>
                 </div>
               </div>
               {details.name && details.path && (
                 <div className="shrink-0">
                   <button onClick={() => handleView(details.name, details.path, details.id, details.type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors shadow-sm">
                     <IconEye size={16}/> View File
                   </button>
                 </div>
               )}
            </div>
            {renderDocumentProperties(details)}
          </div>
        );

      case 'QUERY_RAISED':
        return (
          <div className="mt-3 space-y-3 min-w-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span></p>
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Initiator:</span> <span className="font-medium text-slate-900">{renderValue(details.initiatorName, 'N/A')}</span></p>
             </div>
             <div className="bg-amber-50/50 p-3.5 rounded-lg border border-amber-200/60 break-words">
                <span className="text-[10px] uppercase tracking-widest text-amber-600 font-bold mb-1 block">Query</span>
                <p className="text-sm text-slate-800 leading-relaxed">{renderValue(details.queryText, 'No query text provided')}</p>
             </div>
             {details.documentChanges && details.documentChanges.length > 0 && (
               <div className="mt-4 pt-3 border-t border-slate-100">
                 <strong className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                    <IconFileText size={14}/> Document Changes
                 </strong>
                 <div className="space-y-2">
                   {details.documentChanges.map((doc, i) => (
                     <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg p-2.5 text-sm min-w-0 shadow-sm">
                       <div className="flex-1 min-w-0">
                         <span className="font-medium text-slate-900 truncate block" title={doc.document?.name}>{renderValue(doc.document?.name, 'N/A')}</span>
                         {doc.replacedDocument && (
                            <span className="text-xs text-slate-500 truncate block mt-0.5" title={doc.replacedDocument.name}>
                              <span className="font-medium mr-1 text-slate-400">Replaced:</span>{doc.replacedDocument.name}
                            </span>
                         )}
                       </div>
                       {doc.document?.name && doc.document?.path && (
                         <button onClick={() => handleView(doc.document.name, doc.document.path, doc.document.id, doc.document.type)} className="shrink-0 text-indigo-600 hover:text-indigo-700 font-medium text-xs px-2.5 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                           View Target
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </div>
        );

      case 'QUERY_RESOLVED':
        return (
          <div className="mt-3 space-y-3 min-w-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span></p>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
               <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 break-words">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Original Query</span>
                  <p className="text-sm text-slate-800">{renderValue(details.queryText, 'No query text provided')}</p>
               </div>
               <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200/60 break-words">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold mb-1 block">Resolution Answer</span>
                  <p className="text-sm text-slate-800">{renderValue(details.answerText, 'No answer provided')}</p>
               </div>
             </div>
          </div>
        );

      case 'RECOMMENDATION_REQUESTED':
      case 'RECOMMENDATION_PROVIDED':
        const isRequest = actionType === 'RECOMMENDATION_REQUESTED';
        return (
          <div className="mt-3 space-y-3 min-w-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
               <p className="text-slate-600 truncate"><span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span></p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
               <div className={`${isRequest ? 'bg-violet-50/50 border-violet-200/60' : 'bg-slate-50 border-slate-200'} p-3.5 rounded-lg border break-words`}>
                  <span className={`text-[10px] uppercase tracking-widest ${isRequest ? 'text-violet-600' : 'text-slate-500'} font-bold mb-1 block`}>Recommendation Request</span>
                  <p className="text-sm text-slate-800">{renderValue(details.recommendationText, 'No request text provided')}</p>
               </div>
               {!isRequest && (
                 <div className="bg-violet-50/50 p-3.5 rounded-lg border border-violet-200/60 break-words">
                    <span className="text-[10px] uppercase tracking-widest text-violet-600 font-bold mb-1 block">Provided Response</span>
                    <p className="text-sm text-slate-800">{renderValue(details.responseText, 'No response provided')}</p>
                 </div>
               )}
             </div>
             {details.documentDetails && details.documentDetails.length > 0 && (
               <div className="mt-4 pt-3 border-t border-slate-100">
                 <strong className="text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                    <IconFileText size={14}/> Related Documents
                 </strong>
                 <div className="space-y-2">
                   {details.documentDetails.map((doc, i) => (
                     <div key={i} className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm min-w-0">
                       <span className="text-sm font-medium text-slate-800 truncate flex-1" title={doc.documentName}>{doc.documentName}</span>
                       {doc.documentPath && (
                         <button onClick={() => handleView(doc.documentName, doc.documentPath, doc.documentId, doc.documentType)} className="shrink-0 text-indigo-600 hover:text-indigo-700 font-medium text-xs px-2.5 py-1.5 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                           View
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </div>
        );

      case 'STEP_COMPLETED':
        return (
          <div className="mt-3 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <p className="text-sm text-slate-600 truncate flex-1">
                 <span className="text-slate-400 mr-1">Step:</span> <span className="font-medium text-slate-900">{renderValue(details.stepName, 'N/A')}</span>
              </p>
              <div className="shrink-0">
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                   {renderValue(details.status, 'UNKNOWN')}
                 </span>
              </div>
            </div>
            {details?.decisionComment && (
              <div className="mt-2">
                 <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Decision Comment</p>
                 <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 break-words leading-relaxed">{details.decisionComment}</p>
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-slate-400 italic text-sm mt-3">No additional payload data available.</p>;
    }
  };

  const exportDivToPDF = () => {
    setActionsLoading(true);
    const element = document.getElementById('reportDiv');
    const opt = {
      margin: 0.5, filename: `${id}_timeline.pdf`, image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().from(element).set(opt).save();
    setActionsLoading(false);
  };

  function extractDocumentsByReopenCycle(processData) {
    const { documentVersioning } = processData;
    const allReopenCycles = new Set();
    const lineageMap = new Map();
    const newDocuments = [];

    documentVersioning.forEach((group) => {
      const versions = [...group.versions].sort((a, b) => a.reopenCycle - b.reopenCycle);
      versions.forEach((v) => allReopenCycles.add(v.reopenCycle));
      const hasOriginal = versions.some((v) => v.reopenCycle === 0);

      if (hasOriginal) lineageMap.set(group.latestDocumentId, versions);
      else newDocuments.push(versions[0]);
    });

    const reopenCycles = [...allReopenCycles].sort((a, b) => a - b);

    return reopenCycles.map((cycle) => {
      const documents = [];
      lineageMap.forEach((versions) => {
        let selected = null;
        for (let i = versions.length - 1; i >= 0; i--) {
          if (versions[i].reopenCycle <= cycle) {
            selected = versions[i];
            break;
          }
        }
        if (selected) documents.push(selected);
      });

      newDocuments.forEach((doc) => {
        if (doc.reopenCycle <= cycle) documents.push(doc);
      });

      const sopMatch = documents.find((d) => d.reopenCycle === cycle && d.SOPIssueNo);
      return { reopenCycle: cycle, SOPIssueNo: sopMatch?.SOPIssueNo || documents[0]?.SOPIssueNo || '--', documents };
    });
  }

  const DocumentsCycle = (process) => {
    const cycles = extractDocumentsByReopenCycle(process);

    return (
      <div className="mt-10">
        <h2 className="text-base font-bold text-slate-900 mb-5 tracking-tight border-b border-slate-200 pb-3 flex items-center gap-2">
          <IconGitCommit size={20} className="text-slate-400"/> Document Version Cycles
        </h2>
        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {cycles.map((cycle, index) => {
            const isLast = index === cycles.length - 1;
            return (
              <div key={cycle.reopenCycle} className={`rounded-xl border transition-all ${isLast ? 'bg-indigo-50/20 border-indigo-200/60 shadow-sm' : 'bg-white border-slate-200'}`}>
                <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-4 rounded-t-xl ${isLast ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Cycle</span>
                    <span className="font-bold text-sm text-indigo-700 bg-white border border-indigo-100 shadow-sm px-2.5 py-0.5 rounded leading-none">{renderValue(cycle.reopenCycle, '0')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Process SOP No</span>
                    <span className="font-semibold text-slate-800 text-sm bg-white border border-slate-200 shadow-sm px-2.5 py-0.5 rounded leading-none">{renderValue(cycle.SOPIssueNo)}</span>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {cycle.documents.length > 0 ? (
                    cycle.documents.map((doc, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 hover:shadow-sm transition-all group min-w-0">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg shrink-0 group-hover:bg-white transition-colors">
                            <img width={20} src={ImageConfig[doc.type] || ImageConfig['default']} alt={doc.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${doc.active ? 'font-semibold text-slate-900' : 'text-slate-500'}`} title={doc.name}>{renderValue(doc.name, 'Unknown Document')}</p>
                            <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 flex-wrap">
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium"><IconHash size={12} className="text-slate-400"/> Issue: <span className="text-slate-700">{renderValue(doc?.issueNo)}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleView(doc.name, doc.path, doc.id, doc.type)} disabled={actionsLoading} title="View Document" className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all">
                            <IconEye size={18} />
                          </button>
                          <button onClick={() => openDocDetails(doc)} disabled={actionsLoading} title="Document Details" className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all">
                            <IconAlignBoxCenterMiddle size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-sm text-slate-500">No documents uploaded for this cycle</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="max-w-[90rem] mx-auto space-y-8 mt-6 px-4 sm:px-6 lg:px-8 bg-slate-50/30 min-h-screen pb-12">
        {/* Header / Process Overview Card */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Process Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1.5">Manage and track the entire lifecycle of this workflow instance.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <CustomButton variant="outline" text={<div className="flex items-center gap-2 font-medium"><IconArrowLeft size={16} /> Back</div>} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm" click={handleBack} disabled={actionsLoading} />
                <CustomButton variant="primary" text={<span className="font-semibold px-2">Re-Open Process</span>} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white border-transparent" click={() => setOpenModal('re-open')} disabled={actionsLoading || !reOpen} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {logDetails?.map((detail, index) => (
                <div key={index} className="p-5 border border-slate-200 bg-slate-50/50 rounded-xl flex flex-col justify-center min-w-0 items-start">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{detail.label}</p>
                  <div className="text-lg font-semibold text-slate-900 truncate w-full">{detail.value}</div>
                </div>
              ))}
            </div>

            {process?.documentVersioning && DocumentsCycle(process)}
          </div>
        </div>
        
        {/* Visual Workflow Accordion */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl transition-all duration-300 ease-in-out">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <button onClick={() => setExpanded((prev) => !prev)} className="flex-1 flex items-center justify-between text-left group focus:outline-none">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Workflow Visual Map & Settings</h2>
                  <p className="text-sm text-slate-500 mt-1">View steps architecture or modify operational rules configs.</p>
                </div>
              </button>

              {/* INTEGRATED TABS SELECTOR */}
              <div className="flex items-center gap-4 shrink-0">
                <div style={{ background: C.surfaceHover, border: `1px solid ${C.border}` }} className="flex p-1.5 rounded-xl gap-1 shadow-inner">
                  {[
                    { id: 'visual', icon: <IconSitemap size={16} />, label: 'Flow Map' },
                    { id: 'config', icon: <IconListDetails size={16} />, label: 'Settings' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setExpanded(true); }}
                      style={activeTab === tab.id ? { background: C.accent, color: '#fff', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' } : { color: C.textSecondary }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all hover:text-slate-900">
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => setExpanded((prev) => !prev)} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 shrink-0">
                  {expanded ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
                </button>
              </div>
            </div>

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expanded ? 'max-h-[800px] opacity-100 mt-8' : 'max-h-0 opacity-0'}`}>
              <div className="border border-slate-200 rounded-2xl overflow-hidden h-[550px] flex flex-col" style={{ background: C.bg }}>
                {activeTab === 'visual' ? (
                  <div className="flex-1 relative w-full h-full">
                    {expanded && <FlowCanvas steps={workflowSteps} onNodeClick={handleNodeClick} />}
                    
                    {/* Floating Map Legend */}
                    <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', zIndex: 10 }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: C.textMuted }}>Node Legend</p>
                      {Object.entries(STEP_TYPE_CONFIG).filter(([k]) => k !== 'DEFAULT').map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2.5 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: val.color }} />
                          <span className="text-xs font-bold" style={{ color: C.textSecondary }}>{val.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex overflow-hidden w-full h-full">
                    {/* CHECKLIST SIDEBAR STEP NAVIGATION */}
                    <aside style={{ background: C.surface, borderRight: `1px solid ${C.border}`, width: sidebarOpen ? 280 : 64 }} className="flex-shrink-0 flex flex-col overflow-hidden transition-all duration-300 relative h-full">
                      <div style={{ borderBottom: `1px solid ${C.border}` }} className="flex items-center justify-between px-4 py-3 bg-black/[0.02]">
                        {sidebarOpen && <p className="text-xs font-black uppercase tracking-widest" style={{ color: C.textSecondary }}>Steps Path</p>}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ color: C.textMuted, background: C.surface, border: `1px solid ${C.border}` }} className="hover:text-slate-900 p-1 rounded-md shadow-sm ml-auto">
                          {sidebarOpen ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                        {workflowSteps.map((s, idx) => {
                          const cfg = getStepType(s);
                          const isActive = selectedStepIdx === idx;
                          return (
                            <button key={idx} onClick={() => setSelectedStepIdx(idx)} style={{ background: isActive ? `${cfg.color}10` : C.surface, borderColor: isActive ? `${cfg.color}40` : C.border }} className={`w-full px-3 py-2.5 text-left border rounded-xl flex items-center gap-3 relative overflow-hidden transition-all group ${isActive ? 'shadow-sm' : 'hover:bg-black/[0.01]'}`}>
                              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cfg.color }} />}
                              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0" style={{ background: isActive ? cfg.color : C.surfaceHover, color: isActive ? '#fff' : C.textMuted, border: `1px solid ${isActive ? 'transparent' : C.border}` }}>
                                {idx + 1}
                              </span>
                              {sidebarOpen && (
                                <div className="truncate min-w-0 flex-1">
                                  <p className={`text-xs font-bold truncate transition-colors ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{s.stepName}</p>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </aside>

                    {/* SETTINGS DETAILS MAIN TARGET WORKSPACE */}
                    <section className="flex-1 overflow-y-auto p-6 relative h-full custom-scrollbar" style={{ background: C.bg }}>
                       <StepDetailPanel step={workflowSteps[selectedStepIdx] ? { ...workflowSteps[selectedStepIdx], stepNumber: selectedStepIdx + 1 } : null} />
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* The Timeline Track */}
        <div id="reportDiv" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 lg:p-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Activity Timeline</h2>
              <p className="text-sm text-slate-500 mt-1.5">A strict chronological audit log of all process events.</p>
            </div>
            {print ? <CustomButton disabled={actionsLoading} variant="outline" text={<span className="flex items-center gap-2 font-medium px-2"><IconFileArrowRight size={18}/> Export Report</span>} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm shrink-0" click={exportDivToPDF} title="Export Timeline to PDF" /> : null}
          </div>

          <TimelineLegend />

          <div className="relative mt-10">
            <div className="absolute top-0 bottom-0 left-[23px] sm:left-[160px] w-px bg-slate-200 hidden xs:block"></div>
            <div className="space-y-10">
              {activities.map((activity, idx) => {
                const IconComp = iconMap[activity.actionType] || <IconClock size={18} className="text-slate-400" />;
                const dateObj = new Date(activity.createdAt);
                const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={idx} className="relative flex flex-col sm:flex-row items-start group">
                    <div className="sm:w-[130px] shrink-0 sm:text-right sm:pr-8 sm:pt-2.5 mb-3 sm:mb-0 hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">{dateStr}</div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">{timeStr}</div>
                    </div>
                    <div className="absolute left-0 sm:left-[140px] top-0 sm:top-1.5 flex items-center justify-center w-12 h-12 rounded-full border border-slate-200 bg-white shadow-sm text-slate-600 z-10 transition-transform group-hover:scale-110 group-hover:border-slate-300 group-hover:shadow hidden xs:flex">
                      {IconComp}
                    </div>
                    <div className="flex-1 min-w-0 xs:pl-16 sm:pl-12 w-full">
                      <div className="sm:hidden mb-2 flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-slate-50 text-slate-600 shrink-0">{IconComp}</div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 mr-2">{dateStr}</span>
                          <span className="text-xs font-medium text-slate-500">{timeStr}</span>
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 hover:border-slate-300 hover:shadow-md transition-all">
                        <h3 className="text-base font-bold text-slate-900 leading-snug break-words">{renderValue(activity.description, 'Unknown Action')}</h3>
                        <div className="mt-2">{renderDetails(activity)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ReOpen Modal */}
      <CustomModal isOpen={openModal === 're-open'} onClose={() => setOpenModal('')} className="max-h-[95vh] overflow-y-auto max-w-lg w-full rounded-2xl p-0">
        <div className="p-6">
          <ReOpenProcessModal workflowId={process?.workflow?.id} processId={process.processId} storagePath={process.processStoragePath} close={() => setOpenModal('')} documents={process.documents} />
        </div>
      </CustomModal>

      {/* View File Modal */}
      {fileView && <ViewFile docu={fileView} setFileView={setFileView} handleViewClose={() => setFileView(null)} />}

      {/* Corporate Document Details Modal */}
      <CustomModal isOpen={!!documentModalOpen} onClose={() => setDocumentModalOpen(null)} className="max-h-[90vh] overflow-y-auto w-full max-w-lg md:max-w-3xl p-0 bg-white rounded-2xl shadow-2xl border border-slate-200">
        {documentModalOpen && (
          <div className="flex flex-col h-full">
            <div className="bg-slate-50 px-6 py-5 flex items-start justify-between border-b border-slate-200 sticky top-0 z-10">
              <div className="flex items-center gap-4 min-w-0 pr-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0">
                  <img width={24} src={ImageConfig[documentModalOpen.type] || ImageConfig['default']} alt={documentModalOpen.type} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">{renderValue(documentModalOpen.name, 'Untitled Document')}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500 font-medium">
                    <span className="uppercase text-[10px] tracking-widest font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">{renderValue(documentModalOpen.type, 'N/A')}</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><IconDatabase size={14} className="text-slate-400"/> {formatBytes(documentModalOpen.size)}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDocumentModalOpen(null)} className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors shrink-0">
                <IconX size={20} stroke={2} />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap gap-2">
              {documentModalOpen.preApproved ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60"><IconCheck size={14}/> Pre-Approved</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">Not Pre-Approved</span>
              )}
              {documentModalOpen.isReplacement && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">Replacement Doc</span>}
              {documentModalOpen.superseding && <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60">Superseding Doc</span>}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-white">
              <div className="space-y-5 min-w-0">
                <h4 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-slate-100 pb-2"><IconFileText size={14}/> General Information</h4>
                <div className="space-y-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Created By</p>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2 truncate"><IconUser size={16} className="text-slate-400 shrink-0"/> {renderValue(documentModalOpen.createdBy, '--')}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Created On</p>
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2 truncate"><IconCalendarEvent size={16} className="text-slate-400 shrink-0"/> {documentModalOpen.createdOn ? new Date(documentModalOpen.createdOn).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Storage Path</p>
                    <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200"><IconFolderOpen size={16} className="text-slate-400 shrink-0 mt-0.5"/> <p className="text-xs font-mono text-slate-700 break-all leading-relaxed">{renderValue(documentModalOpen.path, '--')}</p></div>
                  </div>
                </div>
              </div>

              <div className="space-y-5 min-w-0">
                <h4 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-slate-100 pb-2"><IconLayoutList size={14}/> Process Linkage</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Doc Issue No</p><p className="text-sm font-medium text-slate-900 flex items-center gap-1.5 truncate"><IconHash size={14} className="text-slate-400 shrink-0"/> {renderValue(documentModalOpen.issueNo, '--')}</p></div>
                    <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Process SOP No</p><p className="text-sm font-medium text-slate-900 flex items-center gap-1.5 truncate"><IconHash size={14} className="text-slate-400 shrink-0"/> {renderValue(documentModalOpen.SOPIssueNo, '--')}</p></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Workflow / Process</p>
                    <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200 break-words leading-relaxed">{renderValue(documentModalOpen.workflowName, '--')} <span className="text-slate-300 mx-1">/</span> {renderValue(documentModalOpen.processName, '--')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Reopen Cycle</p><p className="text-sm font-bold text-slate-900">{renderValue(documentModalOpen.reopenCycle, '0')}</p></div>
                    <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Part Number</p><p className="text-sm font-medium text-slate-900 truncate">{renderValue(documentModalOpen.partNumber, '--')}</p></div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
                {documentModalOpen.description && (
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1 flex items-center gap-1.5"><IconNotes size={14}/> Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 break-words shadow-sm">{documentModalOpen.description}</p>
                  </div>
                )}
                {documentModalOpen.reasonOfSupersed && (
                  <div className="min-w-0 mt-2">
                    <p className="text-[10px] uppercase tracking-widest text-rose-500 font-bold mb-1 flex items-center gap-1.5"><IconNotes size={14}/> Reason of Supersed</p>
                    <p className="text-sm text-rose-800 leading-relaxed bg-rose-50/50 p-4 rounded-xl border border-rose-200 break-words shadow-sm">{documentModalOpen.reasonOfSupersed}</p>
                  </div>
                )}
                {documentModalOpen.tags && documentModalOpen.tags.length > 0 && (
                  <div className="min-w-0 mt-2">
                     <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Associated Tags</p>
                     <div className="flex flex-wrap gap-2">
                       {documentModalOpen.tags.map((tag, i) => (
                         <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700"><IconTag size={12} className="mr-1.5 text-slate-400"/> {tag}</span>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200 rounded-b-2xl">
              <CustomButton variant="outline" text="Close Window" className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium px-6 py-2 shadow-sm rounded-lg transition-colors" click={() => setDocumentModalOpen(null)} />
            </div>
          </div>
        )}
      </CustomModal>
    </>
  );
};

export default Timeline;