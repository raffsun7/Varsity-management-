import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { Notice, Lecture } from '../types';
import { motion } from 'motion/react';
import { Megaphone, Video, ArrowRight, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Latest Notices
    const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeNotices = onSnapshot(noticesQuery, (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    });

    // Recent Lectures
    const lecturesQuery = query(collection(db, 'lectures'), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeLectures = onSnapshot(lecturesQuery, (snapshot) => {
      setRecentLectures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lecture)));
      setLoading(false);
    });

    return () => {
      unsubscribeNotices();
      unsubscribeLectures();
    };
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Welcome Header */}
      <section>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-500 mb-2">Academic Overview</h2>
          <h1 className="text-5xl font-bold tracking-tight mb-4">Hello, {user?.name.split(' ')[0]}</h1>
          <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed">
            Your university journey at a glance. Stay updated with the latest institutional notices and academic modules.
          </p>
        </motion.div>
      </section>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Left Column: Notices */}
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
            {notices.length === 0 && !loading && (
              <div className="p-8 rounded-3xl bg-[#111111] border border-white/5 text-center text-neutral-500">
                No active notices at the moment.
              </div>
            )}
            {notices.map((notice) => (
              <motion.div 
                key={notice.id}
                variants={item}
                className="group p-6 rounded-3xl bg-[#111111] border border-white/5 hover:bg-[#1a1a1a] transition-all duration-300 relative overflow-hidden"
              >
                {notice.priority === 'urgent' && (
                  <div className="absolute top-0 right-0 h-full w-1 bg-white" />
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                        notice.priority === 'urgent' ? 'bg-white text-black' : 'bg-white/10 text-neutral-300'
                      }`}>
                        {notice.priority}
                      </span>
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notice.createdAt?.toDate ? format(notice.createdAt.toDate(), 'MMM d, yyyy') : 'Just now'}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold group-hover:text-white transition-colors">{notice.title}</h4>
                    <p className="text-sm text-neutral-400 line-clamp-2 mt-1 leading-relaxed">{notice.message}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <MapPin className="w-3 h-3" />
                    {notice.audience}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Lectures & Quick Summary */}
        <div className="space-y-8">
          <div className="p-8 rounded-[32px] bg-white text-black shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-8 underline underline-offset-4">Your Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Department</label>
                  <p className="font-semibold text-lg">{user?.department || 'Information Technology'}</p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest opacity-50 block mb-1">Current Role</label>
                  <p className="font-semibold text-lg capitalize">{user?.role}</p>
                </div>
              </div>
            </div>
            {/* Background shape */}
            <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-black/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-3">
              <Video className="w-5 h-5 text-neutral-400" />
              Recent Lectures
            </h3>
            <div className="space-y-3">
              {recentLectures.map((lecture) => (
                <motion.div 
                  key={lecture.id}
                  variants={item}
                  className="p-4 rounded-2xl bg-[#111111] border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{lecture.title}</h4>
                      <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">{lecture.courseName}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <Link to="/lectures" className="block text-center p-4 rounded-2xl border border-white/5 text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all">
              Explore library
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
