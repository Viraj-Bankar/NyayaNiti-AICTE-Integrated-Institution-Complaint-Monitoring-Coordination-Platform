import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLogItem } from '../types';
import { ShieldCheck, Search, Filter, History, Lock } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, [eventTypeFilter, entityFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs({
        event_type: eventTypeFilter,
        entity_type: entityFilter
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-[#092D62] px-2 py-0.5 rounded">
                SECTION 28 ACCOUNTABILITY
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">Read-Only Immutable Log</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#061E46] mt-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#092D62]" />
              <span>Council Audit Trail & Accountability Register</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Append-only audit trail logging user authentication, case updates, status transitions, priority overrides, and coordination decisions.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded border border-slate-300">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Tamper-Resistant Security Log</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Event Type:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="p-1.5 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">All Events</option>
              <option value="LOGIN">User Logins</option>
              <option value="CASE_CREATE">Case Registrations</option>
              <option value="CASE_UPDATE">Case Updates</option>
              <option value="STATUS_CHANGE">Status Changes</option>
              <option value="PRIORITY_OVERRIDE">Priority Overrides</option>
              <option value="OVERLAP_REVIEW_DECISION">Overlap Decisions</option>
              <option value="ACTION_CONFLICT_DECISION">Conflict Decisions</option>
              <option value="COORDINATION_INITIATED">Coordination Initiated</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Target Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="p-1.5 border border-slate-300 rounded bg-white text-xs"
            >
              <option value="">All Entities</option>
              <option value="Case">Case</option>
              <option value="OverlapAlert">Overlap Alert</option>
              <option value="ActionConflictAlert">Action Conflict Alert</option>
              <option value="CoordinationWorkspace">Coordination Workspace</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-[#092D62] text-white">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor & Role</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Previous / New State</th>
                  <th className="py-2.5 px-3">Official Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Loading audit records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No audit events recorded for selected criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <strong className="text-[#092D62] block">{log.actor_name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">{log.actor_role}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="bg-blue-50 text-blue-900 border border-blue-200 font-bold px-2 py-0.5 rounded text-[10px]">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{log.entity_type}</span>
                        <span className="text-[10px] font-mono text-slate-500 block">ID: {log.entity_id}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] max-w-[200px]">
                        {log.previous_value && <span className="text-red-700 line-through mr-1.5">{log.previous_value}</span>}
                        {log.new_value && <span className="text-emerald-700 font-bold">{log.new_value}</span>}
                        {!log.previous_value && !log.new_value && <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 text-[11px] truncate max-w-xs">
                        {log.remarks || 'Standard action logged'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
