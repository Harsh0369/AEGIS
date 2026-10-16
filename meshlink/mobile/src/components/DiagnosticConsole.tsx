import React, { useState } from 'react';
import { type DiagnosticLog } from '../types/Packet.js';

interface DiagnosticConsoleProps {
  logs: DiagnosticLog[];
  onClearLogs: () => void;
  onSimulateInbound: () => void;
}

export const DiagnosticConsole: React.FC<DiagnosticConsoleProps> = ({
  logs,
  onClearLogs,
  onSimulateInbound,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`diagnostic-console ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="console-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="console-title-group">
          <span className="console-icon">⚙️</span>
          <span className="console-title">Diagnostic Packet Log</span>
          <span className="log-count">({logs.length})</span>
        </div>
        <div className="console-controls" onClick={(e) => e.stopPropagation()}>
          <button
            className="console-btn sim-btn"
            onClick={onSimulateInbound}
            title="Simulate inbound packet from neighbor"
          >
            🧪 Test Inbound
          </button>
          <button
            className="console-btn clear-btn"
            onClick={onClearLogs}
            title="Clear all logs"
          >
            🧹 Clear
          </button>
          <button
            className="console-btn toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="console-body">
          {logs.length === 0 ? (
            <div className="console-empty">No diagnostic events recorded.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`log-row level-${log.level.toLowerCase()}`}>
                <span className="log-time">{log.timestamp}</span>
                <span className={`log-level-pill ${log.level.toLowerCase()}`}>
                  {log.level}
                </span>
                <span className="log-msg">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
