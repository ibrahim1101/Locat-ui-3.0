import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ConversationMessage } from './matrixConversationSession';

function excerpt(message: ConversationMessage, query: string) {
  const content = message.text ?? message.attachment?.name ?? 'Attachment';
  const match = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (match < 0 || content.length <= 112) return content;
  const start = Math.max(0, match - 42);
  const end = Math.min(content.length, start + 112);
  return `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;
}

export function ConversationSearch({ messages, onJump }: { messages: ConversationMessage[]; onJump(id: string): void }) {
  const [query, setQuery] = useState('');
  const normalized = query.trim();
  const matches = useMemo(() => {
    if (!normalized) return [];
    const needle = normalized.toLocaleLowerCase();
    return messages.filter(message => !message.failed && [message.text, message.attachment?.name]
      .some(value => value?.toLocaleLowerCase().includes(needle)));
  }, [messages, normalized]);

  return <details className="group rounded-xl bg-s1 px-3 py-2 hairline">
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-ink-2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ember">
      <Search className="size-4 text-ember" /> Search loaded messages
    </summary>
    <div className="space-y-2 pt-3">
      <label className="sr-only" htmlFor="conversation-search">Search decrypted messages on this device</label>
      <input id="conversation-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Words or file name" autoComplete="off" spellCheck={false}
        className="min-h-10 w-full rounded-lg bg-s2 px-3 text-sm text-ink placeholder:text-ink-3 hairline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ember" />
      <p className="text-xs text-ink-3">Searches up to 200 messages already loaded and decrypted on this device. Search terms stay here.</p>
      {normalized && <p role="status" className="text-xs text-ink-2">{matches.length ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}` : 'No matches in loaded messages'}</p>}
      {matches.length > 0 && <ul className="max-h-56 space-y-1 overflow-y-auto" aria-label="Message search results">
        {matches.map(message => <li key={message.id}>
          <button type="button" onClick={() => onJump(message.id)} className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-s2 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ember">
            <span className="line-clamp-2 block break-words">{excerpt(message, normalized)}</span>
            <span className="mt-1 block text-2xs text-ink-3">{message.mine ? 'You' : 'Contact'} · {new Date(message.createdAt).toLocaleString()}</span>
          </button>
        </li>)}
      </ul>}
    </div>
  </details>;
}
