import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  BarChart3, 
  MessageCircle, 
  Zap, 
  Globe,
  ArrowRight,
  Loader2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types';
import { Logo } from './Logo';

interface HomeProps {
  onStartChat: () => void;
  onViewProfile?: (userId: string) => void;
}

export function Home({ onStartChat, onViewProfile }: HomeProps) {
  const [user] = useAuthState(auth);

  // Fetch latest activity (messages)
  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(5));
  const [messagesSnapshot, loading] = useCollection(q);
  const messages = messagesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 overflow-y-auto h-full custom-scrollbar dark:bg-slate-900">
      {/* Welcome Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <Logo size="lg" interactive={true} />
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight"
              >
                Finally! A separate chat for Pine View!
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 dark:text-slate-400 font-medium mt-1"
              >
                Welcome back, {user?.displayName?.split(' ')[0] || 'Member'}! Connect with your peers in real-time.
              </motion.p>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05, shadow: "0 10px 15px -3px rgba(79, 70, 229, 0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onStartChat}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 shrink-0 self-start md:self-center"
          >
            Go to Global Chat <ArrowRight size={18} />
          </motion.button>
        </div>
      </motion.section>

      {/* Main Feature Area */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        {/* News Feed / Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-600 dark:text-indigo-400" /> Recent Messages
            </h3>
            {loading && <Loader2 size={16} className="text-slate-400 animate-spin" />}
          </div>
          
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm min-h-[300px]">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500"
                >
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-sm font-medium">Syncing activity...</p>
                </motion.div>
              ) : messages && messages.length > 0 ? (
                <motion.div 
                  key="content"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } }
                  }}
                  className="divide-y divide-slate-50 dark:divide-slate-800"
                >
                  {messages.map((message, i) => (
                    <motion.div 
                      key={message.id || i}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className="p-5 flex items-start gap-4 transition-colors group"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onViewProfile?.(message.senderId)}
                        className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 overflow-hidden cursor-pointer"
                      >
                        {message.senderPhotoUrl ? (
                          <img src={message.senderPhotoUrl} alt={message.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <MessageCircle size={20} />
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {message.senderName}
                          </p>
                          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 flex items-center gap-1 shrink-0">
                            <Clock size={10} />
                            {message.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1 italic">
                          "{message.text}"
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600"
                >
                  <Globe size={32} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">No recent messages yet.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
