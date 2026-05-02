import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Shield, Users, Globe, Trash2, AlertCircle, Loader2, MessageSquare, BarChart3 } from 'lucide-react';

interface AdminPanelProps {
  onViewServer: (serverId: string) => void;
}

export function AdminPanel({ onViewServer }: AdminPanelProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, servers: 0, messages: 0, alerts: 0 });
  const [recentServers, setRecentServers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        // In a real app, these would be cloud functions for performance
        const usersSnap = await getDocs(collection(db, 'users'));
        const serversSnap = await getDocs(collection(db, 'servers'));
        const alertsSnap = await getDocs(query(collection(db, 'profanity_alerts'), orderBy('createdAt', 'desc'), limit(10)));

        setStats({
          users: usersSnap.size,
          servers: serversSnap.size,
          messages: 0, // Fetching all messages is too heavy for client-side admin
          alerts: alertsSnap.size
        });

        setAlerts(alertsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        const servers = serversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentServers(servers);
      } catch (error) {
        console.error('Admin fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleDeleteServer = async (serverId: string) => {
    if (!window.confirm('Are you sure you want to delete this server? This cannot be undone.')) return;
    
    setDeletingId(serverId);
    try {
      await deleteDoc(doc(db, 'servers', serverId));
      setRecentServers(prev => prev.filter(s => s.id !== serverId));
      setStats(prev => ({ ...prev, servers: prev.servers - 1 }));
    } catch (error) {
      alert('Failed to delete server');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto p-6 md:p-12 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
              <Shield size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Admin Terminal</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">Restricted access for system administrators only.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Total Servers', value: stats.servers, icon: Globe, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
            { label: 'Profanity Alerts', value: stats.alerts, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
            { label: 'System Status', value: 'Healthy', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 ${stat.bg} rounded-2xl ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Profanity Alerts */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" /> Profanity Trigger Alerts
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Context</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Original Text</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Triggered Words</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {alerts.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{a.userName}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-500 font-medium">{a.context}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 dark:text-slate-400 italic line-clamp-1">"{a.originalText}"</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {a.triggeredWords?.map((w: string, idx: number) => (
                            <span key={idx} className="text-[9px] font-black uppercase bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                              {w}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {alerts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic text-sm">
                        No profanity triggers detected yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Server Management */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe size={20} className="text-indigo-600" /> Active Servers
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Server Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Invite Code</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {recentServers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{s.description || 'No description'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                          {s.inviteCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewServer(s.id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                            title="View Server"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteServer(s.id)}
                            disabled={deletingId === s.id}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-50"
                            title="Delete Server"
                          >
                            {deletingId === s.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {recentServers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 dark:text-slate-600 italic text-sm">
                        No servers found in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Security Notice */}
        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-3xl flex gap-4">
          <AlertCircle className="text-amber-600 shrink-0" size={24} />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Security Invariant</h4>
            <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-1 leading-relaxed">
              This panel is dynamically injected based on verified identity. Any attempt to access system collections 
              without administrative authorization is logged and rejected by Firestore security rules.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
