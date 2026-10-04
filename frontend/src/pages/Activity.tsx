import { useState, useEffect } from 'react';
import {
  Activity as ActivityIcon,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Cpu,
  Sparkles,
  Award,
  Calendar,
  Layers,
  Database
} from 'lucide-react';
import { api } from '../api/client';
import type { AgentActivityTrace } from '../api/client';

export default function Activity() {
  const [traces, setTraces] = useState<AgentActivityTrace[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTraces();
      setTraces(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load agent traces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, []);

  const getAgentIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
      case 'fahmly':
        return <Database className="h-4 w-4 text-blue-600" />;
      case 'intake agent':
        return <Cpu className="h-4 w-4 text-indigo-600" />;
      case 'planner agent':
        return <Calendar className="h-4 w-4 text-emerald-600" />;
      case 'concept coach':
        return <Sparkles className="h-4 w-4 text-amber-600" />;
      case 'draft reviewer':
        return <Award className="h-4 w-4 text-purple-600" />;
      case 'exam prep agent':
        return <Layers className="h-4 w-4 text-rose-600" />;
      default:
        return <ActivityIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const filtered = traces.filter((t) => {
    if (agentFilter !== 'all' && t.agent.toLowerCase() !== agentFilter.toLowerCase()) return false;
    if (statusFilter !== 'all' && t.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Transparent Supervised Agency
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Agent Activity Trace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Audit every automated and supervised action performed by Fahmly, Intake, Planner, Coach, and Reviewer.
          </p>
        </div>

        <button
          onClick={fetchTraces}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          Refresh Stream
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-xs font-semibold text-gray-500 mr-1">Agent:</span>
          {['all', 'fahmly', 'intake agent', 'planner agent', 'concept coach', 'draft reviewer', 'exam prep agent'].map((agent) => (
            <button
              key={agent}
              onClick={() => setAgentFilter(agent)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                agentFilter === agent
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {agent === 'all' ? 'All Agents' : agent}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-gray-500">Status:</span>
          {['all', 'success', 'blocked'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Trace Timeline List */}
      {loading && traces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-3" />
          <p className="text-gray-500 font-medium text-sm">Fetching agent traces...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <ActivityIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-base font-semibold text-gray-900">No traces match your filter</h3>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
          {filtered.map((trace) => (
            <div key={trace.id} className="p-4 hover:bg-gray-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 flex-shrink-0 mt-0.5">
                  {getAgentIcon(trace.agent)}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-900">{trace.agent}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                      {trace.action}
                    </span>
                    {trace.status === 'blocked' ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        <XCircle className="h-3 w-3 mr-1" />
                        Guardrail Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Success
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-normal">{trace.summary}</p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-xs text-gray-400 flex-shrink-0 pl-11 sm:pl-0">
                {trace.timestamp && (
                  <span className="font-mono text-[11px] text-gray-500">
                    {new Date(trace.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                {trace.duration_ms !== null && (
                  <span className="text-[10px] font-semibold text-gray-400 mt-0.5">
                    {trace.duration_ms}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
