import { useState, useEffect } from 'react';
import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { WelcomePage } from './components/WelcomePage';

type View = 'welcome' | 'browse';
type Theme = 'dark' | 'light';

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'dark'
  );
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === 'dark' ? 'light' : 'dark')];
}

export default function App() {
  const hub = useHubState();
  const [view, setView] = useState<View>('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div className="topbar" style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 2,
        flexShrink: 0,
      }}>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            padding: '9px 14px', borderRadius: 8, fontSize: 18, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: 'var(--color-text-secondary)', background: 'transparent', lineHeight: 1,
          }}
          aria-label="Open sidebar"
        >
          ☰
        </button>
        <button
          onClick={() => setView('welcome')}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: view === 'welcome' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            background: view === 'welcome' ? 'var(--color-bg-surface)' : 'transparent',
            boxShadow: view === 'welcome' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Welcome
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: '1px solid var(--color-border-default)',
            fontFamily: 'inherit', background: 'transparent',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: theme === 'dark' ? '#fcd34d' : '#f59e0b',
            boxShadow: theme === 'dark' ? '0 0 6px rgba(252,211,77,0.4)' : 'none',
          }} />
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* View content */}
      {view === 'welcome' ? (
        <WelcomePage topics={hub.topics} onNavigate={(tid, slug) => { hub.navigate(tid, slug); setView('browse'); }} />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div
            className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="sidebar-wrap">
            <Sidebar
              topics={hub.topics}
              expandedTopics={hub.expandedTopics}
              currentTopicId={hub.topicId}
              currentFileSlug={hub.fileSlug}
              onNavigate={(tid, slug) => { hub.navigate(tid, slug); setSidebarOpen(false); }}
              onToggleExpand={hub.toggleTopicExpand}
              onClose={() => setSidebarOpen(false)}
              sidebarOpen={sidebarOpen}
            />
          </div>
          <ContentArea
            currentTopic={hub.currentTopic}
            currentFile={hub.currentFile}
            lang={hub.lang}
            onSetLang={hub.setLang}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        </div>
      )}
    </div>
  );
}
