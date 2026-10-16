import React from 'react';

interface DestinationSelectorProps {
  currentNodeId: string;
  destinationId: string;
  onDestinationChange: (dest: string) => void;
}

const PRESET_NODES = ['Node-A', 'Node-B', 'Node-C', 'Node-D', 'Node-E'];

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  currentNodeId,
  destinationId,
  onDestinationChange,
}) => {
  return (
    <div className="dest-container">
      <div className="dest-input-row">
        <label className="dest-label">Target Destination:</label>
        <input
          type="text"
          className="dest-input"
          value={destinationId}
          placeholder="e.g. Node-B"
          onChange={(e) => onDestinationChange(e.target.value)}
        />
      </div>

      <div className="dest-presets">
        <span className="presets-label">Topology Quick-Pick:</span>
        <div className="preset-buttons">
          {PRESET_NODES.map((node) => {
            const isSelf = node.toUpperCase() === currentNodeId.toUpperCase();
            const isSelected = node.toUpperCase() === destinationId.toUpperCase();
            return (
              <button
                key={node}
                className={`preset-btn ${isSelected ? 'selected' : ''} ${isSelf ? 'self' : ''}`}
                disabled={isSelf}
                onClick={() => onDestinationChange(node)}
                title={isSelf ? 'Cannot route to self' : `Route to ${node}`}
              >
                {node} {isSelf && '(Self)'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
