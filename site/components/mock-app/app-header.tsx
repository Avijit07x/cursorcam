'use client';

import { motion } from 'motion/react';
import { MOCK_APP } from '@/lib/mock-app';
import { Blur } from './blur';
import { part } from './stage';
import { THEME } from './theme';

const APP_NAME = 'Tracker';

export function AppHeader({ masked }: { readonly masked: boolean }) {
  return (
    <>
      <motion.div
        variants={THEME.topBar}
        className="flex h-[13cqh] items-center gap-[2.4cqh] border-b px-[5cqh]"
      >
        <span className="size-[4.6cqh] shrink-0 rounded-[1.4cqh] bg-brand" />
        <motion.span variants={THEME.text} className="text-[4.6cqh] font-semibold">
          {APP_NAME}
        </motion.span>
        <span className="ml-auto flex min-w-0 items-center gap-[2cqh]">
          <Blur on={masked} className="min-w-0">
            <motion.span
              {...part('email')}
              variants={THEME.email}
              className="block truncate text-[4cqh]"
            >
              {MOCK_APP.user}
            </motion.span>
          </Blur>
          <span className="size-[6.4cqh] shrink-0 rounded-full bg-[#DB2777]" />
        </span>
      </motion.div>
      <div className="flex flex-wrap items-center justify-between gap-[2cqh] px-[6cqh] pt-[6cqh]">
        <motion.span variants={THEME.text} className="text-[6cqh] leading-[1.2] font-semibold">
          {MOCK_APP.heading}
        </motion.span>
        <span
          {...part('new-button')}
          className="rounded-full bg-brand px-[3.6cqh] py-[1.6cqh] text-[4cqh] leading-[1.2] font-semibold whitespace-nowrap text-white"
        >
          {MOCK_APP.newIssue}
        </span>
      </div>
    </>
  );
}
