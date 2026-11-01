import { useEffect, useRef, useState } from 'react';
import { fetchVerse, VERSE_REFS, type QuranVerse } from '../lib/quran';

/**
 * Loads the verse at `index` and keeps the last good one.
 *
 * The rotator advances the index on a timer; this hook only cares about
 * turning an index into text. A failed request never clears the previous
 * verse — a network blip should not blank the footer on a TV.
 *
 * The index is taken modulo the list length, so callers can keep incrementing
 * forever without worrying about the bound.
 */
export function useVerse(index: number): {
  verse: QuranVerse | null;
  loading: boolean;
} {
  const [verse, setVerse] = useState<QuranVerse | null>(null);
  const [loading, setLoading] = useState(true);

  // Avoid re-fetching when the same verse comes round again.
  const cache = useRef(new Map<string, QuranVerse>());

  useEffect(() => {
    const ref = VERSE_REFS[index % VERSE_REFS.length];
    if (!ref) return;

    const [surah, ayah] = ref;
    const key = `${surah}:${ayah}`;

    const cached = cache.current.get(key);
    if (cached) {
      setVerse(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      const next = await fetchVerse(surah, ayah, controller.signal);
      if (cancelled) return;

      if (next) {
        cache.current.set(key, next);
        setVerse(next);
      }
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [index]);

  return { verse, loading };
}
