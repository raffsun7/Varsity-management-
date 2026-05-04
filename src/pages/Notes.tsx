import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Note } from '../types';
import { motion } from 'motion/react';
import { FileText, Download, Search, HardDrive, Tag } from 'lucide-react';

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2 underline underline-offset-4 decoration-white/20">Resource Repository</h2>
          <h1 className="text-5xl font-bold tracking-tight">Academic Notes</h1>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search study materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111111] border border-white/5 rounded-2xl pl-12 pr-6 h-12 w-80 text-sm focus:outline-none focus:border-white/20 focus:bg-[#1a1a1a] transition-all"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-[#111111] border border-white/5 rounded-[28px] p-6 hover:border-white/20 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-neutral-500 group-hover:text-white group-hover:bg-white/10 transition-all">
                <FileText className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-bold mb-1 truncate group-hover:text-white transition-colors">{note.title}</h3>
              <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-bold uppercase tracking-widest mb-4">
                <Tag className="w-3 h-3" />
                {note.courseName}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="capitalize">{note.visibility}</span>
                <span>PDF · 2.4 MB</span>
              </div>
              
              <a 
                href={note.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full h-11 bg-white/5 hover:bg-white text-neutral-400 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </motion.div>
        ))}

        {filteredNotes.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <HardDrive className="w-10 h-10 text-neutral-800" />
            </div>
            <h3 className="text-xl font-medium text-neutral-300">No resources matched</h3>
            <p className="text-neutral-500 mt-2">The vault is currently empty or doesn't match your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
