import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { IconArrowLeft, IconClock, IconUser, IconShieldLock, IconMessageCircle } from '@tabler/icons-react';
import { toast } from 'react-toastify';
import { getPhysicalRequestMessages } from '../../common/Apis';
import TopLoader from '../../common/Loader/TopLoader';
import moment from 'moment';

export default function PhysicalDemandHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // If we navigated from the dashboard, we might have passed the basic request details via state
  const requestDetails = location.state?.request || null;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await getPhysicalRequestMessages(id);
        setMessages(response.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to retrieve secure audit log.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [id]);

  if (loading) return <TopLoader />;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
              <IconArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">AUDIT TIMELINE</h1>
                <span className="px-2 py-0.5 text-[10px] font-black tracking-widest bg-red-100 text-red-700 border border-red-200 rounded uppercase">Restricted</span>
              </div>
              <p className="text-sm font-medium text-slate-500 font-mono mt-1">Request Ref: #{id}</p>
            </div>
          </div>
        </div>

        {/* CONTEXT PANEL (If navigated from table) */}
        {requestDetails && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Target Document Context</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document</p>
                <p className="font-bold text-slate-900 text-sm mt-1">{requestDetails.documentName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</p>
                <p className="font-medium text-slate-700 text-sm mt-1">{requestDetails.departmentName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested By</p>
                <p className="font-medium text-slate-700 text-sm mt-1">{requestDetails.requestedBy}</p>
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-8 flex items-center gap-2">
            <IconShieldLock size={18} className="text-indigo-600" /> System Action Log
          </h3>

          {messages.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-10">No secure log entries found for this request.</p>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-4 space-y-10">
              {messages.map((msg, idx) => (
                <div key={idx} className="relative pl-8">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-white border-4 border-indigo-500 shadow-sm" />
                  
                  {/* Content */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
                    
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                          <IconUser size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{msg.user.username}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {msg.changerRole === 'ADMIN' ? 'AUTHORIZED ADMIN' : (msg.changerRole || 'USER')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-mono font-medium">
                        <IconClock size={14} />
                        {moment(msg.createdAt).format('DD MMM YYYY, HH:mm:ss')}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 mb-4">
                      <IconMessageCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {msg.message || "No comment provided."}
                      </p>
                    </div>

                    {msg.previousStatus && msg.newStatus && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 inline-flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">State Change</span>
                        <div className="flex items-center gap-2 text-xs font-mono font-bold">
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{msg.previousStatus}</span>
                          <IconArrowLeft size={14} className="text-slate-300 rotate-180" />
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{msg.newStatus}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}