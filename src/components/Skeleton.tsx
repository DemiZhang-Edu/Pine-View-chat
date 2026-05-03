import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = "bg-slate-200 dark:bg-slate-800 relative overflow-hidden";
  const variantClasses = {
    rectangular: "rounded-lg",
    circular: "rounded-full",
    text: "rounded h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <motion.div
        animate={{
          x: ["-100%", "100%"]
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent shadow-sm"
      />
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-4 p-4">
      <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-12 h-2" />
        </div>
        <Skeleton className="w-full h-12" />
      </div>
    </div>
  );
}

export function SidebarItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
      <Skeleton className="w-24 h-4" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl relative">
        <div className="absolute -bottom-16 left-8">
          <Skeleton variant="circular" className="w-32 h-32 border-4 border-white dark:border-slate-900 shadow-lg" />
        </div>
      </div>
      <div className="pt-20 space-y-6">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-24 h-4" />
        </div>
        <div className="space-y-4">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-32" />
        </div>
      </div>
    </div>
  );
}

export function FriendshipSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
      <div className="flex flex-col items-center space-y-3">
        <Skeleton variant="circular" className="w-20 h-20" />
        <Skeleton className="w-32 h-4" />
        <Skeleton className="w-24 h-2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-10 h-10" />
      </div>
    </div>
  );
}

export function HomeMessageSkeleton() {
  return (
    <div className="p-5 flex items-start gap-4">
      <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-12 h-2" />
        </div>
        <Skeleton className="w-full h-4" />
      </div>
    </div>
  );
}
