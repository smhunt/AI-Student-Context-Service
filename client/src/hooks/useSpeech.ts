import { useState, useEffect, useCallback, useRef } from 'react';

// Strip markdown to plain text for speaking
export function stripMarkdown(md: string): string {
  return md
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links, keep text
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    // Remove bold/italic markers
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove bullet/number list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquote markers
    .replace(/^\s*>\s+/gm, '')
    // Remove table formatting
    .replace(/\|/g, ',')
    .replace(/^[-:| ]+$/gm, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Rank voices — prefer high-quality local voices
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();

  // Must be English
  if (!lang.startsWith('en')) return -1;

  let score = 0;

  // Strongly prefer enhanced/premium voices (macOS/iOS)
  if (name.includes('enhanced') || name.includes('premium')) score += 100;

  // Prefer specific high-quality voices
  // macOS/iOS: Samantha, Karen, Daniel, Moira, Tessa are excellent
  if (name.includes('samantha')) score += 80;
  if (name.includes('karen')) score += 75;
  if (name.includes('daniel')) score += 70;
  if (name.includes('moira')) score += 65;
  if (name.includes('tessa')) score += 60;
  if (name.includes('zoe')) score += 55;
  if (name.includes('fiona')) score += 50;

  // Google voices in Chrome are decent
  if (name.includes('google') && name.includes('us')) score += 40;
  if (name.includes('google') && name.includes('uk')) score += 38;

  // Microsoft voices
  if (name.includes('microsoft') && name.includes('natural')) score += 45;

  // Prefer local voices over network (more reliable, lower latency)
  if (v.localService) score += 10;

  // Prefer en-US, en-CA, en-GB
  if (lang === 'en-ca') score += 5;
  if (lang === 'en-us') score += 4;
  if (lang === 'en-gb') score += 3;

  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const scored = voices
    .map(v => ({ voice: v, score: scoreVoice(v) }))
    .filter(v => v.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.voice ?? null;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState<string>('');
  const [available, setAvailable] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices (may be async in Chrome)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setAvailable(true);

    function loadVoices() {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const best = pickBestVoice(voices);
        voiceRef.current = best;
        setVoiceName(best?.name ?? 'Default');
      }
    }

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const speak = useCallback((text: string, messageId: string) => {
    if (!window.speechSynthesis) return;

    // Stop any current speech
    speechSynthesis.cancel();

    const plain = stripMarkdown(text);
    if (!plain) return;

    // Split into chunks for long text (speechSynthesis can cut off long utterances)
    const chunks = splitIntoSpeechChunks(plain);
    let chunkIndex = 0;

    function speakNext() {
      if (chunkIndex >= chunks.length) {
        setSpeaking(false);
        setPaused(false);
        setSpeakingId(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        chunkIndex++;
        speakNext();
      };

      utterance.onerror = (e) => {
        // 'interrupted' and 'canceled' are expected when user stops
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Speech error:', e.error);
        }
        setSpeaking(false);
        setPaused(false);
        setSpeakingId(null);
      };

      speechSynthesis.speak(utterance);
    }

    setSpeaking(true);
    setPaused(false);
    setSpeakingId(messageId);
    speakNext();
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setSpeakingId(null);
  }, []);

  const togglePause = useCallback(() => {
    if (paused) {
      speechSynthesis.resume();
      setPaused(false);
    } else {
      speechSynthesis.pause();
      setPaused(true);
    }
  }, [paused]);

  return { speaking, paused, speakingId, voiceName, available, speak, stop, togglePause };
}

// Split text into ~200-word chunks at sentence boundaries
export function splitIntoSpeechChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).split(/\s+/).length > 200 && current) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
