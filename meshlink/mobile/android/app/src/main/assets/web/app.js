/**
 * MeshLink Mobile — Runtime Application Bundle
 *
 * Implements the interactive React/JS frontend for the Android APK:
 * - Node ID & Target Destination selector
 * - Protocol-compliant packet generation (MeshPacket)
 * - Message thread with hop/TTL diagnostic badges
 * - Monospace live diagnostic log console
 * - Bi-directional Android Native Bridge integration
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    nodeId: 'Node-A',
    destinationId: 'Node-B',
    connectionStatus: 'Offline — Standalone Ready (P0)',
    messages: [],
    logs: [],
    isEditingNodeId: false,
    isConsoleExpanded: true,
  };

  const PRESET_NODES = ['Node-A', 'Node-B', 'Node-C', 'Node-D', 'Node-E'];

  // --- Packet Creation Helper ---
  function createPacket(src, dst, payload, ttl) {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const timeCode = Date.now().toString(36);
    return {
      version: 1,
      messageId: `msg-${timeCode}-${randomSuffix}`,
      sourceId: src,
      destinationId: dst,
      type: 'DATA',
      ttl: ttl !== undefined ? ttl : 10,
      hopCount: 0,
      payload: payload,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Logger ---
  function addLog(level, message) {
    const timeStr = new Date().toLocaleTimeString();
    state.logs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      level: level,
      message: message,
    });
    if (state.logs.length > 80) state.logs.pop();
    renderLogs();
  }

  // --- Actions ---
  function sendMessage(payload) {
    const trimmed = payload.trim();
    if (!trimmed) {
      addLog('WARN', 'Cannot transmit empty payload');
      return;
    }

    if (state.nodeId === state.destinationId) {
      addLog('WARN', `Source and Destination are identical (${state.nodeId}). Self-routing suppressed.`);
    }

    const packet = createPacket(state.nodeId, state.destinationId, trimmed, 10);

    state.messages.push({
      packet: packet,
      status: 'sent',
      isOutbound: true,
    });

    addLog('INFO', `[Created Packet] id=${packet.messageId.substring(0, 8)}... src=${packet.sourceId} dst=${packet.destinationId} ttl=${packet.ttl} payload="${packet.payload}"`);
    addLog('ROUTE', `[Route Lookup] Target ${packet.destinationId} queued (P0: local simulation; P1: dispatched via native transport)`);

    // Forward to Android native bridge if available
    if (window.AndroidBridge && typeof window.AndroidBridge.sendPacket === 'function') {
      try {
        window.AndroidBridge.sendPacket(JSON.stringify(packet));
        addLog('ROUTE', `[Bridge] Packet handed to Android Direct Transport`);
      } catch (e) {
        addLog('ERROR', `[Bridge Error] Failed to send over native bridge: ${e}`);
      }
    }

    renderMessages();
  }

  function simulateInboundPacket() {
    const sender = state.destinationId === 'Node-B' ? 'Node-B' : 'Node-C';
    const packet = createPacket(sender, state.nodeId, `Echo / Test response from ${sender}`, 8);
    packet.hopCount = 2; // 2 intermediate hops

    state.messages.push({
      packet: packet,
      status: 'delivered',
      isOutbound: false,
    });

    addLog('INFO', `[Delivered Inbound] id=${packet.messageId.substring(0, 8)}... from=${packet.sourceId} hops=${packet.hopCount} payload="${packet.payload}"`);
    renderMessages();
  }

  // --- Render Functions ---
  function renderHeader() {
    const container = document.getElementById('header-area');
    if (!container) return;

    let nodeHtml = '';
    if (state.isEditingNodeId) {
      nodeHtml = `
        <div class="node-edit-box">
          <input type="text" id="node-id-input" class="node-input" value="${state.nodeId}" maxlength="12" />
          <button id="btn-save-node" class="btn-small save-btn">Save</button>
        </div>
      `;
    } else {
      nodeHtml = `
        <div class="node-display" id="node-display-box" title="Click to rename local node">
          <span class="node-label">LOCAL NODE:</span>
          <span class="node-id-val">${state.nodeId}</span>
          <span class="edit-hint">✏️</span>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="header-top">
        <div class="logo-section">
          <div class="logo-icon">📡</div>
          <div>
            <h1 class="app-title">MeshLink</h1>
            <p class="app-subtitle">Offline Multi-Hop Mesh Network</p>
          </div>
        </div>
        <div class="node-badge-container">${nodeHtml}</div>
      </div>
      <div class="status-bar">
        <div class="status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">${state.connectionStatus}</span>
        </div>
        <div class="milestone-badge">P0 MVP</div>
      </div>
    `;

    if (state.isEditingNodeId) {
      const input = document.getElementById('node-id-input');
      const btn = document.getElementById('btn-save-node');
      input?.focus();
      btn?.addEventListener('click', () => {
        const val = input.value.trim().toUpperCase();
        if (val) {
          const old = state.nodeId;
          state.nodeId = val;
          addLog('INFO', `Local Node changed: ${old} → ${state.nodeId}`);
        }
        state.isEditingNodeId = false;
        renderHeader();
        renderPresets();
      });
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btn?.click();
      });
    } else {
      document.getElementById('node-display-box')?.addEventListener('click', () => {
        state.isEditingNodeId = true;
        renderHeader();
      });
    }
  }

  function renderPresets() {
    const container = document.getElementById('dest-area');
    if (!container) return;

    const presetButtonsHtml = PRESET_NODES.map((node) => {
      const isSelf = node.toUpperCase() === state.nodeId.toUpperCase();
      const isSelected = node.toUpperCase() === state.destinationId.toUpperCase();
      return `
        <button
          class="preset-btn ${isSelected ? 'selected' : ''} ${isSelf ? 'self' : ''}"
          data-node="${node}"
          ${isSelf ? 'disabled' : ''}
        >${node} ${isSelf ? '(Self)' : ''}</button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="dest-input-row">
        <label class="dest-label">Target Destination:</label>
        <input type="text" id="dest-input-field" class="dest-input" value="${state.destinationId}" placeholder="e.g. Node-B" maxlength="16" />
      </div>
      <div class="dest-presets">
        <span class="presets-label">Topology Quick-Pick:</span>
        <div class="preset-buttons">${presetButtonsHtml}</div>
      </div>
    `;

    const destInput = document.getElementById('dest-input-field');
    destInput?.addEventListener('input', (e) => {
      state.destinationId = e.target.value.trim().toUpperCase();
      renderPresets();
    });

    container.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-node');
        if (target && target.toUpperCase() !== state.nodeId.toUpperCase()) {
          state.destinationId = target;
          addLog('ROUTE', `Routing destination set to: ${state.destinationId}`);
          renderPresets();
        }
      });
    });
  }

  function renderMessages() {
    const container = document.getElementById('messages-area');
    if (!container) return;

    if (state.messages.length === 0) {
      container.innerHTML = `
        <div class="message-list-empty">
          <div class="empty-icon">💬</div>
          <p class="empty-text">No mesh packets transmitted yet.</p>
          <p class="empty-subtext">Compose a message below to test packet generation.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.messages.map((item) => {
      const { packet, status, isOutbound } = item;
      const timeStr = new Date(packet.timestamp).toLocaleTimeString();
      return `
        <div class="message-bubble-wrapper ${isOutbound ? 'outbound' : 'inbound'}">
          <div class="message-bubble ${isOutbound ? 'outbound-bubble' : 'inbound-bubble'}">
            <div class="message-meta-header">
              <span class="route-flow">${isOutbound ? 'To: ' + packet.destinationId : 'From: ' + packet.sourceId}</span>
              <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-payload">${escapeHtml(packet.payload)}</div>
            <div class="packet-diagnostics">
              <span class="pkt-badge id-badge">ID: ${packet.messageId.substring(0, 8)}...</span>
              <span class="pkt-badge ttl-badge">TTL: ${packet.ttl}</span>
              <span class="pkt-badge hops-badge">Hops: ${packet.hopCount}</span>
              <span class="pkt-badge status-badge ${status}">${status.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function renderLogs() {
    const countEl = document.getElementById('log-count');
    const bodyEl = document.getElementById('console-body');
    if (countEl) countEl.textContent = `(${state.logs.length})`;
    if (!bodyEl) return;

    if (state.logs.length === 0) {
      bodyEl.innerHTML = `<div class="console-empty">No diagnostic events recorded.</div>`;
      return;
    }

    bodyEl.innerHTML = state.logs.map((log) => `
      <div class="log-row">
        <span class="log-time">${log.timestamp}</span>
        <span class="log-level-pill ${log.level.toLowerCase()}">${log.level}</span>
        <span class="log-msg">${escapeHtml(log.message)}</span>
      </div>
    `).join('');
  }

  function setupInputBar() {
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('send-btn');

    function submit() {
      if (!input) return;
      const val = input.value;
      if (val.trim()) {
        sendMessage(val);
        input.value = '';
        sendBtn.disabled = true;
      }
    }

    input?.addEventListener('input', () => {
      if (sendBtn) sendBtn.disabled = !input.value.trim();
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    });

    sendBtn?.addEventListener('click', submit);
  }

  function setupConsoleControls() {
    const clearBtn = document.getElementById('btn-clear-logs');
    const simBtn = document.getElementById('btn-sim-inbound');
    const toggleBtn = document.getElementById('btn-toggle-console');
    const consoleEl = document.getElementById('diagnostic-console');

    clearBtn?.addEventListener('click', () => {
      state.logs = [];
      renderLogs();
    });

    simBtn?.addEventListener('click', () => {
      simulateInboundPacket();
    });

    toggleBtn?.addEventListener('click', () => {
      state.isConsoleExpanded = !state.isConsoleExpanded;
      if (consoleEl) {
        consoleEl.className = `diagnostic-console ${state.isConsoleExpanded ? 'expanded' : 'collapsed'}`;
      }
      toggleBtn.textContent = state.isConsoleExpanded ? '▼' : '▲';
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Global Native Bridge Callback ---
  window.onNativePacketReceived = function (packetJson) {
    try {
      const packet = JSON.parse(packetJson);
      state.messages.push({
        packet: packet,
        status: 'delivered',
        isOutbound: false,
      });
      addLog('INFO', `[Native Link] Inbound packet delivered: ${packet.messageId.substring(0, 8)}... from ${packet.sourceId}`);
      renderMessages();
    } catch (e) {
      addLog('ERROR', `Failed to parse native packet: ${e}`);
    }
  };

  // --- Bootstrap ---
  window.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderPresets();
    renderMessages();
    renderLogs();
    setupInputBar();
    setupConsoleControls();

    addLog('INFO', `MeshLink Mobile initialized for Node: ${state.nodeId}`);
    addLog('INFO', `Diagnostic engine ready. Initial state: Standalone offline.`);

    if (window.AndroidBridge) {
      addLog('INFO', 'Android Native Bridge attached.');
      state.connectionStatus = 'Android Native Bridge Connected';
      renderHeader();
    }
  });
})();
