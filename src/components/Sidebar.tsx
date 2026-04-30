import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { 
  Globe, 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Plus, 
  Compass,
  LayoutGrid,
  ChevronRight,
  Hash,
  Shield,
  Loader2,
  PlusCircle,
  Link2,
  User as UserIcon,
  Home as HomeIcon,
  Sun,
  Moon
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, orderBy, collectionGroup } from 'firebase/firestore';
import { CreateServerModal } from './CreateServerModal';
import { JoinServerModal } from './JoinServerModal';
import { Auth } from './Auth';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: any) => void;
  activeServerId: string | null;
  setActiveServerId: (id: string | null) => void;
  onViewProfile?: (userId: string) => void;
}

interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  ownerId: string;
}

export function Sidebar({ activeView, setActiveView, activeServerId, setActiveServerId, onViewProfile }: SidebarProps) {
  const [user] = useAuthState(auth);
  const { theme, toggleTheme } = useTheme();
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setServers([]);
      setLoadingServers(false);
      return;
    }

    // Use collectionGroup to find all 'members' documents where userId matches
    const membersQuery = query(collectionGroup(db, 'members'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(membersQuery, async (snapshot) => {
      const serverIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
      
      if (serverIds.length === 0) {
        setServers([]);
        setLoadingServers(false);
        return;
      }

      // Fetch server data for these IDs
      const serversRef = collection(db, 'servers');
      // For real-time updates of my servers list
      const unsubServers = onSnapshot(serversRef, (srvSnapshot) => {
        const srvs = srvSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Server))
          .filter(s => serverIds.includes(s.id));
        setServers(srvs);
        setLoadingServers(false);
      }, (err) => {
        console.error("Error in servers listener:", err);
        setLoadingServers(false);
      });

      return unsubServers;
    }, (error) => {
      console.error("Error fetching my server memberships:", error);
      setLoadingServers(false);
    });

    return () => unsubscribe();
  }, [user]);

  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'chat', icon: MessageSquare, label: 'Global Chat' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
  ];

  if (user?.email === 'demizy2024@gmail.com') {
    navItems.push({ id: 'admin', icon: Shield, label: 'Admin Panel' });
  }

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-64 bg-white dark:bg-slate-900 flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800 z-20"
    >
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <Logo />
      </div>
      
      <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05 } }
          }}
          className="px-4 mb-8"
        >
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-3">Main</div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <motion.button 
                key={item.id}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 }
                }}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setActiveView(item.id);
                  setActiveServerId(null);
                }}
                className={`w-full px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                  activeView === item.id && !activeServerId ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <item.icon size={16} className={activeView === item.id && !activeServerId ? 'opacity-100' : 'opacity-50'} /> {item.label}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Servers Section */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } }
          }}
          className="px-4 mb-8"
        >
          <div className="flex items-center justify-between px-3 mb-3">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Communities</div>
            <div className="flex gap-1.5">
              <motion.button 
                whileHover={{ scale: 1.2, color: '#4f46e5' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowJoinModal(true)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Join Community"
              >
                <Link2 size={12} />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.2, rotate: 90, color: '#4f46e5' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCreateModal(true)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Create Community"
              >
                <Plus size={12} />
              </motion.button>
            </div>
          </div>
          <div className="space-y-1">
            {loadingServers ? (
              <div className="flex py-4 justify-center">
                <Loader2 size={14} className="animate-spin text-slate-300 dark:text-slate-700" />
              </div>
            ) : servers.length > 0 ? (
              servers.map((server) => (
                <motion.button 
                  key={server.id}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActiveServerId(server.id);
                    setActiveView('chat');
                  }}
                  className={`w-full px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                    activeServerId === server.id ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${
                    activeServerId === server.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {server.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate flex-1 text-left">{server.name}</span>
                </motion.button>
              ))
            ) : (
                <div className="px-3 py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">No servers yet</p>
                  <button 
                    onClick={() => setShowJoinModal(true)}
                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 mt-1 uppercase tracking-wider underline"
                  >
                    Join One
                  </button>
                </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800"
      >
        {/* New Theme Toggle Component */}
        <div className="mb-4 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 pl-2">
            {theme === 'light' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-400" />}
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{theme} Mode</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <motion.div 
              animate={{ x: theme === 'dark' ? 20 : 2 }}
              className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
            />
          </motion.button>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <motion.img 
              whileHover={{ scale: 1.1 }}
              src={user.photoURL || undefined} 
              alt={user.displayName || undefined} 
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 p-0.5"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{user.displayName}</div>
              <div className="flex items-center gap-1.5">
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-500" 
                />
                <span className="text-xs text-slate-400 dark:text-slate-500">Online</span>
              </div>
            </div>
            <Auth />
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Guest Session</span>
            <Auth />
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateServerModal 
            onClose={() => setShowCreateModal(false)}
            onCreated={(id) => {
              setActiveServerId(id);
              setActiveView('chat');
            }}
          />
        )}
        {showJoinModal && (
          <JoinServerModal 
            onClose={() => setShowJoinModal(false)}
            onJoined={(id) => {
              setActiveServerId(id);
              setActiveView('chat');
            }}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
