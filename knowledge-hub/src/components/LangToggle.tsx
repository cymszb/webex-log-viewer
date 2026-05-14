interface LangToggleProps {
  lang: 'en' | 'zh';
  availableLanguages: string[];
  onChange: (lang: 'en' | 'zh') => void;
}

export function LangToggle({ lang, availableLanguages, onChange }: LangToggleProps) {
  const langs = [
    { id: 'en' as const, label: 'EN' },
    { id: 'zh' as const, label: '中文' },
  ];

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {langs.map(l => {
        const available = availableLanguages.includes(l.id);
        const isActive = lang === l.id;
        return (
          <button
            key={l.id}
            disabled={!available}
            onClick={() => onChange(l.id)}
            style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 12,
              border: 'none', cursor: available ? 'pointer' : 'default',
              background: isActive ? 'var(--color-bg-active)' : 'transparent',
              color: isActive ? 'var(--color-accent)' : available ? '#5a6080' : '#3a4468',
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
