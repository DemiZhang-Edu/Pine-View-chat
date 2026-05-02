/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db, auth } from './lib/firebase';
import { Auth } from './components/Auth';
import { ChatRoom } from './components/ChatRoom';
import { Home } from './components/Home';
import { Profile } from './components/Profile';
import { AdminPanel } from './components/AdminPanel';
import { News } from './components/News';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { Logo } from './components/Logo';
import { MessageCircle, Hash, MessageSquare, Users, Settings as SettingsIcon, Github, Home as HomeIcon, Plus, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const { backgroundMode } = useTheme();
  const [view, setView] = useState<'home' | 'chat' | 'profile' | 'admin' | 'news' | 'settings'>('home');
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);

  const viewProfile = (userId: string) => {
    setTargetProfileId(userId);
    setView('profile');
  };

  const viewServer = (serverId: string) => {
    setActiveServerId(serverId);
    setView('chat');
  };

  // Fetch active server data if any
  const serverDocRef = activeServerId ? doc(db, 'servers', activeServerId) : null;
  const [activeServer] = useDocumentData(serverDocRef) as any;

  // Reset view when user logs out
  React.useEffect(() => {
    if (!user && !loading) {
      setView('home');
      setActiveServerId(null);
      setTargetProfileId(null);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            {/* Pulse Effect */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-indigo-500 rounded-2xl blur-xl"
            />
            <div className="relative w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
              <MessageCircle size={40} className="text-white" />
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black text-white tracking-tighter"
            >
              PV<span className="text-indigo-400 font-medium">Chat</span>
            </motion.h1>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <motion.div 
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1/2 h-full bg-indigo-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-all duration-700 ${
      backgroundMode === 'default' 
        ? 'bg-slate-50 dark:bg-slate-950' 
        : 'bg-transparent'
    }`}>
      <Sidebar 
        activeView={view} 
        setActiveView={(v) => {
          if (v !== 'profile' && v !== 'admin') setTargetProfileId(null);
          setView(v);
        }}
        activeServerId={activeServerId} 
        setActiveServerId={setActiveServerId}
        onViewProfile={viewProfile}
      />

      {/* Main Area */}
      <main className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-700 ${
        backgroundMode === 'default' 
          ? 'bg-white dark:bg-slate-900 shadow-xl' 
          : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-l border-white/20 dark:border-white/5 shadow-2xl'
      }`}>
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div 
              key={view + (activeServerId || 'global') + (targetProfileId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {view === 'chat' && (
                <>
                  <header className={`h-16 shrink-0 z-10 border-b px-6 flex items-center justify-between transition-all duration-500 ${
                    backgroundMode === 'default'
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                      : 'border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${activeServerId ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-indigo-600 text-white'}`}>
                        {activeServerId ? activeServer?.name?.charAt(0).toUpperCase() : <Hash size={20} />}
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {activeServerId ? activeServer?.name : 'global chat'}
                        </h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          {activeServerId ? (activeServer?.description || 'Guild Space') : 'Global Public Channel'} &bull; Real-time
                        </p>
                      </div>
                    </div>
                    
                    {activeServerId && activeServer && (
                       <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800/50 text-[10px] font-black uppercase tracking-widest">
                        Invite Code: <span className="text-indigo-900 dark:text-indigo-200 select-all ml-1">{activeServer.inviteCode}</span>
                       </div>
                    )}

                    <div className="flex items-center gap-3">
                      <motion.div 
                        whileHover={{ rotate: 90 }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors"
                        onClick={() => setView('settings')}
                      >
                        <SettingsIcon size={18} />
                      </motion.div>
                    </div>
                  </header>

                  <div className="flex-1 overflow-hidden">
                    <ChatRoom 
                      serverId={activeServerId} 
                      serverName={activeServerId ? activeServer?.name : 'Global Chat'} 
                      onViewProfile={viewProfile}
                      onChangeView={setView}
                    />
                  </div>
                </>
              )}

              {view === 'home' && (
                <Home 
                  onStartChat={() => setView('chat')} 
                  onViewProfile={viewProfile}
                />
              )}

              {view === 'profile' && (
                <Profile targetUserId={targetProfileId} />
              )}

              {view === 'admin' && user?.email === 'demizy2024@gmail.com' && (
                <AdminPanel onViewServer={viewServer} />
              )}

              {view === 'news' && (
                <News />
              )}

              {view === 'settings' && (
                <Settings />
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950"
            >
              <Logo size="lg" interactive={true} className="mb-8 scale-110" />
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4"
              >
                Pine View chat v.3
              </motion.h2>
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="max-w-md text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed"
              >
                I made a chat for Pine View. Talk freely!
              </motion.p>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Auth />
              </motion.div>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.6 } }
                }}
                className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl"
              >
                {[
                  { title: 'Indigo Polish', desc: 'Sleek professional aesthetic', icon: <MessageSquare size={20} /> },
                  { title: 'Secure Auth', desc: 'Identity protection built-in', icon: <Users size={20} /> },
                  { title: 'Instant Sync', desc: 'Real-time database updates', icon: <SettingsIcon size={20} /> },
                ].map((f, i) => (
                  <motion.div 
                    key={i} 
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                    whileHover={{ y: -5, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-left shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center mb-4">
                      {f.icon}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{f.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal">{f.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
              
              <motion.footer 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="absolute bottom-8 text-xs text-slate-400 flex items-center gap-4"
              >
                 <p>© 2026 PVChat</p>
                 <div className="flex items-center gap-2 hover:text-slate-600 transition-colors cursor-pointer">
                   <Github size={14} /> GitHub Source
                 </div>
              </motion.footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


