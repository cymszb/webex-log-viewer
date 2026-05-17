import { useState } from 'react';
import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';
import { WelcomePage } from './components/WelcomePage';

type View = 'welcome' | 'browse';

export default function App() {
  const hub = useHubState();
  const [view, setView] = useState<View>('welcome');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', padding: '0 32px', gap: 2,
        background: 'rgba(9,12,18,0.85)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid #1e2633',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setView('welcome')}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: view === 'welcome' ? '#e6edf3' : '#8895aa',
            background: view === 'welcome' ? '#11161e' : 'transparent',
            boxShadow: view === 'welcome' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Welcome
        </button>
        <button
          onClick={() => setView('browse')}
          style={{
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            color: view === 'browse' ? '#e6edf3' : '#8895aa',
            background: view === 'browse' ? '#11161e' : 'transparent',
            boxShadow: view === 'browse' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
          }}
        >
          Browse
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
