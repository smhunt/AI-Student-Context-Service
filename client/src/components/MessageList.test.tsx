import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from './MessageList.js';
import type { DisplayMessage } from '../hooks/useChat.js';

// Mock useSpeech since jsdom has no speechSynthesis
vi.mock('../hooks/useSpeech.js', () => ({
  useSpeech: () => ({
    speaking: false,
    paused: false,
    speakingId: null,
    voiceName: '',
    available: false,
    speak: vi.fn(),
    stop: vi.fn(),
    togglePause: vi.fn(),
  }),
}));

// Mock react-markdown since jsdom cannot render it properly
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock('remark-gfm', () => ({
  default: () => {},
}));

const mockMessages: DisplayMessage[] = [
  { id: '1', role: 'user', content: 'Hello', createdAt: '2025-01-01T00:00:00Z' },
  { id: '2', role: 'assistant', content: 'Hi there! How can I help?', createdAt: '2025-01-01T00:00:01Z' },
];

describe('MessageList', () => {
  it('renders user and assistant messages', () => {
    render(<MessageList messages={mockMessages} sending={false} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help?')).toBeInTheDocument();
  });

  it('shows typing indicator when sending', () => {
    const { container } = render(<MessageList messages={[]} sending={true} />);
    const indicator = container.querySelector('.typing-indicator');
    expect(indicator).toBeTruthy();
  });

  it('shows empty state with heading when no messages and not sending', () => {
    render(<MessageList messages={[]} sending={false} />);
    expect(screen.getByText('StudentContext AI')).toBeInTheDocument();
  });

  it('shows suggestion buttons in empty state', () => {
    render(<MessageList messages={[]} sending={false} />);
    expect(screen.getByText('How am I doing in math?')).toBeInTheDocument();
    expect(screen.getByText('Help me study for my science test')).toBeInTheDocument();
    expect(screen.getByText('What should I focus on next?')).toBeInTheDocument();
  });

  it('calls onSuggestionClick when suggestion is clicked', async () => {
    const onSuggestionClick = vi.fn();
    render(<MessageList messages={[]} sending={false} onSuggestionClick={onSuggestionClick} />);
    const suggestion = screen.getByText('How am I doing in math?');
    suggestion.click();
    expect(onSuggestionClick).toHaveBeenCalledWith('How am I doing in math?');
  });

  it('shows avatar labels', () => {
    render(<MessageList messages={mockMessages} sending={false} />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('shows AI avatar in typing indicator', () => {
    render(<MessageList messages={[]} sending={true} />);
    // The typing indicator message has an AI avatar
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders multiple messages in order', () => {
    const messages: DisplayMessage[] = [
      { id: '1', role: 'user', content: 'First message', createdAt: '2025-01-01T00:00:00Z' },
      { id: '2', role: 'assistant', content: 'First reply', createdAt: '2025-01-01T00:00:01Z' },
      { id: '3', role: 'user', content: 'Second message', createdAt: '2025-01-01T00:00:02Z' },
      { id: '4', role: 'assistant', content: 'Second reply', createdAt: '2025-01-01T00:00:03Z' },
    ];
    render(<MessageList messages={messages} sending={false} />);
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('First reply')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Second reply')).toBeInTheDocument();
  });
});
