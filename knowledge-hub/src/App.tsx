import { useState } from 'react';
import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';

export default function App() {
  const hub = useHubState();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Single sidebar — CSS handles mobile overlay vs desktop */ }
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
  );
}
