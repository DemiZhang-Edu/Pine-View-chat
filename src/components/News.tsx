import React, { useState, useRef } from 'react';
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, Send, Image as ImageIcon, X, Trash2, Calendar, User as UserIcon, Plus, Loader2, Edit3 } from 'lucide-react';
import { NewsItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';

export function News() {
  const [user] = useAuthState(auth);
  const { backgroundMode } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  
  // Upload form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NewsItem[];
      setNews(newsData);
      setLoading(false);
    }, (err) => {
      console.error("News snapshot error:", err);
      handleFirestoreError(err, OperationType.LIST, 'news');
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setImagePreview(item.imageUrl || null);
    setShowUploadModal(true);
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setEditingItem(null);
    setTitle('');
    setContent('');
    setImage(null);
    setImagePreview(null);
  };

  const handleUploadNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;

    setIsUploading(true);
    const newsPath = editingItem ? `news/${editingItem.id}` : 'news';
    try {
      let finalImageUrl = imagePreview || '';
      
      if (image) {
        const imageRef = ref(storage, `news/${Date.now()}_${image.name}`);
        const uploadResult = await uploadBytes(imageRef, image);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const newsData = {
        title,
        content,
        imageUrl: finalImageUrl,
        authorId: editingItem ? editingItem.authorId : user.uid,
        authorName: editingItem ? editingItem.authorName : (user.displayName || user.email?.split('@')[0] || 'Anonymous'),
        authorPhotoURL: editingItem ? (editingItem.authorPhotoURL || '') : (user.photoURL || ''),
        createdAt: editingItem ? editingItem.createdAt : serverTimestamp(),
        tags: editingItem ? (editingItem.tags || []) : []
      };

      if (editingItem) {
        await updateDoc(doc(db, 'news', editingItem.id), newsData);
      } else {
        await addDoc(collection(db, newsPath), newsData);
      }

      closeModal();
    } catch (err) {
      console.error("Failed to upload news:", err);
      handleFirestoreError(err, editingItem ? OperationType.UPDATE : OperationType.CREATE, newsPath);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteNews = async (id: string, authorId: string) => {
    if (!user || (user.uid !== authorId && user.email !== 'demizy2024@gmail.com')) return;
    
    if (window.confirm('Are you sure you want to delete this news post?')) {
      try {
        await deleteDoc(doc(db, 'news', id));
      } catch (err) {
        console.error("Failed to delete news:", err);
        handleFirestoreError(err, OperationType.DELETE, `news/${id}`);
      }
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 transition-all duration-700 ${
      backgroundMode === 'default' ? 'bg-slate-50 dark:bg-slate-950' : 'bg-transparent'
    }`}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Newspaper size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">News</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Capture and share moments from campus</p>
            </div>
          </div>
          
          {user && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
            >
              <Plus size={20} />
              <span>Post News</span>
            </motion.button>
          )}
        </div>

        {/* News Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-slate-400 font-medium">Fetching latest updates...</p>
            </div>
          ) : news.length === 0 ? (
            <div className={`p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-4 ${
              backgroundMode === 'default' ? 'border-slate-200 dark:border-slate-800' : 'border-white/10 dark:border-white/5'
            }`}>
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Newspaper size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No news yet</h3>
                <p className="text-slate-500 dark:text-slate-400">Be the first one to share something happening at school!</p>
              </div>
            </div>
          ) : (
            news.map((item) => (
              <motion.article 
                key={item.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group transition-all duration-500 rounded-3xl overflow-hidden border shadow-sm ${
                  backgroundMode === 'default' 
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                    : 'bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/5 backdrop-blur-xl'
                }`}
              >
                {item.imageUrl && (
                  <div className="aspect-[21/9] w-full overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}
                
                <div className="p-8 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{item.title}</h2>
                      <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <UserIcon size={12} />
                          <span>{item.authorName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>{item.createdAt?.toDate ? format(item.createdAt.toDate(), 'PPP') : 'Just now'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {(user?.uid === item.authorId || user?.email === 'demizy2024@gmail.com') && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteNews(item.id, item.authorId)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {item.content}
                  </p>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-indigo-600">
                    {editingItem ? <Edit3 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    <h2 className="text-2xl font-black tracking-tight dark:text-white">
                      {editingItem ? 'Edit News' : 'Post News'}
                    </h2>
                  </div>
                  <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUploadNews} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mx-1">Title</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's happening?"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mx-1">Content</label>
                    <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Tell us more about it..."
                      rows={6}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mx-1">Image (Optional)</label>
                    <div className="flex flex-col gap-4">
                      {imagePreview ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden group">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => { setImage(null); setImagePreview(null); }}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all group"
                        >
                          <ImageIcon size={32} className="group-hover:scale-110 transition-transform" />
                          <span className="font-bold">Add featured image</span>
                        </button>
                      )}
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                  >
                    {isUploading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                    <span>{isUploading ? (editingItem ? 'Updating...' : 'Posting...') : (editingItem ? 'Update Post' : 'Share with School')}</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
