import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConversationSearch } from './ConversationSearch';
import type { ConversationMessage } from './matrixConversationSession';

const messages: ConversationMessage[] = [
  { id: '$hello', text: 'Hello from the ember room', mine: false, createdAt: 1_800_000_000_000, failed: false },
  { id: '$file', attachment: { name: 'Notes.PDF', size: 10, mime: 'application/pdf', file: {} as never }, mine: true, createdAt: 1_800_000_001_000, failed: false },
  { id: '$failed', text: 'hello key unavailable', mine: false, createdAt: 1_800_000_002_000, failed: true },
];

describe('ConversationSearch', () => {
  it('searches only loaded, successfully decrypted text and attachment names, then jumps locally', () => {
    const onJump = vi.fn();
    render(<ConversationSearch messages={messages} onJump={onJump} />);
    fireEvent.click(screen.getByText('Search loaded messages'));
    const input = screen.getByRole('searchbox', { name: 'Search decrypted messages on this device' });
    fireEvent.change(input, { target: { value: 'HELLO' } });
    expect(screen.getByRole('status')).toHaveTextContent('1 result');
    expect(screen.getByText('Hello from the ember room')).toBeInTheDocument();
    expect(screen.queryByText('hello key unavailable')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'pdf' } });
    expect(screen.getByText('Notes.PDF')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Notes\.PDF/ }));
    expect(onJump).toHaveBeenCalledWith('$file');
  });

  it('keeps the empty and no-match states clear', () => {
    render(<ConversationSearch messages={[]} onJump={() => undefined} />);
    fireEvent.click(screen.getByText('Search loaded messages'));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search decrypted messages on this device' }), { target: { value: 'unloaded history' } });
    expect(screen.getByRole('status')).toHaveTextContent('No matches in loaded messages');
  });
});
