import { CopyButton } from '@/components/ui/copy-button';

export function CodeBlock({ text }: { readonly text: string }) {
  const code = text.trimEnd();
  return (
    <div className="relative mt-4">
      <pre className="sticker-box rounded-2xl bg-ink py-4 pr-15 pl-5 text-[15px] leading-relaxed whitespace-pre-wrap text-white wrap-break-word">
        <code className="font-sans">{code}</code>
      </pre>
      <div className="absolute top-2.5 right-2.5">
        <CopyButton text={code} label="Copy the code" />
      </div>
    </div>
  );
}
