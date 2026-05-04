import { useState, useEffect, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Lecture, OperationType } from '../types';
import { useAuth } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Play, FileText, Search, BookOpen, Plus, Edit3, Trash2, X } from 'lucide-react';

export default function Lectures() {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Admin State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    courseName: '', 
    week: 1, 
    videoUrl: '', 
    fileUrl: '' 
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLectures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
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
        description: formData.description,
        courseName: formData.courseName,
        week: Number(formData.week),
        videoUrl: formData.videoUrl,
        fileUrl: formData.fileUrl,
        updatedAt: serverTimestamp()
      };

      if (editingLecture) {
        await updateDoc(doc(db, 'lectures', editingLecture.id), data);
      } else {
        const docRef = await addDoc(collection(db, 'lectures'), { ...data, createdAt: serverTimestamp() });
        
        // Notify all students
        await addDoc(collection(db, 'notifications'), {
          userId: 'student_all',
          title: 'New Lecture Available',
          message: `Admin published a new lecture: "${formData.title}"`,
          isRead: false,
          createdAt: serverTimestamp(),
          relatedId: docRef.id,
          type: 'new_lecture'
        });
      }
      closeModal();
    } catch (err) {
      handleFirestoreError(err, editingLecture ? OperationType.UPDATE : OperationType.CREATE, editingLecture ? `lectures/${editingLecture.id}` : 'lectures');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    try {
      await deleteDoc(doc(db, 'lectures', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lectures/${id}`);
    }
  };

  const openModal = (lecture?: Lecture) => {
    if (lecture) {
      setEditingLecture(lecture);
      setFormData({ 
        title: lecture.title, 
        description: lecture.description || '', 
        courseName: lecture.courseName, 
        week: lecture.week, 
        videoUrl: lecture.videoUrl || '', 
        fileUrl: lecture.fileUrl || '' 
      });
    } else {
      setEditingLecture(null);
      setFormData({ title: '', description: '', courseName: '', week: 1, videoUrl: '', fileUrl: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLecture(null);
  };

  const filteredLectures = lectures.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase()) || 
    l.courseName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2 underline underline-offset-4 decoration-white/20">Learning Space</h2>
          <h1 className="text-5xl font-bold tracking-tight">Lectures & Modules</h1>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {user?.role === 'admin' && (
            <button 
              onClick={() => openModal()}
              className="h-12 px-6 bg-white text-black rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 shrink-0"
            >
              <Plus className="w-5 h-5" /> Add Lecture
            </button>
          )}

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
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredLectures.map((lecture) => (
          <motion.div
            key={lecture.id}
            whileHover={{ y: -8 }}
            className="group bg-[#111111] border border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 transition-all duration-300 relative"
          >
            <div className="aspect-video bg-neutral-900 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
              <Video className="w-12 h-12 text-white/10 group-hover:scale-125 transition-transform duration-700" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {lecture.videoUrl ? (
                  <a 
                    href={lecture.videoUrl} 
                    target="_blank" 
                    rel="no-referrer"
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                  >
                    <Play className="w-6 h-6 text-black fill-black ml-1" />
                  </a>
                ) : (
                  <div className="p-4 bg-black/50 backdrop-blur-sm rounded-xl text-xs font-bold">No Video Available</div>
                )}
              </div>
              <div className="absolute bottom-4 left-6 z-20">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Week {lecture.week}</span>
              </div>

              {user?.role === 'admin' && (
                <div className="absolute top-4 right-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(lecture)} className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-white hover:text-black transition-all">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(lecture.id)} className="p-2 bg-red-500/20 backdrop-blur-md rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
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
                {lecture.videoUrl ? (
                  <a href={lecture.videoUrl} target="_blank" rel="no-referrer" className="flex-1 h-12 bg-white/5 hover:bg-white text-neutral-400 hover:text-black rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Play className="w-3 h-3" /> Watch Now
                  </a>
                ) : (
                  <div className="flex-1 h-12 bg-white/5 text-neutral-600 rounded-xl text-xs font-bold flex items-center justify-center">No Video</div>
                )}
                {lecture.fileUrl && (
                  <a href={lecture.fileUrl} target="_blank" rel="no-referrer" className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white transition-all">
                    <FileText className="w-4 h-4" />
                  </a>
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
                <h3 className="text-3xl font-bold tracking-tight">{editingLecture ? 'Edit Lecture' : 'New Lecture'}</h3>
                <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-xl text-neutral-500"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Lecture Title</label>
                  <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Course Name</label>
                    <input required type="text" value={formData.courseName} onChange={(e) => setFormData({...formData, courseName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Week Number</label>
                    <input required type="number" value={formData.week} onChange={(e) => setFormData({...formData, week: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Video URL</label>
                  <input type="url" value={formData.videoUrl} onChange={(e) => setFormData({...formData, videoUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">File/PDF URL</label>
                  <input type="url" value={formData.fileUrl} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Description</label>
                  <textarea rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-[32px] p-6 text-sm resize-none" />
                </div>
                <button disabled={processing} className="w-full h-16 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3">
                  {processing ? 'Processing...' : 'Save Lecture'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
