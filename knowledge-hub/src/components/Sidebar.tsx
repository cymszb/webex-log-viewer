import { useState } from 'react';
import type { ManifestTopic } from '../hooks';

interface SidebarProps {
  topics: ManifestTopic[];
  expandedTopics: Set<string>;
  currentTopicId: string | null;
  currentFileSlug: string | null;
  onNavigate: (topicId: string, fileSlug: string) => void;
  onToggleExpand: (topicId: string) => void;
}

function TopicRow({
  topic, depth, expandedTopics, currentTopicId, currentFileSlug,
  onNavigate, onToggleExpand
}: {
  topic: ManifestTopic;
  depth: number;
  expandedTopics: Set<string>;
  currentTopicId: string | null;
  currentFileSlug: string | null;
  onNavigate: (topicId: string, fileSlug: string) => void;
  onToggleExpand: (topicId: string) => void;
}) {
  const isExpanded = expandedTopics.has(topic.id);
  const hasChildren = topic.children && topic.children.length > 0;

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggleExpand(topic.id);
          } else if (topic.files.length > 0) {
            // Leaf topic with files: expand and navigate to first file
            onToggleExpand(topic.id);
            if (!isExpanded && topic.files[0]) {
              onNavigate(topic.id, topic.files[0].slug);
            }
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          width: '100%', padding: `8px 6px 8px ${6 + depth * 12}px`, border: 'none',
          borderRadius: 6, cursor: 'pointer',
          background: 'none',
          color: isExpanded ? '#c8d0e8' : '#5a6080',
          fontSize: 13, fontWeight: hasChildren ? 600 : 400, textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: 10, width: 16, flexShrink: 0 }}>
          {isExpanded ? '▼' : '▶'}
        </span>
        {topic.name}
      </button>

      {isExpanded && topic.files.map(file => {
        const isActive = currentTopicId === topic.id && currentFileSlug === file.slug;
        return (
          <button
            key={file.slug}
            onClick={() => onNavigate(topic.id, file.slug)}
            style={{
              display: 'block', width: '100%',
              padding: `6px 10px 6px ${26 + depth * 12}px`, border: 'none',
              borderRadius: 4, cursor: 'pointer',
              background: isActive ? 'var(--color-bg-active)' : 'none',
              color: isActive ? 'var(--color-accent)' : '#8090b8',
              fontSize: 12, fontWeight: isActive ? 500 : 400,
              textAlign: 'left', fontFamily: 'inherit',
            }}
          >
            {file.name}
          </button>
        );
      })}

      {isExpanded && hasChildren && topic.children!.map(child => (
        <TopicRow
          key={child.id}
          topic={child}
          depth={depth + 1}
          expandedTopics={expandedTopics}
          currentTopicId={currentTopicId}
          currentFileSlug={currentFileSlug}
          onNavigate={onNavigate}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  topics, expandedTopics, currentTopicId, currentFileSlug,
  onNavigate, onToggleExpand
}: SidebarProps) {
  const [search, setSearch] = useState('');

  const filteredTopics = search.trim()
    ? topics.map(t => ({
        ...t,
        files: t.files.filter(f =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          t.name.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(t => t.files.length > 0 || (t.children && t.children.length > 0))
    : topics;

  return (
    <aside style={{
      width: 230, background: 'var(--color-bg-sidebar)',
      borderRight: '1px solid var(--color-border-subtle)',
      display: 'flex', flexDirection: 'column', flexShrink: 0
    }}>
      <div style={{ padding: 10 }}>
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', background: '#111520', border: '1px solid #1e2535',
            color: '#8090b8', padding: '6px 10px', borderRadius: 6, fontSize: 12,
            outline: 'none', boxSizing: 'border-box'
          }}
        />
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {filteredTopics.map(topic => (
          <TopicRow
            key={topic.id}
            topic={topic}
            depth={0}
            expandedTopics={expandedTopics}
            currentTopicId={currentTopicId}
            currentFileSlug={currentFileSlug}
            onNavigate={onNavigate}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </nav>
    </aside>
  );
}
