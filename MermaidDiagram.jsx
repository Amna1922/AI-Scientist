import { useEffect, useMemo, useState } from 'react';
import mermaid from 'mermaid';

let initialized = false;

export default function MermaidDiagram({ chart }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const graph = useMemo(() => chart?.trim() || '', [chart]);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      initialized = true;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!graph) {
        setSvg('');
        setError('');
        return;
      }
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg: markup } = await mermaid.render(id, graph);
        if (!cancelled) {
          setSvg(markup);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid render failed');
          setSvg('');
        }
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (error) return <p className="doc-node-error">{error}</p>;
  if (!svg) return <p className="muted">No Mermaid syntax found.</p>;
  return <div className="mermaid-preview" dangerouslySetInnerHTML={{ __html: svg }} />;
}
