import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Notice } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, Search, Filter, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'normal' | 'low'>('all');

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredNotices = notices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                         n.message.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || n.priority === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2 underline underline-offset-4 decoration-white/20">University Board</h2>
          <h1 className="text-5xl font-bold tracking-tight">Institutional Notices</h1>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
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
                    <span className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest ml-auto">
                      ID: {notice.id.slice(0, 8)}
                    </span>
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

        {filteredNotices.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Megaphone className="w-10 h-10 text-neutral-700" />
            </div>
            <h3 className="text-xl font-medium text-neutral-300">No notices found</h3>
            <p className="text-neutral-500 mt-2">Try adjusting your search or filters.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
