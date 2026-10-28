import { useEffect, useState } from 'react';
import { VERSES } from '../lib/verses';

/** How long each phase stays fully visible. */
const ARABIC_MS = 9_000;
const ENGLISH_MS = 9_000;
/** Fade duration, matched to the CSS transition. */
const FADE_MS = 600;

type Phase = 'arabic' | 'english';

/**
 * Rotates through a set of verses: Arabic first, then English, then the
 * next verse. Both phases fade so the change is not jarring on a TV.
 *
 * A single effect drives the whole cycle. Each run schedules exactly one
 * transition, so there is never more than one pending timer.
 */
export function VerseRotator() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('arabic');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const holdMs = phase === 'arabic' ? ARABIC_MS : ENGLISH_MS;

    // 1. Hold the current phase, then start fading out.
    const fadeOut = window.setTimeout(() => setVisible(false), holdMs);

    // 2. Once faded, swap content and fade back in.
    const swap = window.setTimeout(() => {
      if (phase === 'arabic') {
        setPhase('english');
      } else {
        setPhase('arabic');
        setIndex((current) => (current + 1) % VERSES.length);
      }
      setVisible(true);
    }, holdMs + FADE_MS);

    return () => {
      window.clearTimeout(fadeOut);
      window.clearTimeout(swap);
    };
  }, [phase, index]);

  const verse = VERSES[index];
  if (!verse) return null;

  return (
    <div className="verse" aria-live="polite">
      <div className={`verse-body${visible ? ' is-visible' : ''}`}>
        {phase === 'arabic' ? (
          <p className="verse-arabic" lang="ar" dir="rtl">
            {verse.arabic}
          </p>
        ) : (
          <p className="verse-english">{verse.english}</p>
        )}
        <span className="verse-ref">{verse.reference}</span>
      </div>
    </div>
  );
}
