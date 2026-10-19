package com.meshlink

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.meshlink.transport.AndroidDirectTransport

/**
 * MeshBridge
 *
 * JavaScript-to-Kotlin native bridge interface.
 * Connects the React mobile UI to the underlying Android socket transport.
 */
class MeshBridge(
    private val activity: MainActivity,
    private val webView: WebView,
    private val transport: AndroidDirectTransport
) {
    private val PREFS_NAME = "MeshLinkPrefs"
    private val KEY_NODE_ID = "saved_node_id"
    private val KEY_ROLE = "saved_role"
    private val prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

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
    }

    @JavascriptInterface
    fun getLocalIp(): String {
        return transport.getLocalIpAddress()
    }

    @JavascriptInterface
    fun isConnected(): Boolean {
        return transport.isCurrentlyConnected()
    }

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

    private fun escapeJsString(s: String): String {
        return "'" + s.replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r") + "'"
    }
}
