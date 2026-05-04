import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { Notice, Lecture } from '../types';
import { motion } from 'motion/react';
import { Megaphone, Video, ArrowRight, Clock, MapPin, ShieldCheck, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const [lecturesCount, setLecturesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic stats for Admin
    if (user?.role === 'admin') {
      const qSug = query(collection(db, 'suggestions'), where('status', '==', 'pending'));
      onSnapshot(qSug, (s) => setSuggestionsCount(s.size));

      const qLec = query(collection(db, 'lectures'));
      onSnapshot(qLec, (s) => setLecturesCount(s.size));
    }

    // Latest notices for everyone
    const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeNotices = onSnapshot(noticesQuery, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
      setLoading(false);
    });

    return () => unsubscribeNotices();
  }, [user]);

  if (user?.role === 'admin') {
    return <AdminDashboard stats={{ suggestionsCount, lecturesCount }} notices={notices} />;
  }

  return <StudentDashboard user={user} notices={notices} />;
}

function AdminDashboard({ stats, notices }: { stats: any, notices: Notice[] }) {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2">Internal Operations</h2>
        <h1 className="text-5xl font-bold tracking-tight mb-4">Command Center</h1>
        <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
          The central hub for university management. Monitor pending contributions and manage institutional resources.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[32px] bg-white text-black">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Pending Reviews</p>
          <h4 className="text-4xl font-bold">{stats.suggestionsCount}</h4>
          <Link to="/admin" className="mt-6 flex items-center gap-2 text-sm font-bold border-t border-black/10 pt-4 hover:gap-3 transition-all">
            Go to desk <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="p-8 rounded-[32px] bg-[#111111] border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Total Lectures</p>
          <h4 className="text-4xl font-bold">{stats.lecturesCount}</h4>
          <Link to="/lectures" className="mt-6 flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white transition-all">
            Manage library <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="p-8 rounded-[32px] bg-[#111111] border border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Active Notices</p>
          <h4 className="text-4xl font-bold">{notices.length}</h4>
          <Link to="/notices" className="mt-6 flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white transition-all">
            View board <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <section className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-neutral-400" />
          Quick Publish
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/admin" className="p-6 rounded-2xl bg-[#111111] border border-white/5 hover:border-white/20 hover:bg-[#1a1a1a] transition-all group">
            <h4 className="font-bold mb-1">Direct Notice</h4>
            <p className="text-xs text-neutral-500">Bypass suggestion process</p>
          </Link>
          <Link to="/admin" className="p-6 rounded-2xl bg-[#111111] border border-white/5 hover:border-white/20 hover:bg-[#1a1a1a] transition-all group">
            <h4 className="font-bold mb-1">Upload Lecture</h4>
            <p className="text-xs text-neutral-500">Add directly to library</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function StudentDashboard({ user, notices }: { user: any, notices: Notice[] }) {
  return (
    <div className="space-y-12 pb-12">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2">Student Interface</h2>
          <h1 className="text-5xl font-bold tracking-tight mb-2">Hello, {user?.name.split(' ')[0]}</h1>
          <p className="text-neutral-400 max-w-xl">
            Welcome to your academic feed. Find the latest updates and contribute resources to our community.
          </p>
        </motion.div>
        <Link to="/suggestions" className="px-8 h-16 bg-white text-black rounded-2xl font-bold flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
          <Lightbulb className="w-5 h-5" />
          Suggest Content
        </Link>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-neutral-400" />
              Latest Notices
            </h3>
            <Link to="/notices" className="text-sm text-neutral-500 hover:text-white flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {notices.map((notice) => (
              <motion.div 
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group p-6 rounded-3xl bg-[#111111] border border-white/5 hover:bg-[#1a1a1a] transition-all relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        notice.priority === 'urgent' ? 'bg-white text-black' : 'bg-white/10 text-neutral-400'
                      }`}>
                        {notice.priority}
                      </span>
                      <span className="text-xs text-neutral-500">{notice.createdAt?.toDate ? format(notice.createdAt.toDate(), 'MMM d, yyyy') : 'Just now'}</span>
                    </div>
                    <h4 className="text-lg font-semibold group-hover:text-white transition-colors">{notice.title}</h4>
                    <p className="text-sm text-neutral-400 line-clamp-2 mt-1 leading-relaxed">{notice.message}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    {notice.audience}
                  </div>
                </div>
              </motion.div>
            ))}
            {notices.length === 0 && (
              <div className="p-12 text-center text-neutral-600 italic">No new announcements.</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 rounded-[32px] bg-white text-black shadow-2xl">
            <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Academic Status</label>
            <p className="font-bold text-3xl mb-6">Enrolled</p>
            <div className="space-y-3">
              <div className="flex justify-between text-xs border-t border-black/10 pt-3">
                <span className="opacity-50">Department</span>
                <span className="font-bold">{user?.department || 'General'}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-black/10 pt-3">
                <span className="opacity-50">Identity</span>
                <span className="font-bold capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
          
          <div className="p-8 rounded-[32px] bg-[#111111] border border-white/5 space-y-4">
            <h4 className="font-bold text-lg">Resource Contribution</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Found a great PDF or have a video lecture series in mind? Help your classmates by suggesting it for approval.
            </p>
            <Link to="/suggestions" className="block text-center p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all">
              Launch Suggestion Tool
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

