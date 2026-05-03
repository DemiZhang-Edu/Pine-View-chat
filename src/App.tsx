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
import { Friends } from './components/Friends';
import { Sidebar } from './components/Sidebar';
import { Logo } from './components/Logo';
import { MessageCircle, Hash, MessageSquare, Users, Settings as SettingsIcon, Github, Home as HomeIcon, Plus, User as UserIcon, Shield, Menu, X, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './context/ThemeContext';
import { getDocs, query, collection, where, addDoc, serverTimestamp } from 'firebase/firestore';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const { backgroundMode } = useTheme();
  const [view, setView] = useState<'home' | 'chat' | 'profile' | 'admin' | 'news' | 'settings' | 'friends' | 'dm'>('home');
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [targetProfileId, setTargetProfileId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const viewProfile = (userId: string) => {
    setTargetProfileId(userId);
    setView('profile');
  };

  const viewServer = (serverId: string) => {
    setActiveConversationId(null);
    setActiveServerId(serverId);
    setView('chat');
  };

  const startDM = async (targetUserId: string) => {
    if (!user) return;
    
    // Check if conversation already exists
    const q = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', user.uid)
    );
    const snapshot = await getDocs(q);
    const existing = snapshot.docs.find(d => d.data().participants.includes(targetUserId));
    
    if (existing) {
      setActiveConversationId(existing.id);
      setActiveServerId(null);
      setView('dm');
    } else {
      // Create new conversation
      const newConv = await addDoc(collection(db, 'conversations'), {
        participants: [user.uid, targetUserId],
        updatedAt: serverTimestamp()
      });
      setActiveConversationId(newConv.id);
      setActiveServerId(null);
      setView('dm');
    }
  };

  // Fetch active server data if any
  const serverDocRef = activeServerId ? doc(db, 'servers', activeServerId) : null;
  const [activeServer] = useDocumentData(serverDocRef) as any;

  // Fetch active conversation data if any
  const convDocRef = activeConversationId ? doc(db, 'conversations', activeConversationId) : null;
  const [activeConv] = useDocumentData(convDocRef) as any;
  const [otherUser, setOtherUser] = useState<any>(null);

  React.useEffect(() => {
    if (activeConv && user) {
      const otherId = activeConv.participants.find((id: string) => id !== user.uid);
      if (otherId) {
        getDocs(query(collection(db, 'profiles'), where('__name__', '==', otherId))).then(snap => {
          if (!snap.empty) setOtherUser({ uid: otherId, ...snap.docs[0].data() });
        });
      }
    } else {
      setOtherUser(null);
    }
  }, [activeConv, user]);

  // Reset view when user logs out
  React.useEffect(() => {
    if (!user && !loading) {
      setView('home');
      setActiveServerId(null);
      setTargetProfileId(null);
      setActiveConversationId(null);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative">
            {/* Soft Breathing Ambient Light */}
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1], 
                opacity: [0.3, 0.5, 0.3],
                filter: ["blur(40px)", "blur(60px)", "blur(40px)"]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-indigo-500 rounded-full"
            />
            
            <motion.div 
              animate={{ 
                y: [-4, 4, -4],
                rotate: [-2, 2, -2]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.4)]"
            >
              <MessageCircle size={48} className="text-white" />
            </motion.div>
          </div>
          
          <div className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-5xl font-black text-white tracking-tighter">
                PV<span className="text-indigo-400 font-medium">Chat</span>
              </h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Initializing Experience</p>
            </motion.div>

            <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden relative">
              <motion.div 
                animate={{ 
                  x: ["-100%", "100%"] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 w-full h-full bg-indigo-500 rounded-full"
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
          if (v !== 'profile' && v !== 'admin' && v !== 'dm') {
            setTargetProfileId(null);
            setActiveConversationId(null);
          }
          setView(v);
        }}
        activeServerId={activeServerId} 
        setActiveServerId={setActiveServerId}
        activeConversationId={activeConversationId}
        setActiveConversationId={(id) => {
          setActiveConversationId(id);
          setActiveServerId(null);
          setView('dm');
        }}
        onViewProfile={viewProfile}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Area */}
      <main className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-700 w-full ${
        backgroundMode === 'default' 
          ? 'bg-white dark:bg-slate-900 shadow-xl' 
          : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border-l border-white/20 dark:border-white/5 shadow-2xl'
      }`}>
        <AnimatePresence mode="wait">
          {user ? (
            <motion.div 
              key={view + (activeServerId || activeConversationId || 'global') + (targetProfileId || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {(view === 'chat' || view === 'dm') && (
                <>
                  <header className={`h-16 shrink-0 z-10 border-b px-4 lg:px-6 flex items-center justify-between transition-all duration-500 ${
                    backgroundMode === 'default'
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                      : 'border-white/20 dark:border-white/5 bg-white/40 dark:bg-white/5 backdrop-blur-md shadow-sm'
                  }`}>
                    <div className="flex items-center gap-3 lg:gap-4">
                      {/* Mobile Sidebar Toggle */}
                      <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-500 lg:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Menu size={20} />
                      </button>

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${activeServerId || activeConversationId ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-indigo-600 text-white'}`}>
                        {activeServerId ? activeServer?.name?.charAt(0).toUpperCase() : activeConversationId ? <UserIcon size={20} /> : <Hash size={20} />}
                      </div>
                      <div className="overflow-hidden">
                        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                          {activeServerId ? activeServer?.name : activeConversationId ? otherUser?.displayName || 'Chat' : 'global chat'}
                        </h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">
                          {activeServerId ? (activeServer?.description || 'Guild Space') : activeConversationId ? `Private with ${otherUser?.displayName || 'user'}` : 'Global Channel'}
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
                      conversationId={activeConversationId}
                      conversationName={otherUser?.displayName}
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
                <Profile 
                  targetUserId={targetProfileId} 
                  onStartDM={startDM}
                />
              )}

              {view === 'friends' && (
                <Friends 
                  onStartDM={startDM} 
                  onViewProfile={viewProfile}
                />
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

        {/* Mobile Bottom Navigation */}
        {user && (
          <nav className="lg:hidden h-16 shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-around px-4 z-30">
            {[
              { id: 'home', icon: HomeIcon, label: 'Home' },
              { id: 'chat', icon: MessageSquare, label: 'Chat' },
              { id: 'friends', icon: Users, label: 'Friends' },
              { id: 'news', icon: Newspaper, label: 'News' },
              { id: 'profile', icon: UserIcon, label: 'Profile' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id as any);
                  setActiveServerId(null);
                  setActiveConversationId(null);
                  setTargetProfileId(null);
                }}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  view === item.id 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <item.icon size={20} />
                <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </main>
    </div>
  );
}


