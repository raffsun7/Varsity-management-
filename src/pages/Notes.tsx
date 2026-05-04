import { useState, useEffect, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Note, OperationType } from '../types';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Search, HardDrive, Tag, Plus, Edit3, Trash2, X } from 'lucide-react';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Admin State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', courseName: '', fileUrl: '', visibility: 'public' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const data = {
        title: formData.title,
        courseName: formData.courseName,
        fileUrl: formData.fileUrl,
        visibility: formData.visibility,
        updatedAt: serverTimestamp()
      };

      if (editingNote) {
        await updateDoc(doc(db, 'notes', editingNote.id), data);
      } else {
        const docRef = await addDoc(collection(db, 'notes'), { 
          ...data, 
          uploadedBy: user?.name || 'Admin',
          createdAt: serverTimestamp() 
        });

        // Notify all students
        await addDoc(collection(db, 'notifications'), {
          userId: 'student_all',
          title: 'New Study Materials',
          message: `Admin uploaded new notes: "${formData.title}"`,
          isRead: false,
          createdAt: serverTimestamp(),
          relatedId: docRef.id,
          type: 'new_note'
        });
      }
      closeModal();
    } catch (err) {
      handleFirestoreError(err, editingNote ? OperationType.UPDATE : OperationType.CREATE, editingNote ? `notes/${editingNote.id}` : 'notes');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await deleteDoc(doc(db, 'notes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notes/${id}`);
    }
  };

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({ title: note.title, courseName: note.courseName, fileUrl: note.fileUrl, visibility: note.visibility });
    } else {
      setEditingNote(null);
      setFormData({ title: '', courseName: '', fileUrl: '', visibility: 'public' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2 underline underline-offset-4 decoration-white/20">Resource Repository</h2>
          <h1 className="text-5xl font-bold tracking-tight">Academic Notes</h1>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {user?.role === 'admin' && (
            <button 
              onClick={() => openModal()}
              className="h-12 px-6 bg-white text-black rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 shrink-0"
            >
              <Plus className="w-5 h-5" /> Upload Material
            </button>
          )}

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
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {filteredNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-[#111111] border border-white/5 rounded-[28px] p-6 hover:border-white/20 transition-all duration-300 flex flex-col justify-between relative"
          >
            {user?.role === 'admin' && (
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(note)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-all">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(note.id)} className="p-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-500 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

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
                <span>UPLOADED BY {note.uploadedBy?.split(' ')[0] || 'ADMIN'}</span>
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

      {/* Admin Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" onClick={closeModal} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[40px] p-12 z-[101] shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-3xl font-bold tracking-tight">{editingNote ? 'Edit Notes' : 'New Material'}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Title</label>
                  <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Course Name</label>
                    <input required type="text" value={formData.courseName} onChange={(e) => setFormData({...formData, courseName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Visibility</label>
                    <select value={formData.visibility} onChange={(e) => setFormData({...formData, visibility: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm appearance-none">
                      <option value="public">Public</option>
                      <option value="restricted">Restricted</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">File Link (URL)</label>
                  <input required type="url" value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                </div>
                <button disabled={processing} className="w-full h-16 bg-white text-black rounded-2xl font-bold">{processing ? 'Processing...' : 'Upload Resource'}</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
