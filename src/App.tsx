/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from './lib/firebase';
import { UserProfile } from './types';

// Pages
import Dashboard from './pages/Dashboard';
import Notices from './pages/Notices';
import Lectures from './pages/Lectures';
import Notes from './pages/Notes';
import Suggestions from './pages/Suggestions';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Layout from './components/Layout';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refreshProfile: async () => {} });

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser.uid);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
        <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-widest uppercase opacity-50">Preparing your dashboard...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshProfile }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/lectures" element={<Lectures />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/suggestions" element={<Suggestions />} />
            <Route path="/admin" element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/" />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

