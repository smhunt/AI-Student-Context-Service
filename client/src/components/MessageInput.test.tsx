import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageInput from './MessageInput.js';

describe('MessageInput', () => {
  it('renders textarea and send button', () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByPlaceholderText('Ask a question...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onSend with trimmed text when submitted', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);
    const textarea = screen.getByPlaceholderText('Ask a question...');
    await user.type(textarea, 'Hello AI');
    await user.click(screen.getByRole('button'));
    expect(onSend).toHaveBeenCalledWith('Hello AI');
  });

  it('clears input after send', async () => {
    const user = userEvent.setup();
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    const textarea = screen.getByPlaceholderText('Ask a question...') as HTMLTextAreaElement;
    await user.type(textarea, 'Hello');
    await user.click(screen.getByRole('button'));
    expect(textarea.value).toBe('');
  });

  it('disables textarea when disabled prop is true', () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByPlaceholderText('Ask a question...')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when input is empty', () => {
    render(<MessageInput onSend={vi.fn()} disabled={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onSend for empty input', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);
    await user.click(screen.getByRole('button'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend for whitespace-only input', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);
    const textarea = screen.getByPlaceholderText('Ask a question...');
    await user.type(textarea, '   ');
    // Button should still be disabled because text.trim() is empty
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('submits on Enter key (without Shift)', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<MessageInput onSend={onSend} disabled={false} />);
    const textarea = screen.getByPlaceholderText('Ask a question...');
    await user.type(textarea, 'Hello{Enter}');
    expect(onSend).toHaveBeenCalledWith('Hello');
  });
});
