package com.meshlink

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.meshlink.transport.AndroidDirectTransport
import com.meshlink.transport.WifiDirectManager

/**
 * MainActivity
 *
 * Entry point for the MeshLink Android mobile app.
 * Automatically identifies device model to assign distinct node roles:
 * - Vivo (I2404): Defaults to Node-A (Host mode)
 * - Samsung (SM-M075F): Defaults to Node-B (Client mode)
 *
 * Integrated with native Wi-Fi Direct (P2P) for automated discovery,
 * pairing, and direct socket links without requiring a hotspot, PC, or router.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var transport: AndroidDirectTransport
    private lateinit var bridge: MeshBridge
    private lateinit var wifiDirectManager: WifiDirectManager

    private val PERMISSION_REQUEST_CODE = 1001
    private val PREFS_NAME = "MeshLinkPrefs"
    private val KEY_NODE_ID = "saved_node_id"
    private val KEY_ROLE = "saved_role"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val model = Build.MODEL.uppercase()
        val brand = Build.BRAND.uppercase()
        val manufacturer = Build.MANUFACTURER.uppercase()
        val deviceDesc = "$model $brand $manufacturer"

        // Auto-assign distinct Node ID and Role based on hardware model
        val defaultNodeId = if (deviceDesc.contains("I2404") || deviceDesc.contains("VIVO")) {
            "Node-A"
        } else if (deviceDesc.contains("M07") || deviceDesc.contains("SAMSUNG")) {
            "Node-B"
        } else {
            "Node-" + Build.MODEL.takeLast(4).uppercase()
        }

        val defaultRole = if (defaultNodeId == "Node-A") "HOST" else "CLIENT"
        val savedNodeId = prefs.getString(KEY_NODE_ID, defaultNodeId) ?: defaultNodeId
        val savedRole = prefs.getString(KEY_ROLE, defaultRole) ?: defaultRole

        val isHost = (savedRole == "HOST")
        transport = AndroidDirectTransport(savedNodeId, isHost)

        // Initialize WebView
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
        webView.clearCache(true)
        WebView.setWebContentsDebuggingEnabled(true)

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    android.util.Log.d("WebViewConsole", "[${it.messageLevel()}] ${it.message()} -- line ${it.lineNumber()}")
                }
                return super.onConsoleMessage(consoleMessage)
            }
        }

        // Attach JavaScript Interface Bridge
        bridge = MeshBridge(this, webView, transport)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // Wire transport callbacks to JS UI
        transport.setOnPacketReceived { packetJson ->
            bridge.notifyPacketReceived(packetJson)
        }
        transport.setOnStatusChanged { statusText, connected ->
            bridge.notifyStatusChanged(statusText, connected)
        }
        transport.setOnLog { level, message ->
            bridge.notifyLog(level, message)
        }

        // Initialize native Wi-Fi Direct Manager
        wifiDirectManager = WifiDirectManager(
            context = this,
            onLog = { level, msg -> bridge.notifyLog(level, msg) },
            onStatusChanged = { statusText, connected -> bridge.notifyStatusChanged(statusText, connected) },
            onPeersUpdated = { peers -> bridge.notifyPeersUpdated(peers) },
            onConnectionReady = { isGroupOwner, hostIp ->
                if (isGroupOwner) {
                    transport.startHost(transport.DEFAULT_PORT)
                } else {
                    transport.connectToHost(hostIp, transport.DEFAULT_PORT)
                }
            }
        )
        bridge.setWifiDirectManager(wifiDirectManager)

        // Request runtime permissions
        requestPermissionsIfNeeded()

        // If Host, start listening immediately. If Client, auto-connect to Host.
        if (isHost) {
            transport.startHost(transport.DEFAULT_PORT)
        } else {
            transport.connectToHost("10.168.213.199", transport.DEFAULT_PORT)
        }

        // Load self-contained offline React UI
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    override fun onDestroy() {
        super.onDestroy()
        wifiDirectManager.unregisterReceiver()
        transport.stop()
    }

    private fun requestPermissionsIfNeeded() {
        val permissions = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        }
        permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }
}
