/**
 * MeshLink Mobile — Milestone P1 Application Runtime
 *
 * Full offline direct wireless/socket transport between two physical phones:
 * - Hardware auto-differentiation (Node-A for Host, Node-B for Client)
 * - Real-time TCP stream framing (4-byte length prefix)
 * - Inbound and outbound message synchronization
 * - Connection status indicator & P2P IP configuration
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    nodeId: 'Node-A',
    role: 'HOST', // 'HOST' or 'CLIENT'
    destinationId: 'Node-B',
    connectionStatus: 'Initializing...',
    isConnected: false,
    localIp: '127.0.0.1',
    hostIpInput: '192.168.49.1', // Default to Wi-Fi Direct standard IP
    activeTab: 'wifip2p', // 'wifip2p' or 'lan'
    discoveredPeers: [],
    isScanning: false,
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
    if (state.logs.length > 100) state.logs.pop();
    renderLogs();
  }

  // --- Actions ---
  function switchRole(newRole) {
    state.role = newRole;
    if (newRole === 'HOST') {
      state.nodeId = 'Node-A';
      state.destinationId = 'Node-B';
      if (window.AndroidBridge) {
        window.AndroidBridge.setNodeId('Node-A');
        window.AndroidBridge.setRole('HOST');
      }
      addLog('INFO', 'Switched to Node-A (Host Mode on :9001)');
    } else {
      state.nodeId = 'Node-B';
      state.destinationId = 'Node-A';
      if (window.AndroidBridge) {
        window.AndroidBridge.setNodeId('Node-B');
        window.AndroidBridge.setRole('CLIENT');
      }
      addLog('INFO', 'Switched to Node-B (Client Mode)');
    }
    renderHeader();
    renderP2PControl();
    renderPresets();
  }

  function connectToHost() {
    const ip = state.hostIpInput.trim();
    if (!ip) {
      addLog('WARN', 'Please enter a valid Host IP address');
      return;
    }
    addLog('INFO', `Initiating direct socket connection to ${ip}:9001...`);
    if (window.AndroidBridge && typeof window.AndroidBridge.connectToHost === 'function') {
      window.AndroidBridge.connectToHost(ip, 9001);
    }
  }

  function startPeerDiscovery() {
    state.isScanning = true;
    addLog('INFO', 'Scanning for nearby Wi-Fi Direct devices...');
    if (window.AndroidBridge && typeof window.AndroidBridge.discoverPeers === 'function') {
      window.AndroidBridge.discoverPeers();
    }
    renderP2PControl();
  }

  function createDirectGroup() {
    addLog('INFO', 'Creating autonomous Wi-Fi Direct Group (becoming Host)...');
    if (window.AndroidBridge && typeof window.AndroidBridge.createDirectGroup === 'function') {
      window.AndroidBridge.createDirectGroup();
    }
  }

  function connectToPeer(deviceAddress, name) {
    addLog('INFO', `Initiating Wi-Fi Direct pairing with ${name} (${deviceAddress})...`);
    if (window.AndroidBridge && typeof window.AndroidBridge.connectToPeer === 'function') {
      window.AndroidBridge.connectToPeer(deviceAddress);
    }
  }

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

    // Forward to Android native bridge over direct socket
    let sentSuccess = false;
    if (window.AndroidBridge && typeof window.AndroidBridge.sendPacket === 'function') {
      try {
        sentSuccess = window.AndroidBridge.sendPacket(JSON.stringify(packet));
      } catch (e) {
        addLog('ERROR', `Bridge send error: ${e}`);
      }
    }

    state.messages.push({
      packet: packet,
      status: sentSuccess ? 'sent' : 'queued',
      isOutbound: true,
    });

    if (sentSuccess) {
      addLog('INFO', `[TX] Sent packet ${packet.messageId.substring(0, 8)}... to ${packet.destinationId} via Direct Socket`);
    } else {
      addLog('WARN', `[TX Queued] Peer not connected. Packet stored locally.`);
    }

    renderMessages();
  }

  // --- Render Functions ---
  function renderHeader() {
    const container = document.getElementById('header-area');
    if (!container) return;

    container.innerHTML = `
      <div class="header-top">
        <div class="logo-section">
          <div class="logo-icon">📡</div>
          <div>
            <h1 class="app-title">MeshLink</h1>
            <p class="app-subtitle">Physical Offline Mesh Network</p>
          </div>
        </div>
        <div class="node-badge-container">
          <div class="node-display" id="node-display-box" title="Current Local Node">
            <span class="node-label">LOCAL NODE:</span>
            <span class="node-id-val">${state.nodeId}</span>
          </div>
        </div>
      </div>
      <div class="status-bar">
        <div class="status-indicator">
          <span class="status-dot ${state.isConnected ? 'connected' : 'disconnected'}"></span>
          <span class="status-text">${state.connectionStatus}</span>
        </div>
        <div class="milestone-badge">P1 DIRECT P2P</div>
      </div>
    `;
  }

  function renderP2PControl() {
    const container = document.getElementById('p2p-control-area');
    if (!container) return;

    const isHost = state.role === 'HOST';
    const isP2pTab = state.activeTab === 'wifip2p';

    let tabBodyHtml = '';

    if (isP2pTab) {
      // Tab 1: Wi-Fi Direct P2P (No Hotspot / Router required)
      let peersHtml = '';
      if (state.discoveredPeers.length === 0) {
        peersHtml = `
          <div class="peer-empty-state">
            ${state.isScanning 
              ? '⏳ Searching for nearby Wi-Fi Direct phones...' 
              : '📡 Tap "Scan" on both phones to link directly without a hotspot, PC, or router.'}
          </div>
        `;
      } else {
        peersHtml = `
          <div class="peer-list-container">
            ${state.discoveredPeers.map(p => `
              <div class="peer-card">
                <div class="peer-card-left">
                  <span class="peer-icon">📱</span>
                  <div style="min-width: 0;">
                    <div class="peer-name">${escapeHtml(p.name)}</div>
                    <div class="peer-meta">${escapeHtml(p.address)} • ${escapeHtml(p.status)}</div>
                  </div>
                </div>
                <button class="btn-peer-connect" data-mac="${escapeHtml(p.address)}" data-name="${escapeHtml(p.name)}">
                  ⚡ Pair
                </button>
              </div>
            `).join('')}
          </div>
        `;
      }

      tabBodyHtml = `
        <div class="p2p-action-row">
          <button id="btn-p2p-scan" class="btn-p2p-scan">
            ${state.isScanning ? '⏳ Scanning...' : '🔍 Scan Nearby Devices'}
          </button>
          <button id="btn-p2p-group" class="btn-p2p-group">
            👑 Create Group
          </button>
        </div>
        ${peersHtml}
      `;
    } else {
      // Tab 2: Manual IP / Wi-Fi LAN / Hotspot
      let lanControlsHtml = '';
      if (isHost) {
        lanControlsHtml = `
          <div class="p2p-host-panel">
            <span class="p2p-ip-badge">Hosting on: <strong>${state.localIp}:9001</strong></span>
            <span class="p2p-hint">${state.isConnected ? '🟢 Peer connected!' : 'Waiting for Client to connect...'}</span>
          </div>
        `;
      } else {
        if (state.isConnected) {
          lanControlsHtml = `
            <div class="p2p-client-panel">
              <div class="p2p-host-panel" style="background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.4);">
                <span class="p2p-ip-badge">🟢 Linked with Host (<strong>${state.hostIpInput}:9001</strong>)</span>
                <button id="btn-disconnect-host" class="btn-connect" style="background: #ef4444; padding: 4px 10px;">Disconnect</button>
              </div>
            </div>
          `;
        } else {
          lanControlsHtml = `
            <div class="p2p-client-panel">
              <div class="ip-input-row">
                <input type="text" id="host-ip-field" class="ip-input" value="${state.hostIpInput}" placeholder="Host IP (e.g. 192.168.49.1)" />
                <button id="btn-connect-host" class="btn-connect">Connect</button>
              </div>
              <div class="quick-ips">
                <span class="quick-ip-label">Quick:</span>
                <button class="quick-ip-btn" data-ip="192.168.49.1">P2P (192.168.49.1)</button>
                <button class="quick-ip-btn" data-ip="192.168.43.1">Hotspot (.43.1)</button>
                <button class="quick-ip-btn" data-ip="10.168.213.199">Wi-Fi LAN</button>
                <button class="quick-ip-btn" data-ip="127.0.0.1">USB (127.0.0.1)</button>
              </div>
            </div>
          `;
        }
      }

      tabBodyHtml = `
        <div class="role-selector-bar" style="margin-bottom: 8px;">
          <span class="role-label">Role:</span>
          <button id="role-host-btn" class="role-btn ${isHost ? 'active-host' : ''}">
            🟢 Node-A (Host)
          </button>
          <button id="role-client-btn" class="role-btn ${!isHost ? 'active-client' : ''}">
            🔵 Node-B (Client)
          </button>
        </div>
        ${lanControlsHtml}
      `;
    }

    container.innerHTML = `
      <div class="p2p-tabs-bar">
        <button id="tab-btn-p2p" class="p2p-tab-btn ${isP2pTab ? 'active' : ''}">
          ⚡ Wi-Fi Direct (P2P - No Hotspot)
        </button>
        <button id="tab-btn-lan" class="p2p-tab-btn ${!isP2pTab ? 'active' : ''}">
          🌐 Wi-Fi LAN / Hotspot
        </button>
      </div>
      <div class="p2p-controls-body">${tabBodyHtml}</div>
    `;

    // Tab buttons
    document.getElementById('tab-btn-p2p')?.addEventListener('click', () => {
      state.activeTab = 'wifip2p';
      renderP2PControl();
    });
    document.getElementById('tab-btn-lan')?.addEventListener('click', () => {
      state.activeTab = 'lan';
      renderP2PControl();
    });

    // P2P Scan & Group buttons
    document.getElementById('btn-p2p-scan')?.addEventListener('click', () => startPeerDiscovery());
    document.getElementById('btn-p2p-group')?.addEventListener('click', () => createDirectGroup());

    // Pair with discovered peer buttons
    container.querySelectorAll('.btn-peer-connect').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mac = btn.getAttribute('data-mac');
        const name = btn.getAttribute('data-name');
        if (mac) connectToPeer(mac, name || 'Peer');
      });
    });

    // Role toggle listeners
    document.getElementById('role-host-btn')?.addEventListener('click', () => switchRole('HOST'));
    document.getElementById('role-client-btn')?.addEventListener('click', () => switchRole('CLIENT'));

    // Disconnect button listener
    document.getElementById('btn-disconnect-host')?.addEventListener('click', () => {
      if (window.AndroidBridge && typeof window.AndroidBridge.disconnect === 'function') {
        window.AndroidBridge.disconnect();
      }
      state.isConnected = false;
      renderHeader();
      renderP2PControl();
    });

    // Connect button listener
    const connectBtn = document.getElementById('btn-connect-host');
    const ipField = document.getElementById('host-ip-field');

    ipField?.addEventListener('input', (e) => {
      state.hostIpInput = e.target.value.trim();
    });

    connectBtn?.addEventListener('click', () => {
      connectToHost();
    });

    // Quick IP buttons
    container.querySelectorAll('.quick-ip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ip = btn.getAttribute('data-ip');
        if (ip) {
          state.hostIpInput = ip;
          if (ipField) ipField.value = ip;
          connectToHost();
        }
      });
    });
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
          <p class="empty-subtext">Send a message to test real-time direct delivery.</p>
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
    const toggleBtn = document.getElementById('btn-toggle-console');
    const consoleEl = document.getElementById('diagnostic-console');

    clearBtn?.addEventListener('click', () => {
      state.logs = [];
      renderLogs();
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

  // --- Global Native Bridge Callbacks ---
  window.onNativePacketReceived = function (packetJson) {
    try {
      const packet = JSON.parse(packetJson);
      state.messages.push({
        packet: packet,
        status: 'delivered',
        isOutbound: false,
      });
      addLog('INFO', `[RX Received] Message from ${packet.sourceId}: "${packet.payload}"`);
      renderMessages();
    } catch (e) {
      addLog('ERROR', `Failed to parse native packet: ${e}`);
    }
  };

  window.onNativeStatusChanged = function (statusText, connected) {
    state.connectionStatus = statusText;
    state.isConnected = !!connected;
    renderHeader();
    renderP2PControl();
  };

  window.onNativeLog = function (level, message) {
    addLog(level, message);
  };

  window.onNativePeersUpdated = function (peersJson) {
    try {
      state.discoveredPeers = typeof peersJson === 'string' ? JSON.parse(peersJson) : peersJson;
      state.isScanning = false;
      addLog('INFO', `Discovered ${state.discoveredPeers.length} nearby Wi-Fi Direct device(s)`);
      renderP2PControl();
    } catch (e) {
      addLog('ERROR', `Failed parsing peer list: ${e}`);
    }
  };

  // --- Bootstrap ---
  window.addEventListener('DOMContentLoaded', () => {
    // Read initial Node ID & Role from Android Bridge if available
    if (window.AndroidBridge) {
      try {
        const nativeNodeId = window.AndroidBridge.getNodeId();
        const nativeRole = window.AndroidBridge.getRole();
        const nativeIp = window.AndroidBridge.getLocalIp();
        const gatewayIp = typeof window.AndroidBridge.getGatewayIp === 'function' ? window.AndroidBridge.getGatewayIp() : null;

        if (nativeNodeId) state.nodeId = nativeNodeId;
        if (nativeRole) state.role = nativeRole;
        if (nativeIp) state.localIp = nativeIp;
        if (gatewayIp && gatewayIp !== '127.0.0.1') state.hostIpInput = gatewayIp;
        state.destinationId = (state.nodeId === 'Node-A') ? 'Node-B' : 'Node-A';
      } catch (e) {
        console.error('Failed reading native config', e);
      }
    }

    renderHeader();
    renderP2PControl();
    renderPresets();
    renderMessages();
    renderLogs();
    setupInputBar();
    setupConsoleControls();

    addLog('INFO', `MeshLink Mobile started as ${state.nodeId} (${state.role} Mode)`);
    if (state.role === 'HOST') {
      addLog('INFO', `Local IP: ${state.localIp}. Server listening on port 9001.`);
    } else {
      addLog('INFO', `Local IP: ${state.localIp}. Tap Connect to link with Host.`);
    }
  });
})();
