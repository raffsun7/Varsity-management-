import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Suggestion } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Check, X, MessageSquare, ExternalLink, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminPanel() {
  const [pendingSuggestions, setPendingSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

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

  const handleAction = async (suggestion: Suggestion, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      // 1. Update suggestion status
      await updateDoc(doc(db, 'suggestions', suggestion.id), {
        status,
        feedback: feedback || null,
        processedAt: serverTimestamp()
      });

      // 2. If approved, create the actual content
      if (status === 'approved') {
        if (suggestion.type === 'notice') {
          await addDoc(collection(db, 'notices'), {
            title: suggestion.title,
            message: suggestion.content,
            priority: 'normal',
            audience: 'all',
            createdAt: serverTimestamp()
          });
        }
        // Lectures/Notes would follow similar logic if link is present in content
        // For simplicity in this demo, we'll just handle notices
      }

      // 3. Create notification for user
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
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <section>
        <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2">Internal Operations</h2>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Review Desk</h1>
        <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
          Moderate student and teacher contributions. Approved announcements are published to the main feed instantly.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6">
        <h3 className="text-xl font-semibold flex items-center gap-3 mb-2">
          <ShieldCheck className="w-5 h-5 text-neutral-400" />
          Pending Approvals ({pendingSuggestions.length})
        </h3>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {pendingSuggestions.map((sg) => (
              <motion.div
                key={sg.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-[#111111] border border-white/5 rounded-[32px] overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full text-neutral-400">
                          {sg.type} contribution
                        </span>
                        <span className="text-xs text-neutral-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {sg.timestamp?.toDate ? format(sg.timestamp.toDate(), 'MMM d, h:mm a') : 'Now'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-2xl font-bold mb-2">{sg.title}</h4>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] uppercase font-bold text-neutral-400">
                            {sg.creatorName.slice(0, 1)}
                          </div>
                          <span className="text-xs text-neutral-500">by {sg.creatorName}</span>
                        </div>
                        <p className="text-neutral-400 text-lg leading-relaxed whitespace-pre-wrap">{sg.content}</p>
                      </div>

                      {reviewingId === sg.id ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 pt-6 mt-6 border-t border-white/5"
                        >
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 ml-4">Decision Feedback (Optional)</label>
                            <textarea 
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="Reason for approval or rejection..."
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-white/30 transition-all resize-none"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={processing}
                              onClick={() => handleAction(sg, 'approved')}
                              className="flex-1 h-14 bg-green-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-all disabled:opacity-50"
                            >
                              <Check className="w-5 h-5" /> Approve & Publish
                            </button>
                            <button
                              disabled={processing}
                              onClick={() => handleAction(sg, 'rejected')}
                              className="flex-1 h-14 bg-red-500/10 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all border border-red-500/20 disabled:opacity-50"
                            >
                              <X className="w-5 h-5" /> Reject Suggestion
                            </button>
                            <button
                              onClick={() => setReviewingId(null)}
                              className="h-14 px-6 bg-white/5 text-neutral-400 rounded-2xl font-medium hover:bg-white/10 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
                          <button
                            onClick={() => {
                              setReviewingId(sg.id);
                              setFeedback('');
                            }}
                            className="h-12 px-8 bg-white text-black rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                          >
                            <MessageSquare className="w-4 h-4" /> Start Review
                          </button>
                          <button className="h-12 px-6 bg-white/5 text-neutral-400 rounded-xl font-medium hover:bg-white/10 transition-all flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> View Thread
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {pendingSuggestions.length === 0 && !loading && (
            <div className="py-20 text-center bg-[#111111] border border-white/5 rounded-[40px]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-neutral-800" />
              </div>
              <h3 className="text-xl font-medium text-neutral-300">Desk Cleared</h3>
              <p className="text-neutral-500 mt-2">No pending suggestions for review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
