import { motion } from 'motion/react';
import { signInWithGoogle } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      const user = result.user;

      // Check if user document exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create initial profile
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || 'New Scholar',
          email: user.email,
          role: 'student', // Default role
          department: 'General',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-white blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#111111] border border-white/5 rounded-[40px] p-12 text-center relative z-10 shadow-2xl"
      >
        <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center mb-10 shadow-xl shadow-white/5">
          <span className="text-black font-black text-4xl leading-none">U</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight mb-4 text-white">Welcome Back</h1>
        <p className="text-neutral-500 mb-10 leading-relaxed">
          The institutional hub for scholars. Sign in to access notices, lectures, and academic resources.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full group relative flex items-center justify-center gap-4 bg-white text-black h-16 rounded-2xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-10 text-xs text-neutral-600">
          By signing in, you agree to our <span className="text-neutral-400">Terms of Service</span> and <span className="text-neutral-400">Privacy Policy</span>.
        </p>
      </motion.div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-30">
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
        <p className="text-[10px] font-mono tracking-widest uppercase">Verified Institutional Platform</p>
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </div>
    </div>
  );
}
