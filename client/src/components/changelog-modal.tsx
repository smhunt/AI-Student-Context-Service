import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog.js';
import { Badge } from './ui/badge.js';
import { Info } from 'lucide-react';

export const APP_VERSION = '1.0.0';

type ChangelogTab = 'changelog' | 'how-it-works' | 'roadmap';

export const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-03-01',
    changes: [
      'Entra ID and Google Identity auth stubs with swap documentation',
      'API Key Broker: EcoWorks manages all LLM keys with markup billing',
      'Board billing limits enforcement (90% warning, 100% reject)',
      'MCP HTTP/SSE transport for deployable context engine',
      'context_augmented_chat and bulk_search MCP tools',
      'OneRoster 1.1 SIS provider (works with any compliant SIS)',
      'Batch sync: school-level and board-level with concurrency control',
      'OpenAI-compatible API for OpenWebUI integration',
      'Rate limiting on all API endpoints',
      'Detailed health checks with component status',
      'E2E test suite and production Docker Compose',
    ],
  },
  {
    version: '0.12.0',
    date: '2026-02-28',
    changes: [
      'shadcn/ui design system with Tailwind CSS',
      'UI primitive components (Button, Card, Dialog, Tabs, Avatar, Tooltip, Badge)',
      'In-app Changelog modal with How It Works and Roadmap',
      'Dark/light theme support',
      'Lucide React icons',
    ],
  },
  {
    version: '0.11.0',
    date: '2026-02-28',
    changes: [
      'Aspen SIS provider interface with 8 data methods',
      'OAuth 2.0 client for real Aspen REST API',
      'SIS sync service with prose formatting for embeddings',
      'Admin SIS sync and status endpoints',
    ],
  },
  {
    version: '0.10.0',
    date: '2026-02-28',
    changes: [
      'LLM Gateway with automatic token tracking',
      'Token usage billing with cost estimates for 5 providers',
      'Admin usage stats endpoint',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-02-28',
    changes: [
      'MCP server for Claude Desktop integration',
      'Chat streaming with Server-Sent Events',
      'Progressive content rendering',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-02-28',
    changes: [
      'AuthProvider abstraction layer (dev-login, future SSO)',
      'Renamed Trillium SIS to Aspen (Follett)',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-02-28',
    changes: [
      'Multi-LLM provider support (Claude, GPT-4o, Gemini, Llama, Mistral)',
      'Mock SIS data with realistic Ontario student records',
      'Backend and frontend test suites with Vitest',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-02-28',
    changes: [
      'Parent Consent portal with granular data source selection',
      'Admin Dashboard with statistics, audit log, user management',
      'Row-Level Security migration',
      'Production Dockerfile and Docker Compose',
    ],
  },
];

export const HOW_IT_WORKS = [
  {
    title: 'Secure Login',
    description: 'Authenticate via your school board credentials. Role-based access controls ensure you only see data appropriate for your role.',
    icon: 'lock',
  },
  {
    title: 'Ask a Question',
    description: 'Type a question about a student\'s academic progress. The system retrieves relevant context from the student\'s records.',
    icon: 'message-circle',
  },
  {
    title: 'Context Retrieval',
    description: 'Your query is embedded and matched against the student\'s vectorized academic records using RAG (Retrieval-Augmented Generation).',
    icon: 'search',
  },
  {
    title: 'Permission & Consent',
    description: 'The system verifies your role permissions and checks parental consent before including any student data.',
    icon: 'shield',
  },
  {
    title: 'AI Response',
    description: 'The LLM generates a personalized, context-aware response using only the data you\'re authorized to see.',
    icon: 'sparkles',
  },
  {
    title: 'Audit Trail',
    description: 'Every context retrieval is logged for FIPPA compliance. Admins can review the full audit trail.',
    icon: 'clipboard-list',
  },
];

export const ROADMAP = [
  {
    category: 'In Progress',
    items: [
      { label: 'SSO integration (Clerk, Entra ID, Google)', priority: 'high' },
      { label: 'Real Aspen SIS API connection', priority: 'high' },
    ],
  },
  {
    category: 'Planned',
    items: [
      { label: 'Per-board LLM provider configuration', priority: 'high' },
      { label: 'FIPPA compliance documentation', priority: 'high' },
      { label: 'Student portfolio view', priority: 'medium' },
      { label: 'Batch report card comment generation', priority: 'medium' },
      { label: 'Multi-language support (French)', priority: 'medium' },
    ],
  },
  {
    category: 'Future',
    items: [
      { label: 'Parent mobile app', priority: 'low' },
      { label: 'Google Forms assessment integration', priority: 'low' },
      { label: 'Predictive analytics dashboard', priority: 'low' },
    ],
  },
];

const PRIORITY_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

export function ChangelogModal() {
  const [tab, setTab] = useState<ChangelogTab>('changelog');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
          title="About this app"
        >
          <Info className="h-3.5 w-3.5" />
          v{APP_VERSION}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>StudentContext AI</DialogTitle>
          <p className="text-sm text-muted">EcoWorks Web Architecture Inc.</p>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {([
            ['changelog', 'Changelog'],
            ['how-it-works', 'How It Works'],
            ['roadmap', 'Roadmap'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 py-2" style={{ maxHeight: '50vh' }}>
          {tab === 'changelog' && (
            <div className="space-y-6">
              {CHANGELOG.map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v{entry.version}</Badge>
                    <span className="text-xs text-muted">{entry.date}</span>
                  </div>
                  <ul className="space-y-1 pl-4">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-sm text-foreground list-disc">{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {tab === 'how-it-works' && (
            <div className="space-y-4">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                    <p className="text-sm text-muted mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'roadmap' && (
            <div className="space-y-6">
              {ROADMAP.map((section) => (
                <div key={section.category}>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{section.category}</h4>
                  <div className="space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <Badge variant={PRIORITY_COLORS[item.priority]}>{item.priority}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
