import { useHubState } from './hooks';
import { Sidebar } from './components/Sidebar';
import { ContentArea } from './components/ContentArea';

export default function App() {
  const hub = useHubState();

  if (hub.topics.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#5a6080' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar
        topics={hub.topics}
        expandedTopics={hub.expandedTopics}
        currentTopicId={hub.topicId}
        currentFileSlug={hub.fileSlug}
        onNavigate={hub.navigate}
        onToggleExpand={hub.toggleTopicExpand}
      />
      <ContentArea
        currentTopic={hub.currentTopic}
        currentFile={hub.currentFile}
        lang={hub.lang}
        onSetLang={hub.setLang}
      />
    </div>
  );
}
