import { footnotes } from './Footnote';
import cn from '@/lib/cn';

export default async function FootnotesFooter({ className }: { className?: string }) {
  await Promise.resolve(); // yield so Content's ServerFootnotes render first

  const foot = footnotes();

  if (foot.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-3 border-t border-gray-200 pt-4', className)}>
      {foot.map((footnote) => (
        <div key={footnote.index} className="text-sm italic text-foreground-muted">
          <a href={`#footnote-${footnote.index}`} className="hover:no-underline">
            <span className="footnote-index">{footnote.index}</span>
          </a>
          . {footnote.content}
        </div>
      ))}
    </div>
  );
}
