import React, { useState, useRef, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, limit, addDoc, serverTimestamp, doc, setDoc, where, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Message } from '../types';
import { Send, User, Paperclip, Smile, FileText, Download, ExternalLink, MessageCircle, UserPlus, UserCheck, UserMinus, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useTheme } from '../context/ThemeContext';
import { filterProfanity } from '../lib/profanity';
import { Skeleton, ChatMessageSkeleton } from './Skeleton';

interface ChatRoomProps {
  serverId: string | null;
  serverName?: string;
  conversationId?: string | null;
  conversationName?: string;
  onViewProfile?: (userId: string) => void;
  onChangeView?: (view: any) => void;
}

export function ChatRoom({ serverId, serverName, conversationId, conversationName, onViewProfile, onChangeView }: ChatRoomProps) {
  const [user] = useAuthState(auth);
  const { backgroundMode } = useTheme();
  const [formValue, setFormValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dummy = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '👽', '👾', '🤖', '🎃', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🙏', '✨', '🔥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addEmoji = (emoji: string) => {
    setFormValue(prev => prev + emoji);
  };

  const uploadFile = async (file: File) => {
    if (!user) return;

    if (!storage) {
      alert("Firebase Storage is not enabled or configured for this project. Please check your Firebase console.");
      return;
    }

    setIsUploading(true);
    const fileRef = ref(storage, `uploads/${serverId || conversationId || 'global'}/${Date.now()}_${file.name}`);

    try {
      const snapshot = await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(snapshot.ref);

      await addDoc(messagesRef, {
        text: `Shared a file: ${file.name}`,
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhotoUrl: user.photoURL || '',
        fileUrl,
        fileName: file.name,
        fileType: file.type,
      });
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('file') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault(); // Prevent pasting the image/file as text if possible
          await uploadFile(file);
        }
      }
    }
  };

  const messagesCollectionPath = serverId 
    ? `servers/${serverId}/messages` 
    : conversationId 
      ? `conversations/${conversationId}/messages` 
      : 'messages';
  const messagesRef = collection(db, messagesCollectionPath);
  
  // Memoize the query to avoid unnecessary re-subscriptions
  const q = React.useMemo(() => 
    query(messagesRef, orderBy('createdAt', 'asc'), limit(50)),
    [messagesCollectionPath]
  );

  const [messagesSnapshot, loading, error] = useCollection(q);
  const messages = React.useMemo(() => 
    messagesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[],
    [messagesSnapshot]
  );

  // Typing logic
  const typingRef = collection(db, 'typing');
  const typingQuery = query(typingRef, where('isTyping', '==', true));
  const [typingUsers] = useCollectionData(typingQuery) as unknown as [any[] | undefined, boolean, Error | undefined];

  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Handle typing state
  useEffect(() => {
    if (!user) return;
    
    const updateTyping = async (isTyping: boolean) => {
      try {
        await setDoc(doc(db, 'typing', user.uid), {
          userId: user.uid,
          displayName: user.displayName || 'Anonymous',
          isTyping,
          lastUpdated: serverTimestamp()
        });
      } catch (err) {
        console.error('Typing error:', err);
      }
    };

    if (formValue.length > 0) {
      updateTyping(true);
      const timeout = setTimeout(() => updateTyping(false), 3000);
      return () => clearTimeout(timeout);
    } else {
      updateTyping(false);
    }
  }, [formValue, user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formValue.trim()) return;
    const originalValue = formValue.trim();
    const { filteredText, triggeredWords, hasProfanity } = filterProfanity(originalValue);
    setFormValue('');

    try {
      if (originalValue.startsWith('/')) {
        const cmd = originalValue.toLowerCase().split(' ')[0];
        
        if (cmd === '/help') {
          alert('Available commands:\n/help - Show this list\n/news - Go to News\n/home - Go to Home\n/profile - Go to Profile\n/settings - App Settings\n/admin - Admin Panel (Admins Only)');
          return;
        }
        
        if (cmd === '/news' && onChangeView) {
          onChangeView('news');
          return;
        }

        if (cmd === '/settings' && onChangeView) {
          onChangeView('settings');
          return;
        }
        
        if (cmd === '/home' && onChangeView) {
          onChangeView('home');
          return;
        }
        
        if (cmd === '/profile' && onChangeView) {
          onChangeView('profile');
          return;
        }
        
        if (cmd === '/admin' && onChangeView) {
          if (user.email === 'demizy2024@gmail.com') {
            onChangeView('admin');
          } else {
            alert('Admin only.');
          }
          return;
        }
      }

      if (hasProfanity) {
        // Log alert for admin
        await addDoc(collection(db, 'profanity_alerts'), {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          originalText: originalValue,
          filteredText: filteredText,
          triggeredWords: triggeredWords,
          createdAt: serverTimestamp(),
          context: serverId ? `Server: ${serverName || serverId}` : 'Global Chat'
        });
      }

      await addDoc(messagesRef, {
        text: filteredText,
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderPhotoUrl: user.photoURL || '',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, messagesCollectionPath);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-50 dark:border-slate-800">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 animate-in fade-in duration-500">
          {[1, 2, 3, 4].map(i => <ChatMessageSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-red-500 p-4 bg-red-50 rounded-xl border border-red-100 text-sm font-medium">
          Error syncing: {error.message}
        </div>
      </div>
    );
  }

  const otherTypingUsers = typingUsers?.filter(u => u.userId !== user?.uid) || [];

  return (
    <div 
      className={`flex flex-col h-full relative transition-all duration-700 ${
        backgroundMode === 'default' ? 'bg-white dark:bg-slate-900' : 'bg-transparent'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-indigo-600/10 backdrop-blur-[2px] z-[50] flex items-center justify-center border-2 border-dashed border-indigo-500 m-4 rounded-2xl pointer-events-none"
          >
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 animate-bounce">
                <Paperclip size={32} />
              </div>
              <p className="text-lg font-bold text-slate-900">Drop files here to upload</p>
              <p className="text-sm text-slate-500 font-medium">Images and documents supported</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Feed */}
      <div className={`flex-1 overflow-y-auto p-3 md:p-6 space-y-6 md:space-y-8 custom-scrollbar transition-all duration-700 ${
        backgroundMode === 'default' ? 'dark:bg-slate-900' : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-4 py-2 text-slate-400 dark:text-slate-600">
          <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
            {conversationName || serverName || 'Global Chat'}
          </span>
          <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
        </div>

        <AnimatePresence initial={false}>
          {messages?.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id}>
                <ChatMessage 
                  message={msg} 
                  isOwn={msg.senderId === user?.uid} 
                  onViewProfile={() => onViewProfile?.(msg.senderId)}
                />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600 opacity-50">
              <MessageCircle size={48} className="mb-4" />
              <p className="text-sm font-medium uppercase tracking-widest">Beginning of a conversation</p>
              <p className="text-[10px] mt-1 tracking-tight">Say hello to the community!</p>
            </div>
          )}
        </AnimatePresence>

        {/* Typing Indicators */}
        <AnimatePresence>
          {otherTypingUsers.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-14 py-2"
            >
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs italic text-slate-400 font-medium">
                {otherTypingUsers.length === 1 
                  ? `${otherTypingUsers[0].displayName} is typing...`
                  : `${otherTypingUsers.length} people are typing...`}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={dummy} />
      </div>

      {/* Input Bar */}
      <div className={`p-4 md:p-6 pt-0 border-t transition-all duration-500 ${
        backgroundMode === 'default' 
          ? 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800' 
          : 'bg-white/10 dark:bg-white/5 border-white/5 backdrop-blur-md rounded-t-3xl'
      }`}>
        <form onSubmit={sendMessage} className="relative flex flex-col gap-2 md:gap-3">
          <div className="relative group">
            <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 flex gap-2 md:gap-3 text-slate-400 group-focus-within:text-indigo-400 dark:group-focus-within:text-indigo-500 transition-colors z-10">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <Paperclip 
                size={16} 
                className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${isUploading ? 'animate-pulse text-indigo-400' : ''}`} 
                onClick={() => !isUploading && fileInputRef.current?.click()}
              />
              <div className="relative" ref={emojiPickerRef}>
                <Smile 
                  size={16} 
                  className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${showEmojiPicker ? 'text-indigo-600' : ''}`}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                />
                
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute bottom-full left-0 mb-4 w-[280px] h-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden z-[100]"
                    >
                      <div className="p-3 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Emoji</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-5 gap-1 custom-scrollbar">
                        {emojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addEmoji(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-all active:scale-90"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <input
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              onPaste={handlePaste}
              placeholder="Message..."
              className="w-full pl-16 md:pl-24 pr-16 md:pr-24 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-100 shadow-inner"
            />

            <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2">
              <button
                type="submit"
                disabled={!formValue.trim()}
                className="p-2 md:px-5 md:py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
              >
                <span className="hidden md:inline">Send</span> <Send size={14} className="fill-current" />
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Connected</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Press Enter to send</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChatMessage({ message, isOwn, onViewProfile, onStartDM }: { message: Message; isOwn: boolean; onViewProfile?: () => void; onStartDM?: (uid: string) => void }) {
  const { text, senderName, senderPhotoUrl, fileUrl, fileName, fileType, senderId } = message;
  const [showPopover, setShowPopover] = useState(false);
  const [friendship, setFriendship] = useState<any>(null);
  const [loadingFriendship, setLoadingFriendship] = useState(false);
  const [user] = useAuthState(auth);

  const isImage = fileType?.startsWith('image/');

  useEffect(() => {
    if (showPopover && !isOwn && user && senderId) {
      setLoadingFriendship(true);
      const friendshipId = [user.uid, senderId].sort().join('_');
      const unsub = onSnapshot(doc(db, 'friendships', friendshipId), (snap) => {
        if (snap.exists()) {
          setFriendship({ id: snap.id, ...snap.data() });
        } else {
          setFriendship(null);
        }
        setLoadingFriendship(false);
      });
      return () => unsub();
    }
  }, [showPopover, isOwn, user, senderId]);

  const handleFriendAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !senderId) return;
    const friendshipId = [user.uid, senderId].sort().join('_');
    
    try {
      if (!friendship) {
        await setDoc(doc(db, 'friendships', friendshipId), {
          users: [user.uid, senderId],
          status: 'pending',
          requesterId: user.uid,
          updatedAt: serverTimestamp()
        });
      } else if (friendship.status === 'pending' && friendship.requesterId !== user.uid) {
        await updateDoc(doc(db, 'friendships', friendshipId), {
          status: 'accepted',
          updatedAt: serverTimestamp()
        });
      } else {
        if (friendship.status === 'accepted' && !window.confirm('Delete friend?')) return;
        await deleteDoc(doc(db, 'friendships', friendshipId));
      }
    } catch (err) {
      console.error("Friend action error:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      layout
      className={`flex gap-4 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div 
        className="relative"
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      >
        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewProfile}
          className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-slate-100 dark:border-slate-800 cursor-pointer ${isOwn ? 'bg-slate-800' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}
        >
          {senderPhotoUrl ? (
            <img src={senderPhotoUrl} alt={senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className={`font-bold ${isOwn ? 'text-white' : 'text-indigo-700 dark:text-indigo-400'}`}>
              {senderName.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {showPopover && !isOwn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} z-[100] w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-3 overflow-hidden`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden">
                    {senderPhotoUrl ? <img src={senderPhotoUrl} className="w-full h-full object-cover" /> : <User size={16} className="text-indigo-500" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate">{senderName}</p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest truncate">Chat Peer</p>
                  </div>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-700/50 -mx-3 mb-1" />

                <button 
                  onClick={(e) => { e.stopPropagation(); onViewProfile?.(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 transition-colors"
                >
                  <User size={12} /> View Profile
                </button>

                {loadingFriendship ? (
                  <div className="flex justify-center py-1">
                    <Loader2 size={12} className="animate-spin text-slate-300" />
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={handleFriendAction}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                        !friendship 
                          ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                          : friendship.status === 'accepted'
                            ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                            : friendship.requesterId === user?.uid
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                    >
                      {!friendship ? (
                        <><UserPlus size={12} /> Add Friend</>
                      ) : friendship.status === 'accepted' ? (
                        <><UserMinus size={12} /> Unfriend</>
                      ) : friendship.requesterId === user?.uid ? (
                        <><Clock size={12} /> Pending</>
                      ) : (
                        <><UserCheck size={12} /> Accept</>
                      )}
                    </button>

                    {friendship?.status === 'accepted' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onStartDM?.(senderId); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                      >
                        <MessageCircle size={12} /> Message
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 mb-1.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight">{isOwn ? 'You' : senderName}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            {message.createdAt?.toDate ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
          </span>
        </div>
        
        <div className={`flex flex-col gap-2 ${isOwn ? 'items-end' : 'items-start'}`}>
          <motion.p 
            layoutId={`msg-${message.id}`}
            className={`text-sm leading-relaxed p-3.5 max-w-lg shadow-sm font-medium ${
            isOwn 
              ? 'bg-indigo-600 text-white rounded-tl-xl rounded-b-xl' 
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-tr-xl rounded-b-xl border border-slate-100 dark:border-slate-700'
          }`}>
            {text}
          </motion.p>

          {fileUrl && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`max-w-lg rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm ${isOwn ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}
            >
              {isImage ? (
                <div className="relative group">
                  <img src={fileUrl} alt={fileName} className="max-h-60 w-full object-cover cursor-pointer transition-transform hover:scale-[1.02]" onClick={() => window.open(fileUrl, '_blank')} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
              ) : (
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-indigo-500 shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{fileName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{fileType?.split('/')[1] || 'File'}</p>
                  </div>
                  <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Download size={18} />
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

