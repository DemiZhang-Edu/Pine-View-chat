import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion } from 'motion/react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Lock, 
  Palette, 
  Shield, 
  LogOut,
  Check,
  Loader2,
  Camera
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Settings() {
  const [user] = useAuthState(auth);
  const { theme, toggleTheme, backgroundMode, setBackgroundMode } = useTheme();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsUpdating(true);
    try {
      await updateProfile(user, { displayName });
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Profile update failed:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const atmosphereOptions = [
    { id: 'default', label: 'Default', color: 'bg-slate-200 dark:bg-slate-800' },
    { id: 'aurora', label: 'Aurora', color: 'bg-emerald-400' },
    { id: 'calm', label: 'Calm Breeze', color: 'bg-sky-400' },
    { id: 'neon', label: 'Neon Soul', color: 'bg-purple-500' },
    { id: 'misty', label: 'Misty Lake', color: 'bg-indigo-400' },
  ];

  return (
    <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 transition-all duration-700 ${
      backgroundMode === 'default' ? 'bg-slate-50 dark:bg-slate-950' : 'bg-transparent'
    }`}>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your account and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Nav (Internal to Settings) */}
          <div className="space-y-2">
            {[
              { id: 'profile', icon: User, label: 'Public Profile' },
              { id: 'appearance', icon: Palette, label: 'Appearance' },
              { id: 'notifications', icon: Bell, label: 'Notifications' },
              { id: 'security', icon: Shield, label: 'Security & Privacy' },
            ].map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                  item.id === 'profile' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Section */}
            <section className={`p-8 rounded-[2rem] border transition-all duration-500 ${
              backgroundMode === 'default' 
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' 
                : 'bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/5 backdrop-blur-xl'
            }`}>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                Profile Information
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative group">
                    <img 
                      src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random`} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-50 dark:ring-slate-800"
                    />
                    <button type="button" className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Camera size={20} />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{user?.displayName || 'Scholar'}</h4>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mx-1">Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all font-bold dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 mx-1">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={user?.email || ''}
                      className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl cursor-not-allowed opacity-60 font-bold dark:text-white"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                >
                  {isUpdating ? <Loader2 className="animate-spin" /> : showSuccess ? <Check /> : 'Save Changes'}
                  <span>{isUpdating ? 'Saving...' : showSuccess ? 'Profiles Updated!' : 'Update Profile'}</span>
                </button>
              </form>
            </section>

            {/* Appearance Section */}
            <section className={`p-8 rounded-[2rem] border transition-all duration-500 ${
              backgroundMode === 'default' 
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' 
                : 'bg-white/20 dark:bg-white/5 border-white/20 dark:border-white/5 backdrop-blur-xl'
            }`}>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Palette size={20} className="text-indigo-600" />
                Appearance
              </h3>

              <div className="space-y-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div>
                    <h4 className="font-bold dark:text-white">Dark Mode</h4>
                    <p className="text-sm text-slate-500">Toggle between light and dark themes</p>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`w-14 h-8 rounded-full transition-all relative ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${theme === 'dark' ? 'right-1' : 'left-1 shadow-sm'}`} />
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 mx-1">Atmosphere</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {atmosphereOptions.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setBackgroundMode(opt.id as any)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                          backgroundMode === opt.id 
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full ${opt.color} shadow-sm`} />
                        <span className="text-[10px] font-bold dark:text-white uppercase tracking-tighter">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Logout Button */}
            <button 
              onClick={() => auth.signOut()}
              className="w-full py-4 border-2 border-red-100 dark:border-red-900/20 text-red-600 font-black rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
