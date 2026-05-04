import { useState, useEffect, FormEvent, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useAuth } from '../App';
import { Suggestion, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Send, Filter, Clock, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton, NoticeSkeleton } from '../components/Skeleton';
import { useSearchParams } from 'react-router-dom';

export default function Suggestions() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<'notice' | 'lecture' | 'note'>('note');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // If we have a highlight ID, we need to find which tab it belongs to
    if (highlightId && loading) {
      const qAll = query(collection(db, 'suggestions'), where('createdBy', '==', user.uid));
      onSnapshot(qAll, (snapshot) => {
        const allSgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion));
        const highlighted = allSgs.find(s => s.id === highlightId);
        if (highlighted) {
          setActiveTab(highlighted.status);
        }
      });
    }

    let q;
    if (user.role === 'admin') {
      q = query(collection(db, 'suggestions'), where('status', '==', activeTab), orderBy('timestamp', 'desc'));
    } else {
      q = query(
        collection(db, 'suggestions'), 
        where('createdBy', '==', user.uid),
        where('status', '==', activeTab),
        orderBy('timestamp', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion)));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, activeTab, highlightId]);

  useEffect(() => {
    if (!loading && highlightId && itemRefs.current[highlightId]) {
      setTimeout(() => {
        itemRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [loading, highlightId, suggestions]);

  if (loading) {
    return (
      <div className="space-y-12">
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full rounded-[24px]" />
          </div>
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-10 w-48" />
            </div>
            <div className="space-y-4">
              <NoticeSkeleton />
              <NoticeSkeleton />
            </div>
          </div>
        </section>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle || !newContent) return;

    setSubmitting(true);
    try {
      const suggestionRef = await addDoc(collection(db, 'suggestions'), {
        title: newTitle,
        content: newContent,
        type: newType,
        createdBy: user.uid,
        creatorName: user.name,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Notify Admins
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin_all',
        title: 'New Student Suggestion',
        message: `${user.name} submitted a new ${newType}: "${newTitle}"`,
        isRead: false,
        createdAt: serverTimestamp(),
        relatedId: suggestionRef.id,
        type: 'new_suggestion',
        fromName: user.name
      });
      setNewTitle('');
      setNewContent('');
      setNewType('note');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'suggestions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to retract this suggestion?')) return;
    try {
      await deleteDoc(doc(db, 'suggestions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `suggestions/${id}`);
    }
  };

  return (
    <div className="space-y-12">
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        {/* Submit Form */}
        <div className="lg:col-span-2">
          <div className="sticky top-12">
            <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2">Contribution Layer</h2>
            <h1 className="text-4xl font-bold tracking-tight mb-8">Suggest Content</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-600 ml-4">Suggestion Title</label>
                <input 
                  required
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Request for Advanced Python Lecture"
                  className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/20 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-600 ml-4">Content Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['note', 'lecture', 'notice'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`h-12 rounded-xl text-xs font-medium capitalize transition-all border ${
                        newType === t ? 'bg-white text-black border-white' : 'bg-transparent text-neutral-500 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-neutral-600 ml-4">Description / Details</label>
                <textarea 
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Provide details about your suggestion..."
                  className="w-full bg-[#111111] border border-white/5 rounded-[24px] p-6 text-sm focus:outline-none focus:border-white/20 transition-all resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full h-14 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Publish Suggestion</>}
              </button>
            </form>
          </div>
        </div>

        {/* History / Status Feed */}
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-xl font-semibold flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-neutral-400" />
              Your Suggestions
            </h3>
            
            <div className="flex bg-[#111111] rounded-xl p-1">
              {(['pending', 'approved', 'rejected'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === t ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {suggestions.map((sg) => (
              <motion.div
                key={sg.id}
                ref={el => itemRefs.current[sg.id] = el}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  borderColor: highlightId === sg.id ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                  backgroundColor: highlightId === sg.id ? 'rgba(255, 255, 255, 0.03)' : 'rgba(17, 17, 17, 1)',
                  scale: highlightId === sg.id ? 1.02 : 1
                }}
                transition={{ duration: 0.5 }}
                className={`p-6 rounded-3xl border transition-all group ${
                  highlightId === sg.id ? 'ring-2 ring-white/20' : ''
                } hover:border-white/10`}
              >
                <div className="flex justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{sg.type}</span>
                      <span className="text-xs text-neutral-700 font-mono">ID: {sg.id.slice(0, 6)}</span>
                    </div>
                    <h4 className="text-lg font-semibold">{sg.title}</h4>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {sg.status === 'pending' && <span className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg"><AlertCircle className="w-4 h-4" /></span>}
                    {sg.status === 'approved' && <span className="p-2 bg-green-500/10 text-green-500 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>}
                    {sg.status === 'rejected' && <span className="p-2 bg-red-500/10 text-red-500 rounded-lg"><XCircle className="w-4 h-4" /></span>}
                  </div>
                </div>

                <p className="text-sm text-neutral-400 mb-4 line-clamp-3 leading-relaxed">{sg.content}</p>

                {sg.feedback && (
                  <div className="p-4 rounded-xl bg-white/5 border-l-2 border-white/20 mb-4">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 mb-1">Admin Feedback</p>
                    <p className="text-sm text-neutral-300 italic">"{sg.feedback}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <Clock className="w-3 h-3" />
                    {sg.timestamp?.toDate ? format(sg.timestamp.toDate(), 'MMM d, h:mm a') : 'Pending...'}
                  </div>
                  {sg.status === 'pending' && (
                    <button 
                      onClick={() => handleDelete(sg.id)}
                      className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}

            {suggestions.length === 0 && !loading && (
              <div className="py-12 text-center text-neutral-600">
                <p>No suggestions in this category.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
