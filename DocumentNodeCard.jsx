import MermaidDiagram from './MermaidDiagram';

export default function DocumentNodeCard({ node, onChange, onActivate, highlight }) {
  const handleBlur = (e) => {
    onChange(node.id, e.currentTarget.innerText);
  };

  return (
    <article className={`doc-node-card ${highlight ? 'changed' : ''}`} onClick={() => onActivate(node.id)}>
      <div className="doc-node-head">
        <strong>{node.type === 'heading' ? 'Heading' : node.type === 'text' ? 'Paragraph' : node.type}</strong>
        <code>{node.id}</code>
      </div>
      {node.type === 'heading' ? (
        <h3
          className="doc-editable heading"
          contentEditable
          suppressContentEditableWarning
          onFocus={() => onActivate(node.id)}
          onBlur={handleBlur}
        >
          {node.content}
        </h3>
      ) : (
        <div
          className="doc-editable"
          contentEditable
          suppressContentEditableWarning
          onFocus={() => onActivate(node.id)}
          onBlur={handleBlur}
        >
          {node.content}
        </div>
      )}
      {node.type === 'diagram' ? (
        <div className="doc-node-diagram">
          <MermaidDiagram chart={node.content} />
        </div>
      ) : null}
    </article>
  );
}
