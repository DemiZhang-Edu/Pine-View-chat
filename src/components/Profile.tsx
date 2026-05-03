import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { User, Camera, Save, Loader2, CheckCircle2, AlertCircle, UserPlus, UserMinus, UserCheck, MessageSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { ProfileSkeleton } from './Skeleton';

interface ProfileProps {
  targetUserId?: string | null;
  onStartDM?: (userId: string) => void;
}

export function Profile({ targetUserId, onStartDM }: ProfileProps) {
  const [user] = useAuthState(auth);
  const { backgroundMode, setBackgroundMode } = useTheme();
  const isOwnProfile = !targetUserId || targetUserId === user?.uid;
  const profileId = targetUserId || user?.uid;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [friendship, setFriendship] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) return;
      setLoading(true);
      try {
        // Fetch from profiles (public)
        const profileDoc = await getDoc(doc(db, 'profiles', profileId));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setDisplayName(data.displayName || '');
          setPhotoURL(data.photoURL || '');
          setBio(data.bio || '');
          
          if (isOwnProfile && data.backgroundMode) {
            setBackgroundMode(data.backgroundMode);
          }
          
          // Use username from profiles (it's synced there)
          setUsername(data.username || '');
        } else if (isOwnProfile) {
          // Fallback to 'users' ONLY for own profile
          const userDoc = await getDoc(doc(db, 'users', profileId));
          if (userDoc.exists()) {
            setDisplayName(userDoc.data().displayName || '');
            setUsername(userDoc.data().username || '');
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    
    // Listen for friendship changes
    if (!isOwnProfile && user && profileId) {
      const friendshipId = [user.uid, profileId].sort().join('_');
      const unsub = onSnapshot(doc(db, 'friendships', friendshipId), (snap) => {
        if (snap.exists()) {
          setFriendship({ id: snap.id, ...snap.data() });
        } else {
          setFriendship(null);
        }
      });
      return () => unsub();
    }
  }, [profileId, isOwnProfile, user]);

  const handleFriendAction = async () => {
    if (!user || !profileId) return;
    const friendshipId = [user.uid, profileId].sort().join('_');
    
    try {
      if (!friendship) {
        // Send request
        await setDoc(doc(db, 'friendships', friendshipId), {
          users: [user.uid, profileId],
          status: 'pending',
          requesterId: user.uid,
          updatedAt: serverTimestamp()
        });
      } else if (friendship.status === 'pending' && friendship.requesterId !== user.uid) {
        // Accept request
        await updateDoc(doc(db, 'friendships', friendshipId), {
          status: 'accepted',
          updatedAt: serverTimestamp()
        });
      } else {
        // Cancel or remove friend
        if (friendship.status === 'accepted' && !window.confirm('Delete friend?')) return;
        await deleteDoc(doc(db, 'friendships', friendshipId));
      }
    } catch (err) {
      console.error("Friend action error:", err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const updateData: any = {
        displayName: displayName.trim() || user.displayName || 'Anonymous',
        bio: bio.trim(),
        lastSeen: serverTimestamp()
      };

      // Update private data
      await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });

      // Update public data
      const publicUpdateData: any = {
        displayName: displayName.trim() || user.displayName || 'Anonymous',
        photoURL: photoURL.trim(),
        bio: bio.trim(),
        backgroundMode: backgroundMode,
        lastSeen: serverTimestamp()
      };
      
      await setDoc(doc(db, 'profiles', user.uid), publicUpdateData, { merge: true });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-12">
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar p-4 md:p-12 transition-all duration-700 ${
      backgroundMode === 'default' ? 'bg-slate-50 dark:bg-slate-950' : 'bg-transparent'
    }`}>
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className={`transition-all duration-500 rounded-3xl shadow-xl overflow-hidden border ${
            backgroundMode === 'default' 
              ? 'bg-white dark:bg-slate-900 shadow-slate-200/50 dark:shadow-none border-slate-200 dark:border-slate-800' 
              : 'bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/5 backdrop-blur-xl'
          }`}
        >
          <div className="h-32 bg-indigo-600 relative">
            <div className="absolute -bottom-16 left-8">
              <div className="relative group">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="w-32 h-32 rounded-3xl bg-white dark:bg-slate-800 p-1.5 shadow-lg"
                >
                  <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 overflow-hidden">
                    {photoURL ? (
                      <img src={photoURL} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={48} />
                    ) }
                  </div>
                </motion.div>
                {isOwnProfile && (
                  <motion.button 
                    whileHover={{ scale: 1.1, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Camera size={16} />
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-20 px-8 pb-8 text-slate-900 dark:text-white">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isOwnProfile ? (displayName || 'Anonymous User') : displayName}</h1>
                {!isOwnProfile && username && (
                  <p className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest mt-1">@{username}</p>
                )}
              </div>

              {!isOwnProfile && (
                <div className="flex gap-2">
                  {friendship?.status === 'accepted' && (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => onStartDM?.(profileId!)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                      <MessageSquare size={16} />
                      Message
                    </motion.button>
                  )}
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleFriendAction}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      !friendship 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' 
                        : friendship.status === 'accepted'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : friendship.requesterId === user?.uid
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                            : 'bg-emerald-500 text-white animate-pulse'
                    }`}
                  >
                    {!friendship ? (
                      <><UserPlus size={16} /> Add Friend</>
                    ) : friendship.status === 'accepted' ? (
                      <><UserCheck size={16} /> Friends</>
                    ) : friendship.requesterId === user?.uid ? (
                      <><Clock size={16} /> Pending</>
                    ) : (
                      <><UserCheck size={16} /> Accept Request</>
                    )}
                  </motion.button>
                </div>
              )}
            </motion.div>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div 
                  key={message.text}
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium ${
                    message.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form 
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } }
              }}
              onSubmit={handleUpdate} 
              className="space-y-6"
            >
              <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Username (Read-only)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 font-bold text-sm">@</div>
                  <input 
                    type="text" 
                    value={username}
                    readOnly
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-sm font-medium text-slate-500 dark:text-slate-500 cursor-not-allowed"
                  />
                </div>
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={18} />
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    readOnly={!isOwnProfile}
                    className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl outline-none transition-all text-sm font-medium ${
                      isOwnProfile 
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white' 
                        : 'bg-transparent border-transparent text-slate-900 dark:text-white cursor-default'
                    }`}
                    placeholder="Your name"
                  />
                </div>
              </motion.div>

              {isOwnProfile && (
                <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Photo URL <span className="text-[10px] font-medium lowercase opacity-60 dark:opacity-40">(Optional)</span></label>
                  <input 
                    type="text" 
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </motion.div>
              )}

              <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Bio</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  readOnly={!isOwnProfile}
                  className={`w-full px-4 py-3.5 border rounded-2xl outline-none transition-all text-sm font-medium resize-none ${
                    isOwnProfile 
                      ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white' 
                      : 'bg-transparent border-transparent text-slate-900 dark:text-white cursor-default p-0'
                  }`}
                  placeholder={isOwnProfile ? "Tell us a little about yourself..." : "No bio provided."}
                />
              </motion.div>

              {isOwnProfile && (
                <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="pt-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AnimatePresence mode="wait">
                      {saving ? (
                        <motion.div
                          key="saving"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Loader2 size={20} className="animate-spin" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="save"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Save size={20} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {saving ? 'Saving Changes...' : 'Save Profile'}
                  </motion.button>
                </motion.div>
              )}
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
