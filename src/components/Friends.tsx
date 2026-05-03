import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp, addDoc, getDocs, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { User, UserPlus, UserCheck, UserMinus, MessageSquare, Search, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { FriendshipSkeleton } from './Skeleton';

interface FriendRequest {
  id: string;
  users: string[];
  status: 'pending' | 'accepted';
  requesterId: string;
  updatedAt: any;
  friendData?: any;
}

interface FriendsProps {
  onStartDM: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}

export function Friends({ onStartDM, onViewProfile }: FriendsProps) {
  const [user] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');
  const [friendships, setFriendships] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'friendships'), where('users', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendshipData: FriendRequest[] = [];
      
      for (const d of snapshot.docs) {
        const data = d.data() as FriendRequest;
        const friendId = data.users.find(id => id !== user.uid);
        
        if (friendId) {
          const friendDoc = await getDoc(doc(db, 'profiles', friendId));
          friendshipData.push({
            id: d.id,
            ...data,
            friendData: friendDoc.exists() ? { uid: friendId, ...friendDoc.data() } : { uid: friendId, displayName: 'Unknown User' }
          });
        }
      }
      
      setFriendships(friendshipData);
      setLoading(false);
    }, (err) => {
      console.error("Friendships snapshot error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user) return;
    
    setSearching(true);
    try {
      // Search for username prefix (case-insensitive prefix search)
      const q = query(
        collection(db, 'profiles'), 
        where('username', '>=', searchQuery.trim().toLowerCase()),
        where('username', '<=', searchQuery.trim().toLowerCase() + '\uf8ff'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(u => u.uid !== user.uid);
        
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetId: string) => {
    if (!user) return;
    try {
      const friendshipId = [user.uid, targetId].sort().join('_');
      await setDoc(doc(db, 'friendships', friendshipId), {
        users: [user.uid, targetId],
        status: 'pending',
        requesterId: user.uid,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'friendships');
    }
  };

  const acceptRequest = async (friendship: FriendRequest) => {
    try {
      await setDoc(doc(db, 'friendships', friendship.id), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `friendships/${friendship.id}`);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `friendships/${friendshipId}`);
    }
  };

  const friends = friendships.filter(f => f.status === 'accepted');
  const pendingIncoming = friendships.filter(f => f.status === 'pending' && f.requesterId !== user?.uid);
  const pendingOutgoing = friendships.filter(f => f.status === 'pending' && f.requesterId === user?.uid);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
          <User className="text-indigo-500" size={20} />
          Peers
        </h2>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: 'friends', label: 'Friends' },
            { id: 'pending', label: 'Pending' },
            { id: 'add', label: 'Add' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {tab.id === 'pending' && pendingIncoming.length > 0 && (
                <span className="ml-1 md:ml-2 px-1 py-0.5 bg-rose-500 text-white rounded-full text-[8px]">
                  {pendingIncoming.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => <FriendshipSkeleton key={i} />)}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <UserMinus size={48} className="mx-auto mb-4" />
                  <p className="font-bold uppercase tracking-widest text-sm">No peers connected</p>
                  <p className="text-xs mt-1">Start adding friends to chat privately.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.map(f => (
                    <FriendCard 
                      key={f.id} 
                      friend={f.friendData} 
                      onMessage={() => onStartDM(f.friendData.uid)}
                      onView={() => onViewProfile(f.friendData.uid)}
                      onRemove={() => removeFriend(f.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Incoming */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Incoming Requests ({pendingIncoming.length})</h3>
                <div className="space-y-2">
                  {pendingIncoming.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(f.friendData.uid)}>
                        <img src={f.friendData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.friendData.username}`} className="w-10 h-10 rounded-xl bg-slate-200" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">{f.friendData.displayName}</p>
                          <p className="text-[10px] text-slate-500">@{f.friendData.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => acceptRequest(f)}
                          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                          title="Accept"
                        >
                          <UserCheck size={16} />
                        </button>
                        <button 
                          onClick={() => removeFriend(f.id)}
                          className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                          title="Decline"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingIncoming.length === 0 && <p className="text-xs text-slate-400 italic">No incoming requests.</p>}
                </div>
              </div>

              {/* Outgoing */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Sent Requests ({pendingOutgoing.length})</h3>
                <div className="space-y-2">
                  {pendingOutgoing.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 opacity-70">
                      <div className="flex items-center gap-3">
                        <img src={f.friendData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.friendData.username}`} className="w-10 h-10 rounded-xl bg-slate-200" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight text-sm">{f.friendData.displayName}</p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1"><Clock size={10} /> Waiting for response...</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFriend(f.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Cancel Request"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  ))}
                  {pendingOutgoing.length === 0 && <p className="text-xs text-slate-400 italic">No outgoing requests.</p>}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search for username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <button 
                  type="submit"
                  disabled={searching}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  {searching ? '...' : 'Search'}
                </button>
              </form>

              <div className="space-y-2">
                {searchResults.map(result => {
                  const relationship = friendships.find(f => f.users.includes(result.uid));
                  return (
                    <div key={result.uid} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all shadow-sm">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(result.uid)}>
                        <img src={result.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.username}`} className="w-12 h-12 rounded-xl bg-slate-100" />
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base">{result.displayName}</p>
                          <p className="text-xs text-slate-500">@{result.username}</p>
                        </div>
                      </div>
                      
                      {relationship ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {relationship.status === 'accepted' ? (
                            <><ShieldCheck size={14} className="text-emerald-500" /> Peer</>
                          ) : relationship.requesterId === user?.uid ? (
                            <><Clock size={14} /> Pending</>
                          ) : (
                            <button onClick={() => acceptRequest(relationship)} className="text-indigo-500">Accept Request</button>
                          )}
                        </div>
                      ) : (
                        <button 
                          onClick={() => sendRequest(result.uid)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-sm"
                        >
                          <UserPlus size={16} />
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
                {searchQuery && searchResults.length === 0 && !searching && (
                  <p className="text-center py-10 text-sm text-slate-400">No users found with that username.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FriendCard({ friend, onMessage, onView, onRemove }: { friend: any, onMessage: () => void, onView: () => void, onRemove: () => void }) {
  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <img 
            src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.username}`} 
            className="w-20 h-20 rounded-3xl bg-slate-100 object-cover border-4 border-white dark:border-slate-700 shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white dark:border-slate-800 rounded-full" />
        </div>
        
        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg leading-tight">{friend.displayName}</h4>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">@{friend.username}</p>
        
        {friend.bio && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2 italic px-2">
            "{friend.bio}"
          </p>
        )}

        <div className="flex w-full gap-2 mt-6">
          <button 
            onClick={onMessage}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <MessageSquare size={14} />
            Message
          </button>
          <button 
            onClick={onView}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
          >
            <User size={16} />
          </button>
        </div>
      </div>

      <button 
        onClick={onRemove}
        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove Friend"
      >
        <UserMinus size={16} />
      </button>
    </div>
  );
}
