import { useState, useEffect, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Notice, OperationType } from '../types';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Search, Filter, Clock, Plus, Trash2, Edit3, X } from 'lucide-react';
import { format } from 'date-fns';
import { NoticeSkeleton } from '../components/Skeleton';

export default function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'normal' | 'low'>('all');
  
  // Admin State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({ title: '', message: '', priority: 'normal' as any, audience: 'All Students' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-12">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-pulse">
          <div className="space-y-4 w-64">
            <div className="h-4 bg-white/5 rounded-full w-24" />
            <div className="h-10 bg-white/5 rounded-full" />
          </div>
          <div className="h-12 bg-white/5 rounded-2xl w-80" />
        </section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <NoticeSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (editingNotice) {
        await updateDoc(doc(db, 'notices', editingNotice.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'notices'), {
          ...formData,
          createdAt: serverTimestamp()
        });

        // Notify all students
        await addDoc(collection(db, 'notifications'), {
          userId: 'student_all',
          title: 'Official Notice Issued',
          message: `Admin published a new notice: "${formData.title}"`,
          isRead: false,
          createdAt: serverTimestamp(),
          relatedId: docRef.id,
          type: 'new_notice'
        });
      }
      closeModal();
    } catch (err) {
      handleFirestoreError(err, editingNotice ? OperationType.UPDATE : OperationType.CREATE, editingNotice ? `notices/${editingNotice.id}` : 'notices');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteDoc(doc(db, 'notices', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notices/${id}`);
    }
  };

  const openModal = (notice?: Notice) => {
    if (notice) {
      setEditingNotice(notice);
      setFormData({ title: notice.title, message: notice.message, priority: notice.priority, audience: notice.audience });
    } else {
      setEditingNotice(null);
      setFormData({ title: '', message: '', priority: 'normal', audience: 'All Students' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
  };

  const filteredNotices = notices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                         n.message.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || n.priority === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-12 pb-20">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2 underline underline-offset-4 decoration-white/20">University Board</h2>
          <h1 className="text-5xl font-bold tracking-tight">Institutional Notices</h1>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {user?.role === 'admin' && (
            <button 
              onClick={() => openModal()}
              className="h-12 px-6 bg-white text-black rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 shrink-0"
            >
              <Plus className="w-5 h-5" /> Create Notice
            </button>
          )}

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#111111] border border-white/5 rounded-2xl pl-12 pr-6 h-12 w-64 text-sm focus:outline-none focus:border-white/20 focus:bg-[#1a1a1a] transition-all"
            />
          </div>
          
          <div className="flex bg-[#111111] border border-white/5 rounded-2xl p-1 gap-1">
            {(['all', 'urgent', 'normal', 'low'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 h-10 rounded-[14px] text-xs font-medium capitalize transition-all ${
                  filter === f ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence initial={false}>
          {filteredNotices.map((notice) => (
            <motion.div
              key={notice.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group p-8 rounded-[32px] bg-[#111111] border border-white/5 hover:bg-[#151515] hover:border-white/10 transition-all duration-300 relative"
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                  <Megaphone className={`w-8 h-8 ${notice.priority === 'urgent' ? 'text-white' : 'text-neutral-500'}`} />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                      notice.priority === 'urgent' ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {notice.priority} Priority
                    </span>
                    <span className="text-xs text-neutral-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      {notice.createdAt?.toDate ? format(notice.createdAt.toDate(), 'MMMM d, yyyy · p') : 'Pending publishing'}
                    </span>
                    
                    {user?.role === 'admin' && (
                      <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(notice)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(notice.id)}
                          className="p-2 bg-red-500/5 hover:bg-red-500/20 rounded-lg text-red-400/60 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold tracking-tight mb-3 group-hover:text-white transition-colors">{notice.title}</h3>
                    <p className="text-neutral-400 leading-relaxed text-lg max-w-4xl whitespace-pre-wrap">
                      {notice.message}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center gap-6 text-xs text-neutral-500 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
                      Audience: <span className="text-neutral-300">{notice.audience}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[40px] p-12 z-[101] shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold tracking-tight">{editingNotice ? 'Edit Notice' : 'New Notice'}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Notice Headline</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter short, punchy title"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Priority</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm appearance-none"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Target Audience</label>
                    <input 
                      value={formData.audience}
                      onChange={(e) => setFormData({...formData, audience: e.target.value})}
                      placeholder="e.g. All Students"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Full Message</label>
                  <textarea 
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Detailed notice information..."
                    className="w-full bg-white/5 border border-white/10 rounded-[32px] p-6 text-sm focus:outline-none focus:border-white/30 transition-all resize-none"
                  />
                </div>

                <button 
                  disabled={processing}
                  className="w-full h-16 bg-white text-black rounded-2xl font-bold hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 text-lg"
                >
                  {processing ? 'Processing...' : (editingNotice ? 'Update Notice' : 'Publish Notice')}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
