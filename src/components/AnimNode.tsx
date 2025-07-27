import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface AnimNodeData {
  label: string;
  nodeType: string;
  color: string;
  inputSockets: string[];
  fullNodeData: any;
}

export const AnimNode = memo(({ data, selected }: NodeProps<AnimNodeData>) => {
  const { label, color, inputSockets } = data;

  return (
    <div 
      className={`anim-node ${selected ? 'selected' : ''}`}
      style={{ 
        borderColor: color,
        boxShadow: selected ? `0 0 0 2px ${color}` : undefined 
      }}
    >
      {/* Node header */}
      <div 
        className="node-header" 
        style={{ backgroundColor: color }}
      >
        <span className="node-title">{label}</span>
      </div>

      {/* Input sockets */}
      <div className="node-content">
        {inputSockets.length > 0 && (
          <div className="input-sockets">
            {inputSockets.map((socketName, index) => (
              <div key={socketName} className="socket-row">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={socketName}
                  className="input-handle"
                  style={{
                    top: `${((index + 1) * 100) / (inputSockets.length + 1)}%`,
                    transform: 'translateY(-50%)'
                  }}
                />
                <div className="socket-label">{socketName}</div>
              </div>
            ))}
          </div>
        )}
        
        {inputSockets.length === 0 && (
          <div className="no-inputs">
            <span className="no-inputs-text">No inputs</span>
          </div>
        )}

        {/* Output socket */}
        <div className="output-section">
          <div className="output-row">
            <div className="output-label">output</div>
            <Handle
              type="source"
              position={Position.Right}
              id="output"
              className="output-handle"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

AnimNode.displayName = 'AnimNode';