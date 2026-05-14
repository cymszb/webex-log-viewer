import type { ManifestTopic } from '../hooks';

interface SidebarProps {
  topics: ManifestTopic[];
  expandedTopics: Set<string>;
  currentTopicId: string | null;
  currentFileSlug: string | null;
  onNavigate: (topicId: string, fileSlug: string) => void;
  onToggleExpand: (topicId: string) => void;
}

export function Sidebar(_props: SidebarProps) {
  return <aside style={{ width: 230, background: 'var(--color-bg-sidebar)', borderRight: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5a6080', fontSize: 13 }}>Sidebar</aside>;
}
