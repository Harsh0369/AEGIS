import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header.js';
import { DestinationSelector } from './components/DestinationSelector.js';
import { MessageList } from './components/MessageList.js';
import { MessageInput } from './components/MessageInput.js';
import { DiagnosticConsole } from './components/DiagnosticConsole.js';
import { MeshStateManager } from './state/MeshStateManager.js';
import { createDataPacket } from './types/Packet.js';

declare global {
  interface Window {
    AndroidBridge?: {
      sendPacket?: (packetJson: string) => void;
      getNodeId?: () => string;
      onPacketReceived?: (packetJson: string) => void;
    };
  }
}

export const App: React.FC = () => {
  const manager = useMemo(() => new MeshStateManager('Node-A', 'Node-B'), []);

  const [nodeId, setNodeId] = useState(manager.getNodeId());
  const [destinationId, setDestinationId] = useState(manager.getDestinationId());
  const [connectionStatus, setConnectionStatus] = useState(manager.getConnectionStatus());
  const [messages, setMessages] = useState(manager.getMessages());
  const [logs, setLogs] = useState(manager.getLogs());

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setNodeId(manager.getNodeId());
      setDestinationId(manager.getDestinationId());
      setConnectionStatus(manager.getConnectionStatus());
      setMessages(manager.getMessages());
      setLogs(manager.getLogs());
    });

    // Check if running inside Android Native Web Bridge
    if (window.AndroidBridge) {
      manager.addLog('INFO', 'Android Native Bridge detected and attached.');
      manager.setConnectionStatus('Android Native Bridge Active');
    }

    return () => unsubscribe();
  }, [manager]);

  const handleSendMessage = (payload: string) => {
    const success = manager.sendMessage(payload);
    if (success && window.AndroidBridge?.sendPacket) {
      const msgs = manager.getMessages();
      const latest = msgs[msgs.length - 1];
      if (latest) {
        window.AndroidBridge.sendPacket(JSON.stringify(latest.packet));
      }
    }
  };

  const handleSimulateInbound = () => {
    const simulatedSource = destinationId === 'Node-B' ? 'Node-B' : 'Node-C';
    const packet = createDataPacket(
      simulatedSource,
      nodeId,
      `Ack/Echo payload from ${simulatedSource} to ${nodeId}`,
      8,
    );
    packet.hopCount = 2; // simulated 2 hops
    manager.receiveSimulatedMessage(packet);
  };

  return (
    <div className="meshlink-app">
      <Header
        nodeId={nodeId}
        connectionStatus={connectionStatus}
        onNodeIdChange={(id) => manager.setNodeId(id)}
      />

      <DestinationSelector
        currentNodeId={nodeId}
        destinationId={destinationId}
        onDestinationChange={(dest) => manager.setDestinationId(dest)}
      />

      <div className="main-content-area">
        <div className="chat-section">
          <MessageList messages={messages} />
          <MessageInput
            destinationId={destinationId}
            onSendMessage={handleSendMessage}
          />
        </div>

        <DiagnosticConsole
          logs={logs}
          onClearLogs={() => manager.clearLogs()}
          onSimulateInbound={handleSimulateInbound}
        />
      </div>
    </div>
  );
};
