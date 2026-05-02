import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

type Theme = 'light' | 'dark';
type BackgroundMode = 'default' | 'aurora' | 'calm' | 'neon' | 'misty';

interface ThemeContextType {
  theme: Theme;
  backgroundMode: BackgroundMode;
  toggleTheme: () => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('pvchat-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  const [backgroundMode, setBackgroundModeState] = useState<BackgroundMode>(() => {
    const saved = localStorage.getItem('pvchat-bg-mode');
    if (['default', 'aurora', 'calm', 'neon', 'misty'].includes(saved || '')) return saved as BackgroundMode;
    return 'default';
  });

  // Sync with Firestore profile
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const profileRef = doc(db, 'profiles', user.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.backgroundMode && ['default', 'aurora', 'calm', 'neon', 'misty'].includes(data.backgroundMode)) {
              setBackgroundModeState(data.backgroundMode);
            }
          }
        });
        return () => unsubscribeProfile();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const setBackgroundMode = async (mode: BackgroundMode) => {
    setBackgroundModeState(mode);
    localStorage.setItem('pvchat-bg-mode', mode);
    
    // Sync with Firestore if logged in
    if (auth.currentUser) {
      try {
        const profileRef = doc(db, 'profiles', auth.currentUser.uid);
        await updateDoc(profileRef, { backgroundMode: mode });
      } catch (err) {
        console.error("Failed to sync background mode to Firestore:", err);
      }
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    
    [root, body].forEach(el => {
      if (el) {
        el.classList.remove('light', 'dark');
        el.classList.add(theme);
        el.style.colorScheme = theme;
        
        // Handle background modes
        el.classList.remove('bg-aurora', 'bg-calm', 'bg-neon', 'bg-misty');
        if (backgroundMode !== 'default') {
          el.classList.add(`bg-${backgroundMode}`);
        }
      }
    });

    localStorage.setItem('pvchat-theme', theme);
  }, [theme, backgroundMode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, backgroundMode, toggleTheme, setBackgroundMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
