'use client';

import { motion } from 'motion/react';
import { SparkleLabel } from '@/components/ui/sparkle-label';
import { FADE_UP, SOFT } from '@/lib/motion';

export function SparkleBadge({ delay }: { readonly delay: number }) {
  return (
    <motion.p {...FADE_UP} transition={{ ...SOFT, delay }} className="text-base sm:text-lg">
      <SparkleLabel>Website coming soon</SparkleLabel>
    </motion.p>
  );
}
