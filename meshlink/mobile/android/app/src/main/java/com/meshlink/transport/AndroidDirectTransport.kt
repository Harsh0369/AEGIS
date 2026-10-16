package com.meshlink.transport

import android.util.Log

/**
 * Android Direct Transport
 *
 * Implements the mobile transport interface for Android.
 * In P0, provides the local loopback and native event pipeline.
 * In P1, manages Wi-Fi Direct (WifiP2pManager) socket streams and BLE connections.
 */
class AndroidDirectTransport(var localNodeId: String = "Node-A") {
    private val TAG = "AndroidDirectTransport"
    private var onPacketCallback: ((String) -> Unit)? = null

    fun setOnPacketReceived(callback: (String) -> Unit) {
        this.onPacketCallback = callback
    }

    fun dispatchPacket(packetJson: String) {
        Log.i(TAG, "Dispatching packet: $packetJson")
        // In P0, logs packet dispatch and validates schema.
        // In P1, writes length-prefixed frame to direct Wi-Fi P2P socket.
    }

    fun deliverInbound(packetJson: String) {
        Log.i(TAG, "Delivering inbound packet: $packetJson")
        onPacketCallback?.invoke(packetJson)
    }
}
