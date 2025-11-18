'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
      <div className="flex gap-1">
        <span className="font-medium">Thinking</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', delay: 0 }}
        >
          .
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', delay: 0.2 }}
        >
          .
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', delay: 0.4 }}
        >
          .
        </motion.span>
      </div>
    </div>
  );
}
