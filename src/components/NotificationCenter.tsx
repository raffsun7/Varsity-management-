import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Info, AlertCircle, Lightbulb, Video, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Notification, OperationType } from '../types';
import { db, handleFirestoreError } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface NotificationCenterProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ notifications, isOpen, onClose }: NotificationCenterProps) {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'suggestion_update': return <Check className="w-4 h-4 text-green-500" />;
      case 'new_suggestion': return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'new_notice': return <Info className="w-4 h-4 text-blue-500" />;
      case 'new_lecture': return <Video className="w-4 h-4 text-purple-500" />;
      case 'new_note': return <FileText className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-neutral-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[110]"
          />
          <motion.div 
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="fixed top-24 right-6 md:right-12 w-full max-w-sm bg-[#111111] border border-white/10 rounded-[32px] shadow-2xl z-[111] overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-white text-black text-[10px] font-black rounded-full">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                      notification.isRead 
                        ? 'bg-transparent border-transparent grayscale' 
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        notification.isRead ? 'bg-neutral-900 text-neutral-700' : 'bg-white/5 text-white'
                      }`}>
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-bold truncate ${notification.isRead ? 'text-neutral-500' : 'text-white'}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && <span className="w-2 h-2 bg-white rounded-full shrink-0" />}
                        </div>
                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                          {notification.message}
                        </p>
                        <time className="text-[10px] font-mono text-neutral-600 uppercase">
                          {notification.createdAt?.toDate ? format(notification.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                        </time>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-800">
                    <Bell className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-neutral-500">No notifications yet</p>
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-4 border-t border-white/5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                  Total {notifications.length} updates
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
