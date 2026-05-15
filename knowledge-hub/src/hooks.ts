import { useState, useEffect, useCallback } from 'react';
import { manifestUrl } from './config';

export interface ManifestFile { name: string; slug: string; languages: string[]; }
export interface ManifestTopic { id: string; name: string; contentPath: string; files: ManifestFile[]; }

export interface HubState {
  topicId: string | null;
  fileSlug: string | null;
  lang: 'en' | 'zh';
  expandedTopics: Set<string>;
  topics: ManifestTopic[];
}

function parseHash(): { topicId: string | null; fileSlug: string | null; lang: 'en' | 'zh' } {
  const hash = window.location.hash.replace('#/', '');
  const [rest, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const parts = rest.split('/').filter(Boolean);
  return {
    topicId: parts[0] || null,
    fileSlug: parts[1] || null,
    lang: (params.get('lang') as 'en' | 'zh') || 'en'
  };
}

function buildHash(topicId: string, fileSlug: string, lang: string): string {
  return `#/${topicId}/${fileSlug}?lang=${lang}`;
}

export function useHubState() {
  const [state, setState] = useState<{
    topics: ManifestTopic[];
    topicId: string | null;
    fileSlug: string | null;
    lang: 'en' | 'zh';
    expandedTopics: Set<string>;
  }>(() => ({
    topics: [],
    topicId: null,
    fileSlug: null,
    lang: 'en',
    expandedTopics: new Set()
  }));

  // Load manifest
  useEffect(() => {
    fetch(manifestUrl())
      .then(r => r.json())
      .then((topics: ManifestTopic[]) => {
        const hash = parseHash();
        setState(s => ({
          ...s,
          topics,
          topicId: hash.topicId || topics[0]?.id || null,
          fileSlug: hash.fileSlug || topics[0]?.files[0]?.slug || null,
          lang: hash.lang,
          expandedTopics: new Set(hash.topicId ? [hash.topicId] : topics[0] ? [topics[0].id] : [])
        }));
      });
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const hash = parseHash();
      setState(s => ({
        ...s,
        topicId: hash.topicId || s.topicId,
        fileSlug: hash.fileSlug || s.fileSlug,
        lang: hash.lang,
        expandedTopics: new Set(hash.topicId ? [...s.expandedTopics, hash.topicId] : s.expandedTopics)
      }));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Update hash when state changes
  useEffect(() => {
    if (state.topicId && state.fileSlug) {
      const newHash = buildHash(state.topicId, state.fileSlug, state.lang);
      if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }
    }
  }, [state.topicId, state.fileSlug, state.lang]);

  const navigate = useCallback((topicId: string, fileSlug: string) => {
    setState(s => ({
      ...s,
      topicId,
      fileSlug,
      expandedTopics: new Set([...s.expandedTopics, topicId])
    }));
  }, []);

  const setLang = useCallback((lang: 'en' | 'zh') => {
    setState(s => ({ ...s, lang }));
  }, []);

  const toggleTopicExpand = useCallback((topicId: string) => {
    setState(s => {
      const next = new Set(s.expandedTopics);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return { ...s, expandedTopics: next };
    });
  }, []);

  const currentTopic = state.topics.find(t => t.id === state.topicId);
  const currentFile = currentTopic?.files.find(f => f.slug === state.fileSlug);

  return { ...state, currentTopic, currentFile, navigate, setLang, toggleTopicExpand };
}
