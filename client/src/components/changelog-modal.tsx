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
    title: 'Sign In with Your Board Credentials',
    description: 'Use the same login you already use for your school board systems. StudentContext AI plugs into your board\'s identity provider (Clerk, Microsoft Entra ID, or Google Workspace) so there is no separate password to remember and your board\'s security policies apply automatically.',
    icon: 'lock',
  },
  {
    title: 'Ask About Any Student in Your Care',
    description: 'Type a natural language question about a student\'s academic progress, strengths, or areas for growth. Teachers see their own class roster. Guidance counsellors see their full caseload. Parents see their own children. You never have to worry about accessing the wrong student -- the system enforces your scope automatically.',
    icon: 'message-circle',
  },
  {
    title: 'Real Data, Not Guesswork',
    description: 'Behind the scenes, your question is matched against the student\'s actual academic records -- Google Classroom assignments, SIS report cards, transcripts, attendance, IEPs, and EQAO results. The AI sees what you would see if you pulled the student\'s OSR and reviewed every document.',
    icon: 'search',
  },
  {
    title: 'Privacy Protected at Every Step',
    description: 'Before any student data is included, the system verifies your role-based permissions and confirms that the student\'s parent has granted consent for AI-assisted context retrieval. Sensitive records like IEPs are only visible to authorized roles. No data is stored by the AI provider.',
    icon: 'shield',
  },
  {
    title: 'Personalized, Grounded Responses',
    description: 'The AI generates a response that references the student\'s actual performance -- not generic advice. A student asking "How am I doing in math?" gets an answer based on their real grades and teacher feedback. A teacher generating a report card comment gets a draft grounded in the full semester\'s data.',
    icon: 'sparkles',
  },
  {
    title: 'Save Hours on Report Cards',
    description: 'The Staff Portal generates Ontario Growing Success-aligned report card comments in seconds, complete with learning skills assessments. Review, adjust tone, and finalize -- what used to take 15-20 minutes per student now takes under a minute.',
    icon: 'file-text',
  },
  {
    title: 'Complete Audit Trail for Compliance',
    description: 'Every context retrieval, every chat interaction, and every document access is logged with timestamps, actor identity, and target student. Board administrators can review the full audit trail for FIPPA compliance at any time. Your professional accountability is documented automatically.',
    icon: 'clipboard-list',
  },
];

export const ROADMAP = [
  {
    category: 'Recently Completed (v1.0.0)',
    items: [
      { label: 'SSO integration: Clerk live, Entra ID and Google stubs ready', priority: 'high' },
      { label: 'API Key Broker with per-board billing limits and cost tracking', priority: 'high' },
      { label: 'OneRoster 1.1 SIS provider for vendor-agnostic integration', priority: 'high' },
      { label: 'MCP HTTP/SSE transport for embeddable context engine', priority: 'high' },
      { label: 'OpenAI-compatible API for Open WebUI and third-party chat UIs', priority: 'high' },
      { label: 'Rate limiting, E2E tests, and production Docker deployment', priority: 'high' },
    ],
  },
  {
    category: 'In Progress',
    items: [
      { label: 'TVDSB pilot deployment with live Aspen SIS connection', priority: 'high' },
      { label: 'Complete Entra ID and Google Identity provider implementations', priority: 'high' },
      { label: 'FIPPA/PHIPA compliance documentation package for board legal teams', priority: 'high' },
      { label: 'Batch report card comment generation (full class in one click)', priority: 'medium' },
    ],
  },
  {
    category: 'Planned',
    items: [
      { label: 'Student academic portfolio view with progress visualization', priority: 'medium' },
      { label: 'Multi-language support (French) for Franco-Ontarian boards', priority: 'medium' },
      { label: 'IEP-aware accommodations suggestions in chat responses', priority: 'medium' },
      { label: 'Parent notification system for consent requests via email', priority: 'medium' },
      { label: 'Board-level analytics dashboard for superintendents', priority: 'medium' },
    ],
  },
  {
    category: 'Future',
    items: [
      { label: 'Parent mobile app (iOS/Android) for consent and progress', priority: 'low' },
      { label: 'Predictive early warning system for at-risk students', priority: 'low' },
      { label: 'Google Forms and Brightspace assessment integration', priority: 'low' },
      { label: 'Ministry of Education OnSIS reporting alignment', priority: 'low' },
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
