import type { ManifestTopic, ManifestFile } from '../hooks';

interface ContentAreaProps {
  currentTopic: ManifestTopic | undefined;
  currentFile: ManifestFile | undefined;
  lang: 'en' | 'zh';
  onSetLang: (lang: 'en' | 'zh') => void;
}

export function ContentArea({ currentTopic, currentFile, lang, onSetLang }: ContentAreaProps) {
  return (
    <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6080', fontSize: 13 }}>
      Content Area
    </main>
  );
}
