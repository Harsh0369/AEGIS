package com.meshlink

import android.content.Context
import android.net.ConnectivityManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.meshlink.transport.AndroidDirectTransport
import com.meshlink.transport.WifiDirectManager
import org.json.JSONArray
import org.json.JSONObject

/**
 * MeshBridge
 *
 * JavaScript-to-Kotlin native bridge interface.
 * Connects the React mobile UI to the underlying Android socket transport
 * and native Wi-Fi Direct discovery engine.
 */
class MeshBridge(
    private val activity: MainActivity,
    private val webView: WebView,
    private val transport: AndroidDirectTransport,
    private var wifiDirectManager: WifiDirectManager? = null
) {
    private val PREFS_NAME = "MeshLinkPrefs"
    private val KEY_NODE_ID = "saved_node_id"
    private val KEY_ROLE = "saved_role"
    private val prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun setWifiDirectManager(manager: WifiDirectManager) {
        this.wifiDirectManager = manager
    }

    @JavascriptInterface
    fun sendPacket(packetJson: String): Boolean {
        return transport.dispatchPacket(packetJson)
    }

    @JavascriptInterface
    fun getNodeId(): String {
        return prefs.getString(KEY_NODE_ID, transport.localNodeId) ?: transport.localNodeId
    }

    @JavascriptInterface
    fun setNodeId(nodeId: String) {
        val trimmed = nodeId.trim().uppercase()
        transport.localNodeId = trimmed
        prefs.edit().putString(KEY_NODE_ID, trimmed).apply()
    }

    @JavascriptInterface
    fun getRole(): String {
        return prefs.getString(KEY_ROLE, if (transport.isHost) "HOST" else "CLIENT") ?: "HOST"
    }

    @JavascriptInterface
    fun setRole(role: String) {
        val upper = role.trim().uppercase()
        prefs.edit().putString(KEY_ROLE, upper).apply()
        if (upper == "HOST") {
            transport.startHost(transport.DEFAULT_PORT)
        } else {
            transport.stop()
        }
    }

    @JavascriptInterface
    fun startHost(port: Int) {
        transport.startHost(port)
    }

    @JavascriptInterface
    fun connectToHost(hostIp: String, port: Int) {
        transport.connectToHost(hostIp.trim(), port)
    }

    @JavascriptInterface
    fun disconnect() {
        transport.stop()
        wifiDirectManager?.removeGroup()
    }

    @JavascriptInterface
    fun getLocalIp(): String {
        return transport.getLocalIpAddress()
    }

    @JavascriptInterface
    fun getGatewayIp(): String {
        try {
            val cm = activity.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            val linkProps = cm?.getLinkProperties(cm.activeNetwork)
            for (route in linkProps?.routes ?: emptyList()) {
                if (route.isDefaultRoute) {
                    val gw = route.gateway?.hostAddress
                    if (!gw.isNullOrEmpty() && gw != "0.0.0.0") return gw
                }
            }
        } catch (_: Exception) {}
        return "192.168.49.1"
    }

    @JavascriptInterface
    fun isConnected(): Boolean {
        return transport.isCurrentlyConnected()
    }

    // --- Native Wi-Fi Direct Control Methods ---

    @JavascriptInterface
    fun discoverPeers() {
        wifiDirectManager?.discoverPeers()
    }

    @JavascriptInterface
    fun stopPeerDiscovery() {
        wifiDirectManager?.stopDiscovery()
    }

    @JavascriptInterface
    fun createDirectGroup() {
        wifiDirectManager?.createGroup()
    }

    @JavascriptInterface
    fun removeDirectGroup() {
        wifiDirectManager?.removeGroup()
    }

    @JavascriptInterface
    fun connectToPeer(deviceAddress: String) {
        wifiDirectManager?.connectToPeer(deviceAddress)
    }

    // --- JS Event Callbacks ---

    fun notifyPacketReceived(packetJson: String) {
        activity.runOnUiThread {
            val script = "if (window.onNativePacketReceived) { window.onNativePacketReceived(${escapeJsString(packetJson)}); }"
            webView.evaluateJavascript(script, null)
        }
    }

    fun notifyStatusChanged(statusText: String, connected: Boolean) {
        activity.runOnUiThread {
            val script = "if (window.onNativeStatusChanged) { window.onNativeStatusChanged(${escapeJsString(statusText)}, $connected); }"
            webView.evaluateJavascript(script, null)
        }
    }

    fun notifyLog(level: String, message: String) {
        activity.runOnUiThread {
            val script = "if (window.onNativeLog) { window.onNativeLog(${escapeJsString(level)}, ${escapeJsString(message)}); }"
            webView.evaluateJavascript(script, null)
        }
    }

    fun notifyPeersUpdated(peers: List<WifiDirectManager.PeerInfo>) {
        activity.runOnUiThread {
            val jsonArray = JSONArray()
            for (p in peers) {
                val obj = JSONObject()
                obj.put("name", p.name)
                obj.put("address", p.address)
                obj.put("status", p.status)
                obj.put("isGroupOwner", p.isGroupOwner)
                jsonArray.put(obj)
            }
            val script = "if (window.onNativePeersUpdated) { window.onNativePeersUpdated(${escapeJsString(jsonArray.toString())}); }"
            webView.evaluateJavascript(script, null)
        }
    }

    private fun escapeJsString(s: String): String {
        return "'" + s.replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r") + "'"
    }
}
