import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Hash, Info, Plus, Loader2, Globe } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

interface CreateServerModalProps {
  onClose: () => void;
  onCreated: (serverId: string) => void;
}

export function CreateServerModal({ onClose, onCreated }: CreateServerModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be logged in to create a server');

      // 1. Create the server document
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const serverRef = await addDoc(collection(db, 'servers'), {
        name: name.trim(),
        description: description.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        inviteCode,
        iconUrl: null
      });

      // 2. Add creator as the first member
      await setDoc(doc(db, `servers/${serverRef.id}/members`, user.uid), {
        userId: user.uid,
        displayName: user.displayName || 'Creator',
        username: user.email?.split('@')[0] || 'creator',
        photoURL: user.photoURL,
        joinedAt: serverTimestamp(),
        role: 'owner'
      });

      onCreated(serverRef.id);
      onClose();
    } catch (err: any) {
      console.error('Error creating server:', err);
      setError(err.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border dark:border-slate-800"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
                <Plus size={20} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Server</h2>
            </div>
            <motion.button
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </motion.button>
          </div>

          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Create a space for your friends or community. You'll be the owner of this server.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateServer} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Server Name</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  placeholder="e.g. Study Group, Gaming Clan"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Description (Optional)</label>
              <div className="relative">
                <Info className="absolute left-4 top-4 text-slate-400 dark:text-slate-600" size={16} />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium resize-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                  rows={3}
                  placeholder="What is this server about?"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading || !name.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
              Create Server
            </motion.button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
