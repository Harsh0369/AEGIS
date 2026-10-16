package com.meshlink

import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.meshlink.transport.AndroidDirectTransport

/**
 * MeshBridge
 *
 * JavaScript-to-Kotlin native bridge interface.
 * Connects the React mobile UI to the underlying Android transport.
 */
class MeshBridge(
    private val activity: MainActivity,
    private val webView: WebView,
    private val transport: AndroidDirectTransport
) {
    @JavascriptInterface
    fun sendPacket(packetJson: String) {
        activity.runOnUiThread {
            transport.dispatchPacket(packetJson)
        }
    }

    @JavascriptInterface
    fun getNodeId(): String {
        return transport.localNodeId
    }

    fun notifyPacketReceived(packetJson: String) {
        activity.runOnUiThread {
            val script = "if (window.onNativePacketReceived) { window.onNativePacketReceived(${escapeJsString(packetJson)}); }"
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
