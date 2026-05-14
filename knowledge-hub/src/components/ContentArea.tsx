import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LangToggle } from './LangToggle';
import type { ManifestTopic, ManifestFile } from '../hooks';

interface ContentAreaProps {
  currentTopic: ManifestTopic | undefined;
  currentFile: ManifestFile | undefined;
  lang: 'en' | 'zh';
  onSetLang: (lang: 'en' | 'zh') => void;
}

export function ContentArea({ currentTopic, currentFile, lang, onSetLang }: ContentAreaProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentTopic || !currentFile) return;
    setLoading(true);
    const filePath = `./content/${currentTopic.id}/${currentFile.slug}.${lang}.md`;
    fetch(filePath)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then(text => setContent(text))
      .catch(() => setContent('*Content not available in this language.*'))
      .finally(() => setLoading(false));
  }, [currentTopic, currentFile, lang]);

  if (!currentTopic || !currentFile) {
    return (
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Select a file to read
      </main>
    );
  }

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '28px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <LangToggle
          lang={lang}
          availableLanguages={currentFile.languages}
          onChange={onSetLang}
        />
      </div>

      <p style={{ color: '#5a6080', fontSize: 12, marginBottom: 6 }}>
        {currentTopic.name} / {currentFile.name}
      </p>

      {loading ? (
        <p style={{ color: '#5a6080' }}>Loading...</p>
      ) : (
        <div className="prose" style={{ fontSize: 14, lineHeight: 1.75 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </main>
  );
}
