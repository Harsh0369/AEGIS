package com.meshlink.transport

import android.Manifest
import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.wifi.WpsInfo
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pDeviceList
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * WifiDirectManager
 *
 * Implements native Android Wi-Fi Direct (P2P / Wi-Fi Aware) discovery, group creation,
 * and automatic socket pairing without requiring any mobile hotspot, router, or internet.
 */
class WifiDirectManager(
    private val context: Context,
    private val onLog: (String, String) -> Unit,
    private val onStatusChanged: (String, Boolean) -> Unit,
    private val onPeersUpdated: (List<PeerInfo>) -> Unit,
    private val onConnectionReady: (isHost: Boolean, hostIp: String) -> Unit
) {
    data class PeerInfo(
        val name: String,
        val address: String,
        val status: String,
        val isGroupOwner: Boolean
    )

    private val TAG = "WifiDirectManager"
    private var manager: WifiP2pManager? = null
    private var channel: WifiP2pManager.Channel? = null
    private var receiver: BroadcastReceiver? = null
    private var isReceiverRegistered = false
    private val peers = mutableListOf<PeerInfo>()

    init {
        manager = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
        initializeChannel()
        registerReceiver()
    }

    private fun initializeChannel() {
        channel = manager?.initialize(context, context.mainLooper) {
            log("WARN", "Wi-Fi Direct channel disconnected. Re-initializing...")
            initializeChannel()
        }
    }

    private fun log(level: String, message: String) {
        Log.i(TAG, "[$level] $message")
        onLog(level, message)
    }

    fun hasRequiredPermissions(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val nearby = ContextCompat.checkSelfPermission(context, Manifest.permission.NEARBY_WIFI_DEVICES)
            if (nearby == PackageManager.PERMISSION_GRANTED) return true
        }
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
        return fine == PackageManager.PERMISSION_GRANTED
    }

    private fun registerReceiver() {
        if (isReceiverRegistered) return

        val intentFilter = IntentFilter().apply {
            addAction(WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION)
        }

        receiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                when (intent?.action) {
                    WifiP2pManager.WIFI_P2P_STATE_CHANGED_ACTION -> {
                        val state = intent.getIntExtra(WifiP2pManager.EXTRA_WIFI_STATE, -1)
                        val isEnabled = state == WifiP2pManager.WIFI_P2P_STATE_ENABLED
                        log("INFO", "Wi-Fi Direct state changed: ${if (isEnabled) "ENABLED" else "DISABLED"}")
                        if (!isEnabled) {
                            onStatusChanged("Wi-Fi is OFF. Enable Wi-Fi for Direct P2P.", false)
                        }
                    }
                    WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                        requestPeers()
                    }
                    WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                        requestConnectionInfo()
                    }
                    WifiP2pManager.WIFI_P2P_THIS_DEVICE_CHANGED_ACTION -> {
                        val device = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE, WifiP2pDevice::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_DEVICE)
                        }
                        if (device != null) {
                            log("INFO", "Local P2P Device: ${device.deviceName} (${device.deviceAddress})")
                        }
                    }
                }
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.registerReceiver(
                context,
                receiver!!,
                intentFilter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
        } else {
            context.registerReceiver(receiver, intentFilter)
        }
        isReceiverRegistered = true
    }

    fun unregisterReceiver() {
        if (isReceiverRegistered && receiver != null) {
            try {
                context.unregisterReceiver(receiver)
            } catch (_: Exception) {}
            isReceiverRegistered = false
        }
    }

    /**
     * Start active scanning for nearby Wi-Fi Direct devices.
     */
    @SuppressLint("MissingPermission")
    fun discoverPeers() {
        if (!hasRequiredPermissions()) {
            log("WARN", "Permission missing for Wi-Fi Direct scan.")
            onStatusChanged("Permission Required for P2P Scan", false)
            return
        }

        manager?.discoverPeers(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                log("INFO", "Wi-Fi Direct peer discovery initiated...")
                onStatusChanged("Scanning for nearby MeshLink devices...", false)
            }

            override fun onFailure(reasonCode: Int) {
                val reason = getFailureReason(reasonCode)
                log("ERROR", "Peer discovery failed: $reason")
                onStatusChanged("Scan failed: $reason", false)
            }
        })
    }

    /**
     * Stop active scanning.
     */
    fun stopDiscovery() {
        manager?.stopPeerDiscovery(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                log("INFO", "Wi-Fi Direct discovery stopped.")
            }
            override fun onFailure(reason: Int) {}
        })
    }

    /**
     * Fetch list of discovered peers from Android framework.
     */
    @SuppressLint("MissingPermission")
    fun requestPeers() {
        if (!hasRequiredPermissions()) return

        manager?.requestPeers(channel) { peerList: WifiP2pDeviceList? ->
            val list = peerList?.deviceList ?: emptyList()
            peers.clear()
            for (dev in list) {
                peers.add(
                    PeerInfo(
                        name = if (dev.deviceName.isNullOrBlank()) "Android Device" else dev.deviceName,
                        address = dev.deviceAddress,
                        status = deviceStatusToString(dev.status),
                        isGroupOwner = dev.isGroupOwner
                    )
                )
            }
            log("INFO", "Discovered ${peers.size} nearby Wi-Fi Direct peer(s)")
            onPeersUpdated(peers)
        }
    }

    /**
     * Create an autonomous Wi-Fi Direct Group (becomes Group Owner / Host).
     */
    @SuppressLint("MissingPermission")
    fun createGroup() {
        if (!hasRequiredPermissions()) {
            onStatusChanged("Permission Required to Create Group", false)
            return
        }

        manager?.createGroup(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                log("INFO", "Autonomous Wi-Fi Direct group created successfully!")
                onStatusChanged("P2P Group Created (Waiting for peer...)", false)
            }

            override fun onFailure(reasonCode: Int) {
                val reason = getFailureReason(reasonCode)
                log("ERROR", "Failed to create P2P group: $reason")
                onStatusChanged("Create Group failed: $reason", false)
            }
        })
    }

    /**
     * Remove / disband existing Wi-Fi Direct Group.
     */
    fun removeGroup() {
        manager?.removeGroup(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                log("INFO", "Wi-Fi Direct group removed.")
                onStatusChanged("P2P Group Disbanded", false)
            }
            override fun onFailure(reason: Int) {}
        })
    }

    /**
     * Connect to a specific peer by MAC address.
     */
    @SuppressLint("MissingPermission")
    fun connectToPeer(deviceAddress: String) {
        if (!hasRequiredPermissions()) {
            onStatusChanged("Permission Required to Connect", false)
            return
        }

        val config = WifiP2pConfig().apply {
            this.deviceAddress = deviceAddress
            wps.setup = WpsInfo.PBC // Push button configuration
        }

        log("INFO", "Initiating Wi-Fi Direct pairing with $deviceAddress...")
        onStatusChanged("Pairing with $deviceAddress...", false)

        manager?.connect(channel, config, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {
                log("INFO", "Wi-Fi Direct connection negotiation started with $deviceAddress")
            }

            override fun onFailure(reasonCode: Int) {
                val reason = getFailureReason(reasonCode)
                log("ERROR", "Wi-Fi Direct connect failed: $reason")
                onStatusChanged("Pairing failed: $reason", false)
            }
        })
    }

    /**
     * Query connection info to retrieve Group Owner IP and role.
     */
    fun requestConnectionInfo() {
        manager?.requestConnectionInfo(channel) { info: WifiP2pInfo? ->
            if (info != null && info.groupFormed) {
                val isHost = info.isGroupOwner
                val hostIp = info.groupOwnerAddress?.hostAddress ?: "192.168.49.1"
                log("INFO", "Wi-Fi Direct Link Formed! isGroupOwner=$isHost, hostIp=$hostIp")
                onStatusChanged("🟢 Wi-Fi Direct Active (${if (isHost) "Host" else "Client"})", true)
                onConnectionReady(isHost, hostIp)
            } else {
                log("INFO", "Wi-Fi Direct connection state: No group active.")
            }
        }
    }

    private fun deviceStatusToString(status: Int): String = when (status) {
        WifiP2pDevice.AVAILABLE -> "Available"
        WifiP2pDevice.INVITED -> "Invited"
        WifiP2pDevice.CONNECTED -> "Connected"
        WifiP2pDevice.FAILED -> "Failed"
        WifiP2pDevice.UNAVAILABLE -> "Unavailable"
        else -> "Unknown"
    }

    private fun getFailureReason(reasonCode: Int): String = when (reasonCode) {
        WifiP2pManager.P2P_UNSUPPORTED -> "P2P Unsupported on device"
        WifiP2pManager.ERROR -> "Framework Error"
        WifiP2pManager.BUSY -> "Framework Busy"
        else -> "Code $reasonCode"
    }
}
