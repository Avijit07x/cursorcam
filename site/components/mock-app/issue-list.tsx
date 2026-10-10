'use client';

import { motion } from 'motion/react';
import { ISSUE_ROWS, MOCK_APP } from '@/lib/mock-app';
import { part } from './stage';
import { ROW, ROW_AVATAR, ROW_DOT } from './styles';
import { THEME } from './theme';

export function IssueList() {
  return (
    <div className="px-[5cqh] pt-[1cqh]">
      {ISSUE_ROWS.map((row, index) => (
        <motion.div key={row.dot} {...part(`row-${index}`)} variants={THEME.row} className={ROW}>
          <span className={ROW_DOT} style={{ background: row.dot }} />
          <motion.span
            variants={THEME.rowBar}
            className="h-[2cqh] rounded-full"
            style={{ width: row.width }}
          />
          <span className={ROW_AVATAR} style={{ background: row.avatar }} />
        </motion.div>
      ))}
      <motion.div {...part('new-row')} variants={THEME.newRow} className={`${ROW} opacity-0`}>
        <span className={`${ROW_DOT} bg-rose`} />
        <motion.span variants={THEME.text} className="min-w-0 truncate text-[4cqh] font-medium">
          {MOCK_APP.newIssueTitle}
        </motion.span>
        <span className={`${ROW_AVATAR} bg-brand`} />
      </motion.div>
    </div>
  );
}
