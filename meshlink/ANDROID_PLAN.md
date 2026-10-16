# MeshLink — Android Plan & Physical Device Roadmap

## Overview
This document tracks the Android setup, device prerequisites, permissions, build outputs, installation procedures, and connectivity experiments for MeshLink.

---

## 1. Environment & Build Configuration
- **Operating System:** Windows 11 (AMD64)
- **Java / JDK:** OpenJDK 21.0.6 LTS (Target Compatibility: Java 17)
- **Android SDK:** `C:\Users\harsh\OneDrive\Desktop\latest`
- **Compile SDK:** 35 (Android 15)
- **Target SDK:** 35 (Android 15)
- **Min SDK:** 24 (Android 7.0 Nougat)
- **Build Tools:** 35.0.0
- **Android Gradle Plugin (AGP):** 8.8.2
- **Gradle:** 8.13 (`gradle-8.13-bin`)
- **Kotlin:** 2.0.21

---

## 2. Milestone Progress & Roadmap

| Milestone | Scope | Status | Verification Criteria |
| :--- | :--- | :--- | :--- |
| **P0: Android UI & Installable Build** | Mobile UI (Node ID, Destination, Messages, Status, Diagnostic Log), APK build, USB installation docs | **COMPLETED** | `app-debug.apk` builds successfully with SDK 35; UI responds offline; 114 CLI tests pass |
| **P1: Two-Phone Direct Connectivity** | Direct offline transport (Wi-Fi Direct / Local Hotspot socket) between 2 physical phones | **NEXT** | Phone A sends raw packet to Phone B offline without cloud/Internet |
| **P2: Routing Engine Integration** | Wire Android transport to `Router.ts`, packet validator, duplicate cache | **PLANNED** | Real phones decrement TTL, enforce packet structure, suppress duplicate packets |
| **P3: Three-Phone Physical Relay** | Multi-hop forward: Phone A → Phone B (relay) → Phone C | **PLANNED** | Intermediate phone forwards packet; hopCount increments; delivery logged at Phone C |

---

## 3. Physical Device Prerequisites & Permissions

### Permissions Declared in `AndroidManifest.xml`
- `android.permission.INTERNET`: Local loopback / socket communication between nodes
- `android.permission.ACCESS_NETWORK_STATE` & `CHANGE_NETWORK_STATE`: Wi-Fi state inspection
- `android.permission.ACCESS_WIFI_STATE` & `CHANGE_WIFI_STATE`: Direct P2P negotiation
- `android.permission.NEARBY_WIFI_DEVICES`: Android 13+ (API 33+) local Wi-Fi peer discovery
- `android.permission.ACCESS_FINE_LOCATION`: Required on Android 12 and below for local P2P scanning
- `android.permission.BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_ADVERTISE`: BLE peer discovery fallback

### Device Preparation
1. Enable **Developer Options** on Android phone (tap *Build Number* 7 times in *About Phone*).
2. Enable **USB Debugging** in *Developer Options*.
3. Connect phone to PC via USB cable and authorize USB Debugging prompt on the screen.

---

## 4. USB Installation & Launch Commands

### Verify Device Detection
```powershell
& "C:\Users\harsh\OneDrive\Desktop\latest\platform-tools\adb.exe" devices
```

### Install APK onto Connected Device
```powershell
# From meshlink directory:
& "C:\Users\harsh\OneDrive\Desktop\latest\platform-tools\adb.exe" install -r "mobile\android\app\build\outputs\apk\debug\app-debug.apk"
```

### Launch Application via ADB
```powershell
& "C:\Users\harsh\OneDrive\Desktop\latest\platform-tools\adb.exe" shell am start -n "com.meshlink.app.debug/com.meshlink.MainActivity"
```

### Stream Live Android Diagnostic Logs
```powershell
& "C:\Users\harsh\OneDrive\Desktop\latest\platform-tools\adb.exe" logcat -s "AndroidDirectTransport:V" "MeshBridge:V"
```

---

## 5. Artifact Verification
- **Debug APK Location:** `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- **Binary Size:** ~3.2 MB
- **Package Name:** `com.meshlink.app.debug`
- **Main Activity:** `com.meshlink.MainActivity`
- **Asset Bundle:** Offline React/JS runtime in `assets/web/`
