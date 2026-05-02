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
  Moon,
  Palette,
  Newspaper
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, orderBy, collectionGroup, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const { theme, toggleTheme, backgroundMode, setBackgroundMode } = useTheme();
  const [servers, setServers] = useState<Server[]>([]);
  const [loadingServers, setLoadingServers] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAtmosphereMenu, setShowAtmosphereMenu] = useState(false);
  const [hoveredAtmosphere, setHoveredAtmosphere] = useState<string | null>(null);

  const handleSetAtmosphere = async (mode: any) => {
    setBackgroundMode(mode);
    if (user) {
      const profilePath = `profiles/${user.uid}`;
      try {
        await setDoc(doc(db, 'profiles', user.uid), {
          backgroundMode: mode,
          lastSeen: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to save atmosphere to profile:", err);
        handleFirestoreError(err, OperationType.WRITE, profilePath);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      setServers([]);
      setLoadingServers(false);
      return;
    }

    // 1. List of memberships
    const membersQuery = query(collectionGroup(db, 'members'), where('userId', '==', user.uid));
    
    // 2. Fetch all servers (since they are public if you are a member or have invite)
    // We listen to the whole collection once and filter locally based on the memberships
    const serversRef = collection(db, 'servers');
    
    let currentServerIds: string[] = [];

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      currentServerIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
      if (currentServerIds.length === 0) {
        setServers([]);
        setLoadingServers(false);
      }
    }, (error) => {
      console.error("Error fetching memberships:", error);
    });

    const unsubServers = onSnapshot(serversRef, (srvSnapshot) => {
      const srvs = srvSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Server))
        .filter(s => currentServerIds.includes(s.id));
      
      setServers(srvs);
      setLoadingServers(false);
    }, (err) => {
      console.error("Error in servers listener:", err);
      setLoadingServers(false);
    });

    return () => {
      unsubMembers();
      unsubServers();
    };
  }, [user]);

  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'news', icon: Newspaper, label: 'News' },
    { id: 'chat', icon: MessageSquare, label: 'Global Chat' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  if (user?.email === 'demizy2024@gmail.com') {
    navItems.push({ id: 'admin', icon: Shield, label: 'Admin Panel' });
  }

  return (
    <motion.aside 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`w-64 flex flex-col shrink-0 border-r transition-all duration-700 z-20 ${
        backgroundMode === 'default'
          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg'
          : 'bg-white/30 dark:bg-slate-950/30 backdrop-blur-xl border-white/20 dark:border-white/5'
      }`}
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
        className={`p-4 border-t transition-all duration-500 ${
          backgroundMode === 'default'
            ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
            : 'bg-white/20 dark:bg-black/10 border-white/10 dark:border-white/5 backdrop-blur-lg'
        }`}
      >
        <AnimatePresence>
          {showAtmosphereMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 10 }}
              className="mb-4 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
            >
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between h-4">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={hoveredAtmosphere || 'default-label'}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {hoveredAtmosphere || 'Select Atmosphere'}
                  </motion.span>
                </AnimatePresence>
                <Palette size={10} />
              </div>
              <div className="flex items-center justify-between gap-1">
                {[
                  { id: 'default', color: 'bg-slate-200 dark:bg-slate-700', label: 'Classic' },
                  { id: 'aurora', color: 'bg-emerald-500', label: 'Aurora' },
                  { id: 'calm', color: 'bg-blue-300', label: 'Calm' },
                  { id: 'neon', color: 'bg-purple-600', label: 'Neon' },
                  { id: 'misty', color: 'bg-slate-400', label: 'Misty' },
                ].map((mode) => (
                  <motion.button
                    key={mode.id}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredAtmosphere(mode.label)}
                    onMouseLeave={() => setHoveredAtmosphere(null)}
                    onClick={() => handleSetAtmosphere(mode.id)}
                    title={mode.label}
                    className={`w-7 h-7 rounded-full ${mode.color} border-2 transition-all ${
                      backgroundMode === mode.id ? 'border-indigo-600 ring-2 ring-indigo-500/20' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Theme Toggle Component */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAtmosphereMenu(!showAtmosphereMenu)}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
              showAtmosphereMenu 
                ? 'bg-indigo-600 border-indigo-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-500'
            }`}
            title="Background Atmosphere"
          >
            <Palette size={18} />
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
