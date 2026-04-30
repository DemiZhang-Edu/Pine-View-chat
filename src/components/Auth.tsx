import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { LogIn, LogOut, UserPlus, Shield, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

export function Auth() {
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const toEmail = (user: string) => {
    // Convert username to hex to ensure it's a valid email local part regardless of special characters
    const encoder = new TextEncoder();
    const data = encoder.encode(user.toLowerCase().trim());
    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex}@pvchat.app`;
  };

  const syncUser = async (user: any, usernameStr: string) => {
    // Check if user already has a username to avoid overwriting Google-derived one with something else
    // though in this flow we usually know what we are doing.
    
    // Private data
    await setDoc(doc(db, 'users', user.uid), {
      displayName: user.displayName || 'Anonymous',
      username: usernameStr,
      photoURL: user.photoURL || '',
      lastSeen: serverTimestamp(),
    }, { merge: true });

    // Public data for search
    await setDoc(doc(db, 'profiles', user.uid), {
      displayName: user.displayName || 'Anonymous',
      username: usernameStr,
      photoURL: user.photoURL || '',
      lastSeen: serverTimestamp(),
    }, { merge: true });
  };

  const signInWithProvider = async (provider: GoogleAuthProvider) => {
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        // Check if profile already exists to get the username
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        let existingUsername = '';
        
        if (userDoc.exists()) {
          existingUsername = userDoc.data().username;
        }

        if (!existingUsername) {
          // Derive username from email or uid if new user
          const base = result.user.email ? result.user.email.split('@')[0] : `user_${result.user.uid.slice(0, 5)}`;
          existingUsername = base.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        }

        await syncUser(result.user, existingUsername);
        setShowModal(false);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Relaxed validation for username
    if (username.length < 1) {
      setError('Please enter a username.');
      return;
    }

    try {
      const email = toEmail(username);
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await syncUser({ ...result.user, displayName }, username);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        await syncUser(result.user, username);
      }
      setShowModal(false);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This username is already taken. Please choose another.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Incorrect username or password.');
      } else {
        setError(error.message);
      }
    }
  };

  const logout = () => signOut(auth);

  if (auth.currentUser) {
    return (
      <button
        onClick={logout}
        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
        title="Sign Out"
      >
        <LogOut size={18} />
      </button>
    );
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
      >
        <LogIn size={16} /> Login
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border dark:border-slate-800"
            >
              <div className="p-8">
                <div className="flex flex-col items-center gap-6 mb-8 text-center">
                  <Logo className="scale-125" interactive={true} />
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {isSignUp ? 'Create PVChat ID' : 'Welcome Back'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {isSignUp ? 'Join the Pine View community' : 'Sign in to continue your conversations'}
                    </p>
                  </div>
                  <motion.button 
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowModal(false)}
                    className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    ✕
                  </motion.button>
                </div>

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      key="error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleAuth} className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {isSignUp && (
                      <motion.div
                        key="displayNameField"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                          <input
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                            placeholder="e.g. John Doe"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <motion.div layout>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Username</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 font-bold text-xs">@</div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                        placeholder="cooluser_123"
                      />
                    </div>
                  </motion.div>

                  <motion.div layout>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600"
                      placeholder="••••••••"
                    />
                  </motion.div>

                  <motion.div layout className="pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                      {isSignUp ? 'Join PVChat:)' : 'Enter PVChat:)'}
                    </motion.button>
                  </motion.div>
                </form>

                <motion.div layout className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-4">Or continue with</div>
                </motion.div>

                <motion.button
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => signInWithProvider(new GoogleAuthProvider())}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm active:scale-[0.98]"
                >
                  <ShieldCheck size={20} className="text-blue-500 dark:text-blue-400" /> Sign in with Google
                </motion.button>

                <motion.div layout className="mt-8 text-center" id="is-sign-up-toggle">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    {isSignUp ? 'Already a member? ' : "New here? "}
                    <button 
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="ml-1 text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-4 decoration-2"
                    >
                      {isSignUp ? 'Sign In' : 'Create ID'}
                    </button>
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
