import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lecture } from '../types';
import { motion } from 'motion/react';
import { Video, Play, FileText, Search, BookOpen } from 'lucide-react';

export default function Lectures() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLectures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredLectures = lectures.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase()) || 
    l.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2 underline underline-offset-4 decoration-white/20">Learning Space</h2>
          <h1 className="text-5xl font-bold tracking-tight">Lectures & Modules</h1>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search courses or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111111] border border-white/5 rounded-2xl pl-12 pr-6 h-12 w-80 text-sm focus:outline-none focus:border-white/20 focus:bg-[#1a1a1a] transition-all"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredLectures.map((lecture) => (
          <motion.div
            key={lecture.id}
            whileHover={{ y: -8 }}
            className="group bg-[#111111] border border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 transition-all duration-300"
          >
            <div className="aspect-video bg-neutral-900 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
              <Video className="w-12 h-12 text-white/10 group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl">
                  <Play className="w-6 h-6 text-black fill-black ml-1" />
                </div>
              </div>
              <div className="absolute bottom-4 left-6 z-20">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Week {lecture.week}</span>
              </div>
            </div>
            
            <div className="p-8 space-y-4">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-1">{lecture.courseName}</h4>
                <h3 className="text-xl font-bold group-hover:text-white transition-colors">{lecture.title}</h3>
              </div>
              
              <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed">
                {lecture.description || "A comprehensive deep dive into the subject architectural patterns and implementation details."}
              </p>

              <div className="flex items-center gap-3 pt-4">
                <button className="flex-1 h-12 bg-white/5 hover:bg-white text-neutral-400 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <Play className="w-3 h-3" /> Watch Now
                </button>
                {lecture.fileUrl && (
                  <button className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white transition-all">
                    <FileText className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {filteredLectures.length === 0 && !loading && (
          <div className="md:col-span-2 xl:col-span-3 py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-neutral-800" />
            </div>
            <h3 className="text-xl font-medium text-neutral-300">Library is quiet</h3>
            <p className="text-neutral-500 mt-2">Try a different search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
