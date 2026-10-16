import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (payload: string) => void;
  destinationId: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  destinationId,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-bar-container">
      <input
        type="text"
        className="message-input-field"
        placeholder={`Message to ${destinationId || 'recipient'}...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        className="send-button"
        disabled={!text.trim()}
        onClick={handleSend}
      >
        <span className="send-icon">📤</span>
        <span className="send-text">Send</span>
      </button>
    </div>
  );
};
