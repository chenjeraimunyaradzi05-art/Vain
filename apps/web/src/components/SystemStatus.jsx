'use client';

/**
 * System Status Widget
 * Displays real-time health status of backend services
 */

import { useState, useEffect } from 'react';
import api from '@/lib/apiClient';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Server,
  Cpu,
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';

const STATUS_COLORS = {
  healthy: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  degraded: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  unhealthy: 'text-red-400 bg-red-400/10 border-red-400/20',
  unknown: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const STATUS_ICONS = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  unhealthy: XCircle,
  unknown: Clock,
};

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status] || STATUS_ICONS.unknown;
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ServiceCard({ name, icon: Icon, status, latency, details }) {
  const isHealthy = status === 'healthy';
  const borderColor = isHealthy ? 'border-emerald-500/30' : 
    status === 'degraded' ? 'border-amber-500/30' : 'border-red-500/30';
  
  return (
    <div className={`bg-slate-800/50 border ${borderColor} rounded-xl p-4 hover:bg-slate-800/70 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isHealthy ? 'bg-emerald-500/10' : 'bg-slate-700/50'}`}>
            <Icon className={`w-5 h-5 ${isHealthy ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div>
            <h4 className="font-medium text-sm">{name}</h4>
            {latency !== undefined && (
              <p className="text-xs text-slate-500">{latency}ms latency</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      
      {details && (
        <p className="text-xs text-slate-400 mt-2">{details}</p>
      )}
    </div>
  );
}

export default function SystemStatus({ compact = false }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  async function fetchHealth() {
    try {
      const { ok, data } = await api('/health');
      
      if (ok) {
        setHealth(data);
        setError(null);
        setIsOnline(true);
        setLastUpdated(new Date());
      } else {
        setError('Health check failed');
        setIsOnline(false);
      }
    } catch (err) {
      setError('Unable to connect to API');
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          <span className="text-slate-400">Checking system status...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm text-slate-400">
            {isOnline ? 'All systems operational' : 'Connection issues'}
          </span>
        </div>
        <button
          onClick={fetchHealth}
          className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    );
  }

  const overallStatus = health?.status || (error ? 'unhealthy' : 'unknown');
  const checks = health?.checks || {};

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">System Status</h3>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={overallStatus} />
          <button
            onClick={fetchHealth}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ServiceCard
          name="Database"
          icon={Database}
          status={checks.database?.status || 'unknown'}
          latency={checks.database?.latency}
          details={checks.database?.type ? `PostgreSQL` : undefined}
        />
        
        <ServiceCard
          name="Cache (Redis)"
          icon={HardDrive}
          status={checks.redis?.status || 'unknown'}
          latency={checks.redis?.latency}
          details={checks.redis?.message}
        />
        
        <ServiceCard
          name="Memory"
          icon={Cpu}
          status={checks.memory?.status || 'healthy'}
          details={checks.memory?.heapUsed ? `${checks.memory.heapUsed} / ${checks.memory.heapTotal}` : undefined}
        />
      </div>

      {/* Config Status */}
      {checks.config?.components && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Service Configuration</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(checks.config.components).map(([key, configured]) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  configured 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-700/50 text-slate-500 border border-slate-600/50'
                }`}
              >
                {configured ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
        <span>
          {health?.environment && `Environment: ${health.environment}`}
          {health?.version && ` • v${health.version}`}
        </span>
        {lastUpdated && (
          <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
