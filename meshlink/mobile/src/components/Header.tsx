import React, { useState } from 'react';

interface HeaderProps {
  nodeId: string;
  connectionStatus: string;
  onNodeIdChange: (newId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  nodeId,
  connectionStatus,
  onNodeIdChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempId, setTempId] = useState(nodeId);

  const handleSave = () => {
    if (tempId.trim()) {
      onNodeIdChange(tempId.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="header-container">
      <div className="header-top">
        <div className="logo-section">
          <div className="logo-icon">📡</div>
          <div>
            <h1 className="app-title">MeshLink</h1>
            <p className="app-subtitle">Offline Multi-Hop Mesh Network</p>
          </div>
        </div>

        <div className="node-badge-container">
          {isEditing ? (
            <div className="node-edit-box">
              <input
                type="text"
                className="node-input"
                value={tempId}
                onChange={(e) => setTempId(e.target.value)}
                autoFocus
              />
              <button className="btn-small save-btn" onClick={handleSave}>
                Save
              </button>
            </div>
          ) : (
            <div className="node-display" onClick={() => setIsEditing(true)}>
              <span className="node-label">LOCAL NODE:</span>
              <span className="node-id-val">{nodeId}</span>
              <span className="edit-hint">✏️</span>
            </div>
          )}
        </div>
      </div>

      <div className="status-bar">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span className="status-text">{connectionStatus}</span>
        </div>
        <div className="milestone-badge">P0 MVP</div>
      </div>
    </div>
  );
};
