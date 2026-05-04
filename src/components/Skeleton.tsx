import { motion } from 'motion/react';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`overflow-hidden relative bg-white/5 rounded-xl ${className}`}>
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'linear',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
      />
    </div>
  );
}

export function NoticeSkeleton() {
  return (
    <div className="p-6 rounded-3xl bg-[#111111] border border-white/5 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function LectureSkeleton() {
  return (
    <div className="bg-[#111111] border border-white/5 rounded-[32px] overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-8 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function NoteSkeleton() {
  return (
    <div className="bg-[#111111] border border-white/5 rounded-[28px] p-6 space-y-6">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
