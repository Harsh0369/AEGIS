# MeshLink — Offline Mesh Messaging

> Application-level multi-hop messaging prototype built with TypeScript and Node.js.

## Quick Start

### 1. Terminal / CLI Simulation (Node.js & TypeScript)
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run all 114 automated tests
npm test

# Run the five-node multi-hop demo (A ←→ B ←→ C ←→ D ←→ E)
npm run demo
```

### 2. Android Mobile Application (Physical Phone)
The Android mobile application is built in `mobile/` with a React/TypeScript interface and native Android SDK connectivity.

```powershell
# Build the Android APK using Gradle:
gradle -p mobile/android assembleDebug

# Output APK location:
# mobile/android/app/build/outputs/apk/debug/app-debug.apk (~3.2 MB)

# Install onto connected phone via USB:
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Launch app on device:
adb shell am start -n com.meshlink.app.debug/com.meshlink.MainActivity
```

## Demonstration Topology

```
A ←→ B ←→ C ←→ D ←→ E
```

Node A sends a message to Node E through intermediate nodes B, C, and D. Each node makes an independent forwarding decision.

## Project Structure

```
meshlink/
├── AGENTS.md              # Agent behavioral rules
├── PROJECT.md             # Goals, roadmap, and milestone status
├── ARCHITECTURE.md        # Components, packet flow, and mobile bridge
├── PLAN.md                # Milestone execution plan (CLI + Android P0-P4)
├── ANDROID_PLAN.md        # Android setup, device prerequisites, and USB install steps
├── DECISIONS.md           # Architecture decision log
├── TESTING.md             # Test requirements, results log, and hardware checks
├── RESEARCH.md            # Research context, topology limits, and trade-offs
├── src/                   # Core TypeScript mesh engine (Packet, Router, Tables)
├── tests/                 # 114 unit and integration tests (node:test)
├── examples/              # Repeatable multi-node demo scripts
├── mobile/                # Android application module
│   ├── src/               # React UI (Header, Selector, Messages, Log Console)
│   └── android/           # Gradle build, AndroidManifest, MainActivity, MeshBridge
└── evidence/              # Test output and demo logs
```

## Documentation

- [Project Definition](./PROJECT.md)
- [Architecture & Mobile Bridge](./ARCHITECTURE.md)
- [Execution Plan](./PLAN.md)
- [Android Setup & Device Roadmap](./ANDROID_PLAN.md)
- [Decisions](./DECISIONS.md)
- [Testing & Verified Results](./TESTING.md)
- [Research Context & Limitations](./RESEARCH.md)

## Limitations

- This is a student research prototype.
- Local TCP simulation does not prove real wireless multi-hop.
- No authentication or encryption is implemented.
- See [RESEARCH.md](./RESEARCH.md) for full limitations.

## License

Academic project — not for production use.
