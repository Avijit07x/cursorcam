import { CopyButton } from './copy-button';

interface CommandPillProps {
  readonly text: string;
  readonly label?: string;
  readonly words?: boolean;
}

export function CommandPill({ text, label = `Copy ${text}`, words = false }: CommandPillProps) {
  const Text = words ? 'span' : 'code';
  return (
    <p className="m-0 flex max-w-full items-center gap-2.5 rounded-[20px_20px_6px_20px] bg-brand py-1.5 pr-1.5 pl-4 text-[15px] leading-snug text-white">
      <Text className="min-w-0 flex-1 font-[inherit] wrap-anywhere">{text}</Text>
      <CopyButton text={text} label={label} />
    </p>
  );
}
