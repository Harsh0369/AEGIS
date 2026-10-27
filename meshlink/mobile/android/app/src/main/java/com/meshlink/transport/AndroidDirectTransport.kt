package com.meshlink.transport

import android.util.Log
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.net.SocketTimeoutException
import java.util.Collections
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Android Direct Transport
 *
 * Implements direct peer-to-peer offline communication using TCP Sockets
 * with length-prefixed framing (4-byte big-endian header, matching FrameCodec).
 * Supports both Host (ServerSocket) and Client (Socket) modes.
 */
class AndroidDirectTransport(
    var localNodeId: String = "Node-A",
    var isHost: Boolean = true
) {
    private val TAG = "AndroidDirectTransport"
    val DEFAULT_PORT = 9001

    private var serverSocket: ServerSocket? = null
    private var activeSocket: Socket? = null
    private var dataOutputStream: DataOutputStream? = null
    private var isRunning = AtomicBoolean(false)
    private var isConnected = AtomicBoolean(false)
    var lastHostIp: String = "10.168.213.199"

    private var onPacketCallback: ((String) -> Unit)? = null
    private var onStatusCallback: ((String, Boolean) -> Unit)? = null
    private var onLogCallback: ((String, String) -> Unit)? = null

    fun setOnPacketReceived(callback: (String) -> Unit) {
        this.onPacketCallback = callback
    }

    fun setOnStatusChanged(callback: (String, Boolean) -> Unit) {
        this.onStatusCallback = callback
    }

    fun setOnLog(callback: (String, String) -> Unit) {
        this.onLogCallback = callback
    }

    private fun log(level: String, msg: String) {
        Log.i(TAG, "[$level] $msg")
        onLogCallback?.invoke(level, msg)
    }

    /**
     * Start transport in Host mode (listen for peer on port 9001).
     */
    fun startHost(port: Int = DEFAULT_PORT) {
        if (isHost && isRunning.get() && serverSocket != null && !serverSocket!!.isClosed && serverSocket!!.isBound) {
            log("INFO", "Host server already active on port $port. Ready for peer connection.")
            return
        }

        stop()
        isHost = true
        isRunning.set(true)

        Thread {
            try {
                val ss = ServerSocket()
                ss.reuseAddress = true
                ss.bind(InetSocketAddress(port))
                serverSocket = ss

                val localIp = getLocalIpAddress()
                log("INFO", "Host started on $localIp:$port. Waiting for peer...")
                onStatusCallback?.invoke("Hosting on $localIp:$port (Waiting for peer...)", false)

                while (isRunning.get()) {
                    try {
                        val client = serverSocket?.accept() ?: break
                        log("INFO", "Peer connected from: ${client.inetAddress.hostAddress}")
                        handleNewConnection(client)
                    } catch (e: SocketException) {
                        if (!isRunning.get()) break
                        log("WARN", "ServerSocket closed: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                log("ERROR", "Failed to start Host on port $port: ${e.message}")
                onStatusCallback?.invoke("Host Error: ${e.message}", false)
            }
        }.start()
    }

    /**
     * Start transport in Client mode (connect to Host IP).
     */
    fun connectToHost(hostIp: String, port: Int = DEFAULT_PORT) {
        stop()
        isHost = false
        isRunning.set(true)
        lastHostIp = hostIp

        Thread {
            while (isRunning.get() && !isConnected.get()) {
                var socket: Socket? = null
                try {
                    log("INFO", "Connecting to Host at $hostIp:$port...")
                    onStatusCallback?.invoke("Connecting to $hostIp:$port...", false)

                    val newSocket = Socket()
                    socket = newSocket
                    newSocket.tcpNoDelay = true
                    newSocket.reuseAddress = true

                    newSocket.connect(InetSocketAddress(hostIp, port), 5000)
                    newSocket.soTimeout = 0 // Infinite read timeout
                    log("INFO", "Successfully connected to Host at ${newSocket.inetAddress.hostAddress}:$port")
                    handleNewConnection(newSocket)
                    socket = null // Ownership transferred to activeSocket
                    break
                } catch (e: Exception) {
                    try {
                        socket?.close()
                    } catch (_: Exception) {}
                    log("WARN", "Connection to $hostIp:$port failed (${e.message}). Retrying in 1.5s...")
                    onStatusCallback?.invoke("Waiting for Host ($hostIp:$port)...", false)
                    try {
                        Thread.sleep(1500)
                    } catch (_: InterruptedException) {
                        break
                    }
                }
            }
        }.start()
    }

    private fun handleNewConnection(socket: Socket) {
        closeActiveSocket()
        activeSocket = socket
        dataOutputStream = DataOutputStream(socket.getOutputStream())
        isConnected.set(true)

        val peerIp = socket.inetAddress.hostAddress
        val roleStr = if (isHost) "Client" else "Host"
        onStatusCallback?.invoke("🟢 Connected to $roleStr ($peerIp)", true)
        log("INFO", "Direct socket link established with $peerIp")

        // Start background receiver thread
        Thread {
            try {
                val inputStream = DataInputStream(socket.getInputStream())
                while (isRunning.get() && isConnected.get()) {
                    // Read 4-byte big-endian frame length
                    val frameLength = inputStream.readInt()
                    if (frameLength <= 0 || frameLength > 131072) {
                        log("WARN", "Received invalid frame size: $frameLength bytes. Dropping connection.")
                        break
                    }

                    // Read complete frame payload
                    val payloadBytes = ByteArray(frameLength)
                    inputStream.readFully(payloadBytes)

                    val json = String(payloadBytes, Charsets.UTF_8)
                    log("ROUTE", "Received frame ($frameLength bytes) from $peerIp")
                    onPacketCallback?.invoke(json)
                }
            } catch (e: EOFException) {
                log("WARN", "Peer closed connection.")
            } catch (e: SocketException) {
                if (isRunning.get()) log("WARN", "Socket disconnected: ${e.message}")
            } catch (e: Exception) {
                log("ERROR", "Socket read error: ${e.message}")
            } finally {
                isConnected.set(false)
                closeActiveSocket()
                onStatusCallback?.invoke("🔴 Disconnected", false)
                log("WARN", "Direct connection closed.")
                if (!isHost && isRunning.get()) {
                    log("INFO", "Client disconnected. Auto-reconnecting in 3s...")
                    try {
                        Thread.sleep(3000)
                        if (isRunning.get() && !isConnected.get()) {
                            connectToHost(lastHostIp, DEFAULT_PORT)
                        }
                    } catch (_: InterruptedException) {}
                }
            }
        }.start()
    }

    /**
     * Dispatch an outgoing MeshPacket as a 4-byte length-prefixed frame.
     */
    fun dispatchPacket(packetJson: String): Boolean {
        if (!isConnected.get() || dataOutputStream == null) {
            log("WARN", "Cannot send: No active peer connection.")
            return false
        }

        return try {
            val bytes = packetJson.toByteArray(Charsets.UTF_8)
            val dos = dataOutputStream ?: return false

            synchronized(dos) {
                dos.writeInt(bytes.size) // 4-byte big-endian prefix
                dos.write(bytes)
                dos.flush()
            }
            log("INFO", "Sent packet (${bytes.size} bytes) over direct socket.")
            true
        } catch (e: Exception) {
            log("ERROR", "Failed to dispatch packet: ${e.message}")
            isConnected.set(false)
            onStatusCallback?.invoke("🔴 Send failed (Disconnected)", false)
            false
        }
    }

    fun stop() {
        isRunning.set(false)
        isConnected.set(false)
        closeActiveSocket()
        try {
            serverSocket?.close()
        } catch (_: Exception) {}
        serverSocket = null
    }

    private fun closeActiveSocket() {
        try {
            dataOutputStream?.close()
        } catch (_: Exception) {}
        try {
            activeSocket?.close()
        } catch (_: Exception) {}
        dataOutputStream = null
        activeSocket = null
    }

    /**
     * Query active network interfaces to find the device's IP address.
     */
    fun getLocalIpAddress(): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            // Prioritize Wi-Fi Direct interface (p2p0, p2p-wlan0-0)
            for (iface in interfaces) {
                if (!iface.isUp || iface.isLoopback) continue
                if (iface.name.lowercase().contains("p2p")) {
                    for (addr in Collections.list(iface.inetAddresses)) {
                        val host = addr.hostAddress
                        if (host != null && !addr.isLoopbackAddress && host.indexOf(':') < 0) {
                            return host
                        }
                    }
                }
            }
            // Check for Hotspot or Wi-Fi interfaces (ap0, wlan0, swlan0)
            for (iface in interfaces) {
                if (!iface.isUp || iface.isLoopback) continue
                val name = iface.name.lowercase()
                if (name.contains("wlan") || name.contains("ap") || name.contains("swlan")) {
                    for (addr in Collections.list(iface.inetAddresses)) {
                        val host = addr.hostAddress
                        if (host != null && !addr.isLoopbackAddress && host.indexOf(':') < 0) {
                            return host
                        }
                    }
                }
            }
            // General fallback
            for (iface in interfaces) {
                if (!iface.isUp || iface.isLoopback) continue
                for (addr in Collections.list(iface.inetAddresses)) {
                    val host = addr.hostAddress
                    if (host != null && !addr.isLoopbackAddress && host.indexOf(':') < 0) {
                        return host
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving local IP: ${e.message}")
        }
        return "127.0.0.1"
    }

    fun isCurrentlyConnected(): Boolean = isConnected.get()
}
