import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { TextLink } from '@/components/ui/text-link';
import { docHref } from '@/lib/doc-links';
import { CodeBlock } from './code-block';
import { rehypeCellLabels, textOf } from './hast';
import { PAGE_TITLE, SECTION_TITLE } from './styles';

const REMARK = [remarkGfm];
const REHYPE = [rehypeSlug, rehypeCellLabels];
const HEADING = 'scroll-mt-24 text-ink';
const STEPS =
  'mt-5 grid gap-3 [counter-reset:step] [&>li]:relative [&>li]:min-h-7 [&>li]:pl-10 [&>li]:[counter-increment:step] [&>li]:before:absolute [&>li]:before:top-0 [&>li]:before:left-0 [&>li]:before:grid [&>li]:before:size-7 [&>li]:before:place-items-center [&>li]:before:rounded-full [&>li]:before:bg-brand [&>li]:before:text-sm [&>li]:before:font-bold [&>li]:before:text-white [&>li]:before:content-[counter(step)]';
const TABLE =
  'w-full text-left text-[15px] max-sm:block max-sm:[&_tbody]:block max-sm:[&_thead]:sr-only max-sm:[&_tr]:grid max-sm:[&_tr]:gap-1.5 max-sm:[&_tr]:px-4 max-sm:[&_tr]:py-3.5 max-sm:[&_td]:p-0 max-sm:[&_td]:before:block max-sm:[&_td]:before:text-xs max-sm:[&_td]:before:font-semibold max-sm:[&_td]:before:tracking-wide max-sm:[&_td]:before:text-muted max-sm:[&_td]:before:uppercase max-sm:[&_td]:before:content-[attr(data-label)] max-sm:[&_td:first-child]:font-semibold max-sm:[&_td:first-child]:text-ink max-sm:[&_td:first-child]:before:hidden';

const COMPONENTS: Components = {
  h1: ({ children }) => <h1 className={PAGE_TITLE}>{children}</h1>,
  h2: ({ id, children }) => (
    <h2 id={id} className={`${SECTION_TITLE} mt-14 scroll-mt-24`}>
      {children}
    </h2>
  ),
  h3: ({ id, children }) => (
    <h3 id={id} className={`${HEADING} mt-10 text-xl font-semibold`}>
      {children}
    </h3>
  ),
  h4: ({ id, children }) => (
    <h4 id={id} className={`${HEADING} mt-8 text-lg font-semibold`}>
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="mt-4">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-4 grid list-disc gap-2 pl-5 marker:text-brand">{children}</ul>
  ),
  ol: ({ children }) => <ol className={STEPS}>{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ href = '', children }) => <TextLink href={docHref(href)}>{children}</TextLink>,
  code: ({ children }) => (
    <code className="rounded-md bg-brand-tint px-1.5 py-0.5 font-sans text-[0.92em] font-medium text-brand-strong">
      {children}
    </code>
  ),
  pre: ({ node }) => <CodeBlock text={textOf(node)} />,
  table: ({ children }) => (
    <div className="sticker-box mt-5 overflow-x-auto rounded-2xl bg-white">
      <table className={TABLE}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-brand-tint/70">{children}</thead>,
  tr: ({ children }) => <tr className="border-t border-brand-tint first:border-t-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold whitespace-nowrap text-ink">{children}</th>
  ),
  td: ({ node, children }) => (
    <td data-label={String(node?.properties.dataLabel ?? '')} className="px-4 py-3 align-top">
      {children}
    </td>
  ),
};

export function Markdown({ source }: { readonly source: string }) {
  return (
    <div className="text-[clamp(1rem,0.96rem+0.25vw,1.0625rem)] leading-relaxed text-body">
      <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE} components={COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
