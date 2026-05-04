import { useState, useEffect, FormEvent, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { Suggestion, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Check, X, MessageSquare, ExternalLink, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton, NoticeSkeleton } from '../components/Skeleton';
import { useSearchParams } from 'react-router-dom';

export default function AdminPanel() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');
  
  const [pendingSuggestions, setPendingSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'reviews' | 'create'>('reviews');
  
  const itemRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Review State
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewFormData, setReviewFormData] = useState({
    title: '',
    content: '',
    courseName: 'General',
    week: '1',
    videoUrl: '',
    fileUrl: '',
    priority: 'normal'
  });
  const [processing, setProcessing] = useState(false);

  const startReview = (sg: Suggestion) => {
    setReviewingId(sg.id);
    setReviewFormData({
      title: sg.title,
      content: sg.content,
      courseName: 'General',
      week: '1',
      videoUrl: '',
      fileUrl: '',
      priority: 'normal'
    });
    setFeedback('');
  };

  // Creation State
  const [publishType, setPublishType] = useState<'notice' | 'lecture' | 'note'>('notice');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    courseName: '',
    week: '1',
    priority: 'normal',
    audience: 'all',
    fileUrl: '',
    videoUrl: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'suggestions'), 
      where('status', '==', 'pending'),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingSuggestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Suggestion)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (highlightId) {
      setActiveView('reviews');
    }
  }, [highlightId]);

  useEffect(() => {
    if (!loading && highlightId && itemRefs.current[highlightId]) {
      setTimeout(() => {
        itemRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [loading, highlightId]);

  if (loading) {
    return (
      <div className="space-y-12 pb-20">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-14 w-64 rounded-2xl" />
        </section>
        <div className="space-y-6">
          <NoticeSkeleton />
          <NoticeSkeleton />
        </div>
      </div>
    );
  }

  const handleAction = async (suggestion: Suggestion, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'suggestions', suggestion.id), {
        status,
        feedback: feedback || null,
        processedAt: serverTimestamp()
      });

      if (status === 'approved') {
        let createdDocId = '';
        if (suggestion.type === 'notice') {
          const docRef = await addDoc(collection(db, 'notices'), {
            title: reviewFormData.title,
            message: reviewFormData.content,
            priority: reviewFormData.priority,
            audience: 'all',
            createdAt: serverTimestamp()
          });
          createdDocId = docRef.id;
        } else if (suggestion.type === 'lecture') {
          const docRef = await addDoc(collection(db, 'lectures'), {
            title: reviewFormData.title,
            description: reviewFormData.content,
            courseName: reviewFormData.courseName,
            week: parseInt(reviewFormData.week) || 1,
            videoUrl: reviewFormData.videoUrl,
            fileUrl: reviewFormData.fileUrl,
            createdAt: serverTimestamp()
          });
          createdDocId = docRef.id;
        } else if (suggestion.type === 'note') {
          const docRef = await addDoc(collection(db, 'notes'), {
            title: reviewFormData.title,
            courseName: reviewFormData.courseName,
            fileUrl: reviewFormData.fileUrl,
            uploadedBy: suggestion.creatorName,
            visibility: 'public',
            createdAt: serverTimestamp()
          });
          createdDocId = docRef.id;
        }

        // Notify all students about new content
        await addDoc(collection(db, 'notifications'), {
          userId: 'student_all',
          title: `New ${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} Available`,
          message: `Official ${suggestion.type} "${reviewFormData.title}" has been published.`,
          isRead: false,
          createdAt: serverTimestamp(),
          relatedId: createdDocId,
          type: `new_${suggestion.type}`
        });
      }

      await addDoc(collection(db, 'notifications'), {
        userId: suggestion.createdBy,
        title: `Suggestion ${status}`,
        message: `Your suggestion "${suggestion.title}" has been ${status}.`,
        isRead: false,
        createdAt: serverTimestamp(),
        relatedId: suggestion.id,
        type: 'suggestion_update'
      });

      setReviewingId(null);
      setFeedback('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `suggestions/${suggestion.id}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectPublish = async (e: FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      let createdDocId = '';
      if (publishType === 'notice') {
        const docRef = await addDoc(collection(db, 'notices'), {
          title: formData.title,
          message: formData.content,
          priority: formData.priority,
          audience: formData.audience,
          createdAt: serverTimestamp()
        });
        createdDocId = docRef.id;
      } else if (publishType === 'lecture') {
        const docRef = await addDoc(collection(db, 'lectures'), {
          title: formData.title,
          description: formData.content,
          courseName: formData.courseName,
          week: parseInt(formData.week),
          videoUrl: formData.videoUrl,
          fileUrl: formData.fileUrl,
          createdAt: serverTimestamp()
        });
        createdDocId = docRef.id;
      } else if (publishType === 'note') {
        const docRef = await addDoc(collection(db, 'notes'), {
          title: formData.title,
          fileUrl: formData.fileUrl,
          courseName: formData.courseName,
          visibility: 'public',
          uploadedBy: 'admin',
          createdAt: serverTimestamp()
        });
        createdDocId = docRef.id;
      }

      // Notify all students
      await addDoc(collection(db, 'notifications'), {
        userId: 'student_all',
        title: `New ${publishType.charAt(0).toUpperCase() + publishType.slice(1)} Published`,
        message: `Admin published a new ${publishType}: "${formData.title}"`,
        isRead: false,
        createdAt: serverTimestamp(),
        relatedId: createdDocId,
        type: `new_${publishType}`
      });
      
      setFormData({
        title: '',
        content: '',
        courseName: '',
        week: '1',
        priority: 'normal',
        audience: 'all',
        fileUrl: '',
        videoUrl: ''
      });
      alert('Content published successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, publishType === 'notice' ? 'notices' : publishType === 'lecture' ? 'lectures' : 'notes');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2">Institutional Review</h2>
          <h1 className="text-5xl font-bold tracking-tight mb-4">Admin Dashboard</h1>
          <p className="text-neutral-400 max-w-xl">
            Review community contributions or publish official institutional materials directly.
          </p>
        </div>
        
        <div className="flex bg-[#111111] border border-white/5 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveView('reviews')}
            className={`px-6 h-12 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeView === 'reviews' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Review Queue ({pendingSuggestions.length})
          </button>
          <button 
            onClick={() => setActiveView('create')}
            className={`px-6 h-12 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeView === 'create' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
            }`}
          >
            Direct Publish
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-12">
        {activeView === 'reviews' ? (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {pendingSuggestions.map((sg) => (
                <motion.div
                  key={sg.id}
                  ref={el => itemRefs.current[sg.id] = el}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ 
                    opacity: 1, 
                    scale: highlightId === sg.id ? 1.02 : 1,
                    borderColor: highlightId === sg.id ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.05)',
                    backgroundColor: highlightId === sg.id ? 'rgba(255, 255, 255, 0.03)' : 'rgba(17, 17, 17, 1)',
                  }}
                  transition={{ duration: 0.5 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`border rounded-[40px] p-8 md:p-12 transition-all duration-300 ${
                    highlightId === sg.id ? 'ring-2 ring-white/20' : ''
                  }`}
                >
                  <div className="space-y-8">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full bg-white/5 text-neutral-400">
                        {sg.type} Suggestion
                      </span>
                      <span className="text-xs text-neutral-700 font-mono">
                        UID: {sg.id.slice(0, 12)}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] uppercase font-bold text-neutral-400">
                          {sg.creatorName.slice(0, 1)}
                        </div>
                        <span className="text-xs text-neutral-500">by {sg.creatorName}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-3xl font-bold tracking-tight">{sg.title}</h4>
                      <p className="text-neutral-400 text-lg leading-relaxed whitespace-pre-wrap">{sg.content}</p>
                    </div>

                    {reviewingId === sg.id ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-8 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Final Title</label>
                            <input 
                              type="text"
                              value={reviewFormData.title}
                              onChange={(e) => setReviewFormData({...reviewFormData, title: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30"
                            />
                          </div>

                          {sg.type === 'notice' ? (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Priority</label>
                              <select 
                                value={reviewFormData.priority}
                                onChange={(e) => setReviewFormData({...reviewFormData, priority: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm appearance-none focus:outline-none focus:border-white/30"
                              >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Course Name</label>
                              <input 
                                type="text"
                                placeholder="General"
                                value={reviewFormData.courseName}
                                onChange={(e) => setReviewFormData({...reviewFormData, courseName: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30"
                              />
                            </div>
                          )}
                        </div>

                        {sg.type !== 'note' && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Modified Description</label>
                            <textarea 
                              rows={4}
                              value={reviewFormData.content}
                              onChange={(e) => setReviewFormData({...reviewFormData, content: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm focus:outline-none focus:border-white/30 transition-all resize-none"
                            />
                          </div>
                        )}

                        {sg.type === 'lecture' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Week</label>
                              <input 
                                type="number"
                                value={reviewFormData.week}
                                onChange={(e) => setReviewFormData({...reviewFormData, week: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">YouTube/Video URL</label>
                              <input 
                                type="url"
                                placeholder="https://youtube.com/..."
                                value={reviewFormData.videoUrl}
                                onChange={(e) => setReviewFormData({...reviewFormData, videoUrl: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30"
                              />
                            </div>
                          </div>
                        )}

                        {(sg.type === 'lecture' || sg.type === 'note') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Material/Drive URL</label>
                            <input 
                              type="url"
                              placeholder="https://drive.google.com/..."
                              value={reviewFormData.fileUrl}
                              onChange={(e) => setReviewFormData({...reviewFormData, fileUrl: e.target.value})}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/30"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Admin Feedback (to Student)</label>
                          <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Optionally provide context for your decision..."
                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm focus:outline-none focus:border-white/30 transition-all resize-none min-h-[100px]"
                          />
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                          <button
                            disabled={processing}
                            onClick={() => handleAction(sg, 'approved')}
                            className="flex-1 h-16 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all group"
                          >
                            <Check className="w-5 h-5 group-hover:scale-110 transition-transform" /> Approve & Finalize
                          </button>
                          <button
                            disabled={processing}
                            onClick={() => handleAction(sg, 'rejected')}
                            className="h-16 px-12 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-all"
                          >
                            <X className="w-5 h-5" /> Reject
                          </button>
                          <button onClick={() => setReviewingId(null)} className="h-16 px-8 bg-white/5 text-neutral-400 rounded-2xl">Cancel</button>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="pt-8 border-t border-white/5">
                        <button
                          onClick={() => startReview(sg)}
                          className="h-14 px-10 bg-white text-black rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-5 h-5" /> Open Review
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {pendingSuggestions.length === 0 && (
              <div className="py-32 text-center bg-[#111111] border border-white/5 rounded-[40px]">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-800">
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold brightness-125">All Caught Up</h3>
                <p className="text-neutral-500 mt-2">The suggestion queue is empty.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
             <div className="lg:col-span-2 space-y-8">
               <div className="space-y-4">
                 <h3 className="text-xl font-bold">Content Type</h3>
                 <div className="space-y-2">
                   {(['notice', 'lecture', 'note'] as const).map((t) => (
                     <button
                       key={t}
                       onClick={() => setPublishType(t)}
                       className={`w-full p-6 rounded-2xl border text-left transition-all ${
                         publishType === t ? 'bg-white text-black border-white' : 'bg-[#111111] text-neutral-500 border-white/5 hover:border-white/20'
                       }`}
                     >
                       <h4 className="font-bold capitalize">{t}</h4>
                       <p className={`text-xs ${publishType === t ? 'text-black/60' : 'text-neutral-600'}`}>
                         {t === 'notice' && 'Public announcement for students/staff'}
                         {t === 'lecture' && 'Academic video or module content'}
                         {t === 'note' && 'Downloadable study material (PDF)'}
                       </p>
                     </button>
                   ))}
                 </div>
               </div>
             </div>

             <form onSubmit={handleDirectPublish} className="lg:col-span-3 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Title</label>
                  <input 
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={`Headline for your ${publishType}...`}
                    className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>

                {publishType !== 'note' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Detailed Content</label>
                    <textarea 
                      required
                      rows={6}
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      placeholder="Write the full message or description here..."
                      className="w-full bg-[#111111] border border-white/5 rounded-[32px] p-6 text-sm focus:outline-none focus:border-white/20 transition-all resize-none"
                    />
                  </div>
                )}

                {(publishType === 'lecture' || publishType === 'note') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Course Name</label>
                      <input 
                        required
                        type="text"
                        value={formData.courseName}
                        onChange={(e) => setFormData({...formData, courseName: e.target.value})}
                        placeholder="e.g. CS101"
                        className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm"
                      />
                    </div>
                    {publishType === 'lecture' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Week Number</label>
                        <input 
                          required
                          type="number"
                          value={formData.week}
                          onChange={(e) => setFormData({...formData, week: e.target.value})}
                          className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}

                {(publishType === 'lecture' || publishType === 'note') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">File/Video URL</label>
                    <input 
                      required
                      type="url"
                      value={publishType === 'lecture' ? formData.videoUrl : formData.fileUrl}
                      onChange={(e) => setFormData({
                        ...formData, 
                        [publishType === 'lecture' ? 'videoUrl' : 'fileUrl']: e.target.value
                      })}
                      placeholder="https://..."
                      className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm"
                    />
                  </div>
                )}

                {publishType === 'notice' && (
                   <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Priority</label>
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm appearance-none"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Audience</label>
                      <input 
                        value={formData.audience}
                        onChange={(e) => setFormData({...formData, audience: e.target.value})}
                        placeholder="e.g. All Students"
                        className="w-full bg-[#111111] border border-white/5 rounded-2xl px-6 h-14 text-sm"
                      />
                    </div>
                  </div>
                )}

                <button 
                  disabled={processing}
                  className="w-full h-16 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 mt-4"
                >
                  <ShieldCheck className="w-5 h-5" />
                  {processing ? 'Processing...' : `Confirm & Publish ${publishType}`}
                </button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}

