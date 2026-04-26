import { useMemo, useState } from 'react';
import BackgroundGraph from './components/BackgroundGraph';
import DocumentNodeCard from './components/DocumentNodeCard';
import SectionCard from './components/SectionCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8003';
const EXAMPLES = [
  {
    label: 'Gut health (mice)',
    value:
      'Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay, due to upregulation of tight junction proteins claudin-1 and occludin.',
  },
  {
    label: 'Cell biology',
    value:
      'Replacing sucrose with trehalose in freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points versus standard DMSO protocol due to improved membrane stabilization.',
  },
  {
    label: 'Diagnostics',
    value:
      'A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect CRP in whole blood below 0.5 mg/L within 10 minutes compared to ELISA controls.',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const [hypothesis, setHypothesis] = useState(
    EXAMPLES[0].value
  );
  const [provider] = useState('template');
  const [showExamples, setShowExamples] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoDemoRunning, setAutoDemoRunning] = useState(false);
  const [toast, setToast] = useState('');
  const [stages, setStages] = useState({});
  const [sections, setSections] = useState({});
  const [meta, setMeta] = useState(null);
  const [docTitle, setDocTitle] = useState('Experimental Research Proposal');
  const [docNodes, setDocNodes] = useState([]);
  const [chatInstruction, setChatInstruction] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [activeNodeId, setActiveNodeId] = useState('');
  const [highlightedNodeId, setHighlightedNodeId] = useState('');
  const [lastSurgicalEdit, setLastSurgicalEdit] = useState(null);
  const [docBusy, setDocBusy] = useState(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [feedback, setFeedback] = useState({ section: 'protocol_steps', correction: '' });

  const orderedSections = useMemo(
    () => ['protocol_steps', 'materials', 'budget', 'timeline', 'validation'].map((key) => sections[key]).filter(Boolean),
    [sections]
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  };

  const runPipelineInternal = async (customHypothesis, useAgentMode = false) => {
    const prompt = customHypothesis || hypothesis;
    setLoading(true);
    setStages({});
    setSections({});
    setMeta(null);
    setDocNodes([]);
    setSelectedNodeId('');
    setAgentLogs([]);

    const response = await fetch(`${API_URL}/api/plan/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesis: prompt,
        llm_provider: 'template',
        llm_model: null,
        agent_mode: useAgentMode,
      }),
    });

    if (!response.ok || !response.body) {
      setLoading(false);
      showToast('Pipeline request failed. Check backend logs.');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        if (!chunk.startsWith('data: ')) continue;
        const payload = JSON.parse(chunk.replace('data: ', ''));

        if (payload.stage === 'section') {
          setSections((prev) => ({ ...prev, [payload.section]: payload.payload }));
        } else if (payload.stage === 'agent_log') {
          setAgentLogs((prev) => [...prev, payload.payload.message]);
        } else if (payload.stage === 'meta') {
          setMeta(payload.payload);
          const modelPayload = payload.payload.document_model;
          if (modelPayload?.nodes?.length) {
            setDocTitle(modelPayload.title || 'Experimental Research Proposal');
            setDocNodes(modelPayload.nodes);
            setSelectedNodeId(modelPayload.nodes[0].id);
            setActiveNodeId(modelPayload.nodes[0].id);
          }
        } else if (payload.stage !== 'done') {
          setStages((prev) => ({ ...prev, [payload.stage]: payload.payload }));
        }

        if (payload.stage === 'done') {
          setLoading(false);
        }
      }
    }
    setLoading(false);
  };

  const runPipeline = async (customHypothesis) => runPipelineInternal(customHypothesis, false);

  const submitFeedback = async (correctionText = feedback.correction) => {
    if (!correctionText.trim() || !meta?.experiment_type) return false;

    const response = await fetch(`${API_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hypothesis,
        section: feedback.section,
        correction: correctionText,
        experiment_type: meta.experiment_type,
      }),
    });
    if (!response.ok) return false;

    setFeedback((prev) => ({ ...prev, correction: '' }));
    showToast('Feedback saved. Re-run to show learning loop.');
    return true;
  };

  const runScriptedDemo = async () => {
    if (loading || autoDemoRunning) return;
    setAutoDemoRunning(true);
    setAgentLogs([]);

    const scriptedHypothesis = EXAMPLES[0].value;
    setHypothesis(scriptedHypothesis);
    await runAgentMode(scriptedHypothesis);

    setFeedback({ section: 'protocol_steps', correction: 'Increase LGG dosing to 5*10^9 CFU and add daily stool consistency scoring.' });
    const savedProtocol = await submitFeedback('Increase LGG dosing to 5*10^9 CFU and add daily stool consistency scoring.');

    setFeedback({ section: 'validation', correction: 'Add interim FITC read at week 2 to catch early responders and reduce false negatives.' });
    const savedValidation = await submitFeedback('Add interim FITC read at week 2 to catch early responders and reduce false negatives.');

    if (!savedProtocol || !savedValidation) {
      showToast('Could not save scripted review corrections.');
      setAutoDemoRunning(false);
      return;
    }

    await runAgentMode(scriptedHypothesis);
    showToast('Scripted demo complete: review loop applied and plan visibly improved.');
    setAutoDemoRunning(false);
  };

  const runAgentMode = async (customHypothesis) => {
    if (loading) return;
    return runPipelineInternal(customHypothesis, true);
  };

  const updateNodeContent = (nodeId, content) => {
    setDocNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, content } : node)));
    setActiveNodeId(nodeId);
  };

  const pickTargetNode = (instruction) => {
    const text = instruction.toLowerCase();
    if ((text.includes('this') || text.includes('here')) && activeNodeId) {
      return activeNodeId;
    }
    const sectionHints = [
      { terms: ['method', 'methodology', 'protocol'], section: 'protocol_steps' },
      { terms: ['material', 'supply', 'reagent'], section: 'materials' },
      { terms: ['budget', 'cost', 'price'], section: 'budget' },
      { terms: ['timeline', 'schedule', 'gant'], section: 'timeline' },
      { terms: ['validation', 'result', 'analysis', 'outcome'], section: 'validation' },
      { terms: ['reference', 'citation'], section: 'citations' },
    ];
    for (const hint of sectionHints) {
      if (hint.terms.some((term) => text.includes(term))) {
        const bySection = docNodes.find((node) => node.metadata?.section === hint.section && node.type !== 'heading');
        if (bySection) return bySection.id;
      }
    }
    return selectedNodeId || activeNodeId || docNodes[0]?.id || '';
  };

  const applyHighlight = (nodeId) => {
    setHighlightedNodeId(nodeId);
    setTimeout(() => setHighlightedNodeId(''), 1600);
  };

  const addSugiyamaToNode = (targetNodeId) => {
    const diagramNode = {
      id: `n-diagram-${Date.now()}`,
      type: 'diagram',
      content: 'flowchart LR\nA[Randomize] --> B[Intervention]\nB --> C[FITC Assay]\nC --> D[Analysis]',
      metadata: { section: 'diagram', source: 'chat-insert', anchor: targetNodeId },
    };
    setDocNodes((prev) => {
      const idx = prev.findIndex((node) => node.id === targetNodeId);
      if (idx < 0) return [...prev, diagramNode];
      const next = [...prev];
      next.splice(idx + 1, 0, diagramNode);
      return next;
    });
    setSelectedNodeId(diagramNode.id);
    setActiveNodeId(diagramNode.id);
    applyHighlight(diagramNode.id);
    setLastSurgicalEdit({ target_node_id: diagramNode.id, action: 'append', content: diagramNode.content });
  };

  const applyChatUpdate = async () => {
    if (!chatInstruction.trim() || !docNodes.length) return;
    const targetId = pickTargetNode(chatInstruction);
    if (!targetId) return;
    const target = docNodes.find((n) => n.id === targetId);
    if (!target) return;

    const instructionLower = chatInstruction.toLowerCase();
    if (instructionLower.includes('sugiyama') || instructionLower.includes('plot')) {
      addSugiyamaToNode(targetId);
      setChatInstruction('');
      return;
    }

    const action = instructionLower.includes('replace') || instructionLower.includes('rewrite') ? 'replace' : 'append';
    setDocBusy(true);
    const response = await fetch(`${API_URL}/api/doc-studio/update-node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: targetId,
        action,
        instruction: chatInstruction,
        hypothesis,
        llm_provider: 'template',
        llm_model: null,
        current_content: target.content,
      }),
    });
    if (!response.ok) {
      showToast('Doc chat update failed.');
      setDocBusy(false);
      return;
    }
    const payload = await response.json();
    updateNodeContent(payload.target_node_id, payload.content);
    setSelectedNodeId(payload.target_node_id);
    setLastSurgicalEdit(payload);
    applyHighlight(payload.target_node_id);
    setChatInstruction('');
    setDocBusy(false);
  };

  const addDiagramNode = () => {
    const id = `n-diagram-${Date.now()}`;
    const node = {
      id,
      type: 'diagram',
      content: 'flowchart TD\nA[Hypothesis] --> B[Methodology]\nB --> C[Evaluation]',
      metadata: { section: 'diagram', source: 'doc-studio' },
    };
    setDocNodes((prev) => [...prev, node]);
    setSelectedNodeId(id);
    setActiveNodeId(id);
  };

  const exportDocx = async () => {
    if (!docNodes.length) return;
    setDocBusy(true);
    const response = await fetch(`${API_URL}/api/doc-studio/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: docTitle, nodes: docNodes }),
    });
    if (!response.ok) {
      showToast('Docx export failed.');
      setDocBusy(false);
      return;
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'proposal.docx';
    link.click();
    URL.revokeObjectURL(href);
    setDocBusy(false);
  };

  const validator = stages.validator;
  const safety = stages.safety;
  const literature = stages.literature;
  const synthesis = stages.synthesis;
  const evaluation = meta?.evaluation;
  const trustLayer = meta?.trust_layer;
  const simulation = meta?.simulation;
  const confidenceAvg = orderedSections.length
    ? Math.round((orderedSections.reduce((acc, section) => acc + (section.confidence || 0), 0) / orderedSections.length) * 100)
    : null;
  const efficiencyScore = evaluation
    ? Math.max(
        0,
        Math.min(
          100,
          100
            - Math.floor((evaluation.total_latency_ms || 0) / 120)
            + (evaluation.references_found || 0) * 4
            + Math.round((evaluation.section_confidence_avg || 0) * 10)
        )
      )
    : null;
  const stageScore = [
    Boolean(validator),
    Boolean(safety),
    Boolean(literature),
    Boolean(synthesis),
    orderedSections.length === 5,
  ].filter(Boolean).length;

  return (
    <>
    <BackgroundGraph />
    <main className="app">
      <header className="hero">
        <div>
          <h1>AI Scientist</h1>
          <p>Protocol Crystallization: typed graph -&gt; constrained synthesis -&gt; confidence-scored streamed plan.</p>
        </div>
        <div className="hero-metrics">
          <div>
            <span className="muted">Pipeline progress</span>
            <strong>{stageScore}/5 stages</strong>
          </div>
          <div>
            <span className="muted">Provider</span>
            <strong>{provider}</strong>
          </div>
          <div>
            <span className="muted">Avg confidence</span>
            <strong>{confidenceAvg !== null ? `${confidenceAvg}%` : '—'}</strong>
          </div>
        </div>
      </header>

      <section className="tab-nav">
        <button className={activeTab === 'planner' ? 'tab active' : 'tab'} onClick={() => setActiveTab('planner')}>Experiment Planner</button>
        <button className={activeTab === 'docstudio' ? 'tab active' : 'tab'} onClick={() => setActiveTab('docstudio')}>Doc Studio</button>
      </section>

      {activeTab === 'planner' ? (
      <>
      <section className="input-card elevated">
        <div className="toolbar">
          <div className="toolbar-group">
            <button className="ghost" onClick={() => setShowExamples((prev) => !prev)} disabled={loading}>
              {showExamples ? 'Hide examples' : 'Show examples'}
            </button>
            {showExamples
              ? EXAMPLES.map((example) => (
                  <button key={example.label} className="ghost" onClick={() => setHypothesis(example.value)} disabled={loading}>
                    {example.label}
                  </button>
                ))
              : null}
          </div>
          <div className="toolbar-group">
            <span className="mode-pill">RAG template mode (no LLM APIs)</span>
          </div>
        </div>
        <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={5} />
        <div className="action-row">
          <button onClick={() => runPipeline()} disabled={loading}>
            {loading ? 'Generating...' : 'Generate experiment plan'}
          </button>
          <button className="secondary" onClick={() => runAgentMode()} disabled={loading}>
            {loading ? 'Agent running...' : 'Run planning agent'}
          </button>
          <button className="secondary" onClick={runScriptedDemo} disabled={loading || autoDemoRunning}>
            {autoDemoRunning ? 'Running scripted demo...' : 'Run 30-second scripted demo'}
          </button>
        </div>
      </section>

      {agentLogs.length ? (
        <section className="meta-card elevated">
          <h2>Agent execution log</h2>
          <div className="agent-log">
            {agentLogs.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>)}
          </div>
        </section>
      ) : null}

      <section className="status-grid">
        <div className="status-card">
          <h2>Stage 1 — Validator</h2>
          {validator ? (
            <>
              <p>{validator.is_valid ? 'Valid hypothesis structure.' : `Missing: ${validator.missing_fields.join(', ')}`}</p>
              <p className="muted">Intervention: {validator.extracted.intervention || '-'}</p>
            </>
          ) : <p className="muted">Waiting...</p>}
        </div>

        <div className="status-card">
          <h2>Stage 2 — Safety gate</h2>
          {safety ? <p>{safety.decision.toUpperCase()}: {safety.reasons.join(' ')}</p> : <p className="muted">Waiting...</p>}
        </div>

        <div className="status-card">
          <h2>Stage 3 — Parallel literature probe</h2>
          {literature ? (
            <>
              <p className="novelty">Novelty signal: {literature.novelty_signal}</p>
              <ul>
                {literature.references.map((ref, i) => (
                  <li key={`${ref.source}-${i}`}><a href={ref.url} target="_blank">{ref.title}</a> ({ref.source})</li>
                ))}
              </ul>
            </>
          ) : <p className="muted">Waiting...</p>}
        </div>

        <div className="status-card">
          <h2>Stage 4 — Constraint synthesis</h2>
          {synthesis ? (
            <p>
              Requested provider: <strong>{synthesis.provider_requested}</strong> | LLM-generated:{' '}
              <strong>{synthesis.llm_generated ? 'yes' : 'no (template fallback)'}</strong>
            </p>
          ) : (
            <p className="muted">Waiting...</p>
          )}
        </div>
      </section>

      <section className="sections-grid">
        {orderedSections.map((section) => <SectionCard key={section.title} {...section} />)}
      </section>

      {meta ? (
        <section className="meta-card">
          <h2>Protocol graph metadata</h2>
          <p>Fingerprint: <code>{meta.metadata.hypothesis_fingerprint.slice(0, 16)}...</code></p>
          <p>Experiment type: {meta.experiment_type}</p>
          <p>Prior corrections loaded: {meta.prior_feedback?.length || 0}</p>
          <p>Provider used: {meta.metadata.llm_provider_used}</p>
        </section>
      ) : null}

      {evaluation ? (
        <section className="meta-card elevated">
          <h2>Evaluation matrix</h2>
          <div className="matrix-grid">
            <div className="matrix-item"><span>Total latency</span><strong>{evaluation.total_latency_ms} ms</strong></div>
            <div className="matrix-item"><span>Literature latency</span><strong>{evaluation.stage_latency_ms.literature} ms</strong></div>
            <div className="matrix-item"><span>Sections streamed</span><strong>{evaluation.sections_streamed}</strong></div>
            <div className="matrix-item"><span>References found</span><strong>{evaluation.references_found}</strong></div>
            <div className="matrix-item"><span>Validator pass</span><strong>{evaluation.validator_passed ? 'yes' : 'no'}</strong></div>
            <div className="matrix-item"><span>Safety decision</span><strong>{evaluation.safety_decision}</strong></div>
            <div className="matrix-item"><span>Confidence avg</span><strong>{Math.round(evaluation.section_confidence_avg * 100)}%</strong></div>
            <div className="matrix-item"><span>Efficiency score</span><strong>{efficiencyScore}/100</strong></div>
            <div className="matrix-item"><span>Trust coverage</span><strong>{evaluation.trust_coverage}</strong></div>
            <div className="matrix-item"><span>Uncertainty flags</span><strong>{evaluation.uncertainty_flags_count}</strong></div>
          </div>
        </section>
      ) : null}

      {trustLayer ? (
        <section className="meta-card elevated">
          <h2>Trust layer</h2>
          <p><strong>Consensus:</strong> {trustLayer.consensus.agreement}</p>
          {trustLayer.uncertainty_flags?.length ? (
            <div className="flags-list">
              {trustLayer.uncertainty_flags.map((flag, idx) => <p key={`${flag}-${idx}`}>⚠ {flag}</p>)}
            </div>
          ) : <p className="muted">No major uncertainty flags detected.</p>}
          <div className="provenance-grid">
            {Object.entries(trustLayer.provenance_graph).map(([sectionKey, nodes]) => (
              <div key={sectionKey} className="provenance-card">
                <h3>{sectionKey}</h3>
                {(nodes || []).map((node, idx) => (
                  <div key={`${sectionKey}-${idx}`} className="provenance-node">
                    <a href={node.url} target="_blank">{node.title}</a>
                    <p className="muted">Similarity: {Math.round((node.similarity || 0) * 100)}% | Status: {node.status}</p>
                    <p className="muted">{node.chunk}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {simulation ? (
        <section className="meta-card elevated">
          <h2>Outcome simulation</h2>
          <div className="matrix-grid">
            <div className="matrix-item"><span>Expected effect mean</span><strong>{simulation.expected_effect_mean_pct}%</strong></div>
            <div className="matrix-item"><span>Effect interval (P10-P90)</span><strong>{simulation.expected_effect_p10_pct}% to {simulation.expected_effect_p90_pct}%</strong></div>
            <div className="matrix-item"><span>Probability of success</span><strong>{Math.round(simulation.probability_of_success * 100)}%</strong></div>
            <div className="matrix-item"><span>Assumed n/group</span><strong>{simulation.assumed_n_per_group}</strong></div>
            <div className="matrix-item"><span>Recommended n/group</span><strong>{simulation.recommended_n_per_group}</strong></div>
          </div>
        </section>
      ) : null}

      <section className="feedback-card elevated">
        <h2>Stretch goal — scientist review loop</h2>
        <div className="feedback-controls">
          <select value={feedback.section} onChange={(e) => setFeedback((prev) => ({ ...prev, section: e.target.value }))}>
            <option value="protocol_steps">Protocol</option>
            <option value="materials">Materials</option>
            <option value="budget">Budget</option>
            <option value="timeline">Timeline</option>
            <option value="validation">Validation</option>
          </select>
          <input
            value={feedback.correction}
            placeholder="Example: use 5*10^9 CFU not 10^9"
            onChange={(e) => setFeedback((prev) => ({ ...prev, correction: e.target.value }))}
          />
          <button onClick={() => submitFeedback()}>Save correction</button>
        </div>
      </section>
      </>
      ) : (
        <section className="doc-studio elevated">
          <div className="doc-studio-toolbar">
            <h2>Smart Document Studio</h2>
            <div className="doc-studio-actions">
              <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} />
              <button className="secondary" onClick={addDiagramNode} disabled={docBusy}>Add diagram</button>
            </div>
          </div>
          <div className="doc-studio-layout">
            <aside className="doc-chat">
              <h3>Chat to edit the document</h3>
              <p className="muted">Type natural instructions, and the editor maps them to the right node automatically.</p>
              <textarea
                rows={6}
                value={chatInstruction}
                onChange={(e) => setChatInstruction(e.target.value)}
                placeholder='Try: expand the methodology, add a Sugiyama plot to the results, or add a plot for this.'
              />
              <button onClick={applyChatUpdate} disabled={docBusy || !docNodes.length}>
                {docBusy ? 'Updating...' : 'Apply update'}
              </button>
              {lastSurgicalEdit ? (
                <pre className="surgical-result">{JSON.stringify(lastSurgicalEdit, null, 2)}</pre>
              ) : null}
            </aside>
            <div className="doc-preview">
              <div className="doc-sheet">
                {docNodes.length ? docNodes.map((node) => (
                  <DocumentNodeCard
                    key={node.id}
                    node={node}
                    onChange={updateNodeContent}
                    onActivate={(nodeId) => {
                      setActiveNodeId(nodeId);
                      setSelectedNodeId(nodeId);
                    }}
                    highlight={highlightedNodeId === node.id}
                  />
                )) : <p className="muted">Generate a plan in Experiment Planner to start Doc Studio.</p>}
              </div>
              <button className="floating-export" onClick={exportDocx} disabled={docBusy || !docNodes.length}>
                Export to .docx
              </button>
            </div>
          </div>
        </section>
      )}
      {toast ? <div className="toast">{toast}</div> : null}
    </main>
    </>
  );
}
