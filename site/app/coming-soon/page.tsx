import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon/coming-soon';

export const metadata: Metadata = {
  title: 'CursorCam: website coming soon',
};

export default function ComingSoonPage() {
  return <ComingSoon />;
}
