import React, { useRef, useEffect } from 'react';
import { type DisplayMessage } from '../types/Packet.js';

interface MessageListProps {
  messages: DisplayMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <div className="empty-icon">💬</div>
        <p className="empty-text">No mesh packets transmitted yet.</p>
        <p className="empty-subtext">Compose a message below to test packet generation.</p>
      </div>
    );
  }

  return (
    <div className="message-list-container">
      {messages.map((item, index) => {
        const { packet, status, isOutbound } = item;
        const timeFormatted = new Date(packet.timestamp).toLocaleTimeString();

        return (
          <div
            key={packet.messageId || index}
            className={`message-bubble-wrapper ${isOutbound ? 'outbound' : 'inbound'}`}
          >
            <div className={`message-bubble ${isOutbound ? 'outbound-bubble' : 'inbound-bubble'}`}>
              <div className="message-meta-header">
                <span className="route-flow">
                  {isOutbound ? `To: ${packet.destinationId}` : `From: ${packet.sourceId}`}
                </span>
                <span className="message-time">{timeFormatted}</span>
              </div>

              <div className="message-payload">{packet.payload}</div>

              <div className="packet-diagnostics">
                <span className="pkt-badge id-badge" title="Unique Packet ID">
                  ID: {packet.messageId.substring(0, 8)}...
                </span>
                <span className="pkt-badge ttl-badge" title="Hop Limit (TTL)">
                  TTL: {packet.ttl}
                </span>
                <span className="pkt-badge hops-badge" title="Hops Traversed">
                  Hops: {packet.hopCount}
                </span>
                <span className={`pkt-badge status-badge ${status}`}>
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};
