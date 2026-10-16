package com.meshlink

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.meshlink.transport.AndroidDirectTransport

/**
 * MainActivity
 *
 * Entry point for the MeshLink Android mobile app.
 * Hosts the WebView for the React-based mesh UI and manages Android native permissions.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var transport: AndroidDirectTransport
    private lateinit var bridge: MeshBridge

    private val PERMISSION_REQUEST_CODE = 1001

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize Android Native Transport
        transport = AndroidDirectTransport("Node-A")

        // Initialize WebView
        webView = WebView(this)
        setContentView(webView)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        // Attach JavaScript Interface Bridge
        bridge = MeshBridge(this, webView, transport)
        webView.addJavascriptInterface(bridge, "AndroidBridge")

        // Wire native transport inbound events to JS UI
        transport.setOnPacketReceived { packetJson ->
            bridge.notifyPacketReceived(packetJson)
        }

        // Request necessary permissions on launch
        requestPermissionsIfNeeded()

        // Load self-contained offline React UI from assets
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    private fun requestPermissionsIfNeeded() {
        val permissions = mutableListOf<String>()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.NEARBY_WIFI_DEVICES)
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
            permissions.add(Manifest.permission.BLUETOOTH_ADVERTISE)
        } else {
            permissions.add(Manifest.permission.ACCESS_FINE_LOCATION)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }
}
