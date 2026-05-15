import { useState } from 'react';
import type { ManifestGroup, ManifestTopic } from '../hooks';

interface SidebarProps {
  groups: ManifestGroup[];
  topics: ManifestTopic[];
  expandedTopics: Set<string>;
  currentTopicId: string | null;
  currentFileSlug: string | null;
  onNavigate: (topicId: string, fileSlug: string) => void;
  onToggleExpand: (topicId: string) => void;
}

export function Sidebar({
  groups, topics, expandedTopics, currentTopicId, currentFileSlug,
  onNavigate, onToggleExpand
}: SidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? topics.map(t => ({
        ...t,
        files: t.files.filter(f =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          t.name.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(t => t.files.length > 0)
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
        {filtered.map(topic => {
          const isExpanded = expandedTopics.has(topic.id);
          const group = groups.find(g => g.id === topic.groupId);
          return (
            <div key={topic.id} style={{ marginBottom: 2 }}>
              {group && (
                <div style={{
                  padding: '6px 8px 2px', fontSize: 10, fontWeight: 600,
                  color: '#3a4468', textTransform: 'uppercase', letterSpacing: '0.1em'
                }}>
                  {group.name}
                </div>
              )}
              <button
                onClick={() => onToggleExpand(topic.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  width: '100%', padding: '8px 6px', border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  background: 'none',
                  color: isExpanded ? '#c8d0e8' : '#5a6080',
                  fontSize: 13, fontWeight: 600, textAlign: 'left',
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
                      padding: '6px 10px 6px 26px', border: 'none',
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
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
