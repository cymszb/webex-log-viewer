import { useState } from 'react';
import type { ManifestTopic, ManifestFile } from '../hooks';
import './WelcomePage.css';

interface WelcomePageProps {
  topics: ManifestTopic[];
  onNavigate: (topicId: string, fileSlug: string) => void;
}

function collectFiles(topic: ManifestTopic): ManifestFile[] {
  const files = [...(topic.files || [])];
  if (topic.children) {
    for (const child of topic.children) {
      files.push(...collectFiles(child));
    }
  }
  // Sort newest first for welcome page
  files.sort((a, b) => {
    if (a.time && b.time) return b.time.localeCompare(a.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
  return files;
}

function getFileOwner(topic: ManifestTopic, file: ManifestFile): ManifestTopic | null {
  if (topic.files?.some(f => f.slug === file.slug)) return topic;
  if (topic.children) {
    for (const child of topic.children) {
      const owner = getFileOwner(child, file);
      if (owner) return owner;
    }
  }
  return null;
}

function getSourceName(topic: ManifestTopic, file: ManifestFile): string {
  const owner = getFileOwner(topic, file);
  return owner ? owner.name : topic.name;
}

function countSources(topic: ManifestTopic): number {
  if (!topic.children || topic.children.length === 0) return 0;
  return topic.children.filter(c => (c.files?.length || 0) > 0).length;
}

function formatDate(time?: string): string {
  if (!time) return '';
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function WelcomePage({ topics, onNavigate }: WelcomePageProps) {
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const totalArticles = topics.reduce((sum, t) => sum + collectFiles(t).length, 0);
  const totalSources = topics.reduce((sum, t) => sum + countSources(t), 0);
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="welcome-main">
      <div className="welcome-hero">
        <div className="welcome-badge">Updated {today}</div>
        <h1>Knowledge <span>Hub</span></h1>
        <p>Curated engineering articles from the teams behind Claude and GPT — agent architectures, infrastructure at scale, and the craft of building with AI.</p>
      </div>

      <div className="welcome-stats">
        <div className="welcome-stat"><div className="welcome-stat-num">{topics.length}</div><div className="welcome-stat-label">Topics</div></div>
        <div className="welcome-stat"><div className="welcome-stat-num">{totalArticles}</div><div className="welcome-stat-label">Articles</div></div>
        <div className="welcome-stat"><div className="welcome-stat-num">{totalSources}</div><div className="welcome-stat-label">Sources</div></div>
      </div>

      {topics.map(topic => {
        const files = collectFiles(topic);
        const visible = visibleCounts[topic.id] || 5;
        const shown = files.slice(0, visible);
        const hasMore = files.length > visible;

        return (
          <div className="welcome-topic" key={topic.id}>
            <div className="welcome-topic-header">
              <h2>{topic.name}</h2>
              <span className="welcome-topic-count">{files.length} articles</span>
            </div>
            <div className="welcome-article-grid">
              {shown.map(file => (
                <a
                  className="welcome-article-card"
                  key={file.slug}
                  href={`#/${getFileOwner(topic, file)?.id || topic.id}/${file.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(getFileOwner(topic, file)?.id || topic.id, file.slug);
                  }}
                >
                  <div className="welcome-article-top">
                    <span className="welcome-article-path">{getSourceName(topic, file)}</span>
                    <span className="welcome-article-name">{file.name}</span>
                    <span className="welcome-article-time">{formatDate(file.time)}</span>
                  </div>
                  {file.description && (
                    <div className="welcome-article-desc">{file.description}</div>
                  )}
                </a>
              ))}
            </div>
            {hasMore && (
              <button
                className="welcome-show-more"
                onClick={() => setVisibleCounts(prev => ({ ...prev, [topic.id]: visible + 5 }))}
              >
                Show 5 more articles
              </button>
            )}
          </div>
        );
      })}
    </main>
  );
}
