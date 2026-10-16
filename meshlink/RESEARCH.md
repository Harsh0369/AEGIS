# MeshLink — Research Context and Limitations

## 1. Research objective

Investigate the feasibility of **application-level multi-hop messaging** across nodes without Internet infrastructure.

The immediate prototype uses logical nodes and a local process-to-process transport. Real Android Wi-Fi P2P behavior is a **separate feasibility question**.

---

## 2. Research questions

| ID  | Question |
|-----|----------|
| RQ1 | Can an application-level routing layer deliver a message across five logical nodes using multi-hop forwarding? |
| RQ2 | How does the implementation behave when routes are missing, packets are duplicated, or hop limits expire? |
| RQ3 | What additional constraints arise when moving from simulated nodes to commodity Android devices using Wi-Fi P2P? |
| RQ4 | If real-device experiments become possible, how do hop count and topology changes affect message delivery and latency? |

---

## 3. Relevant protocol background

| Protocol | Purpose | Notes |
|----------|---------|-------|
| **AODV** | Primary reference for on-demand route discovery | Study RREQ/RREP/RERR, sequence numbers, route maintenance |
| **DSR**  | Contrasting source-routing design | Compare with next-hop routing approach |
| **OLSR** | Proactive routing with multipoint relays | Understand tradeoffs vs. reactive protocols |

> **Do not claim** that a simplified RREQ/RREP implementation is fully compliant with AODV.

---

## 4. Relevant prior work

> **Verify bibliographic metadata** before using any reference in a formal submission.

### AODV specification

Perkins, C. E., Belding-Royer, E. M., and Das, S. R.  
*Ad hoc On-Demand Distance Vector (AODV) Routing.*  
RFC 3561, 2003.  
🔗 [https://www.rfc-editor.org/rfc/rfc3561](https://www.rfc-editor.org/rfc/rfc3561)

> Use to understand route requests, replies, maintenance, sequence numbers, and route errors.

### DSR specification

Johnson, D., Hu, Y., and Maltz, D.  
*The Dynamic Source Routing Protocol (DSR) for Mobile Ad Hoc Networks for IPv4.*  
RFC 4728, 2007.  
🔗 [https://www.rfc-editor.org/rfc/rfc4728](https://www.rfc-editor.org/rfc/rfc4728)

> Use to compare source routing with next-hop routing.

### OLSR specification

Clausen, T. and Jacquet, P.  
*Optimized Link State Routing Protocol (OLSR).*  
RFC 3626, 2003.  
🔗 [https://www.rfc-editor.org/rfc/rfc3626](https://www.rfc-editor.org/rfc/rfc3626)

> Use to understand proactive routing and multipoint relays.

### Wi-Fi Direct multi-hop research

*Wi-Fi Direct Based Mobile Ad hoc Network.*  
🔗 [https://arxiv.org/abs/1810.06964](https://arxiv.org/abs/1810.06964)

> ⚠️ **Search and verify** the full author, publication, and DOI metadata before citing in the final report.  
> Use to investigate application-level routing over Wi-Fi Direct and real-device implementation challenges.

### Android infrastructure-less communication

*Infrastructure-Less Communication Platform for Off-The-Shelf Android Smartphones.*  
Sensors, 2018, 18(3), 776.  
🔗 [https://www.mdpi.com/1424-8220/18/3/776](https://www.mdpi.com/1424-8220/18/3/776)

> Use to investigate topology construction, multi-hop constraints, and performance measurements on real smartphones.

### Android Wi-Fi P2P documentation

🔗 [https://developer.android.com/develop/connectivity/wifi/wifip2p](https://developer.android.com/develop/connectivity/wifi/wifip2p)

> Use to verify current platform APIs, permissions, and connection behavior.

---

## 5. Experimental methodology

### Terminal prototype tests

| Experiment            | Variables                                    |
|-----------------------|----------------------------------------------|
| Direct delivery       | A → B                                        |
| Three-node forwarding | A → B → C                                   |
| Five-node forwarding  | A → B → C → D → E                           |
| Unknown destinations  | Send to non-existent node                    |
| Duplicate packets     | Same message ID sent twice                   |
| Expired packets       | TTL = 0 or TTL = 1                           |
| Route failures        | Disconnected next hop                        |

### For each experiment, record:

| Field            | Description                          |
|------------------|--------------------------------------|
| Objective        | What is being tested                 |
| Topology         | Node connections                     |
| Software version | Node.js version, commit hash        |
| Procedure        | Steps to reproduce                   |
| Expected behavior| What should happen                   |
| Actual outcome   | What actually happened               |
| Test evidence    | Terminal output, screenshots         |
| Limitations      | What this does and does not prove     |

### Real device experiments (if attempted)

Record additionally:
- Phone models and Android versions
- Wi-Fi P2P group topology
- Physical distances between devices
- Number of trials
- Message sizes
- Delivery outcomes and latency

---

## 6. Metrics

Possible metrics for later experiments:

| Metric                     | Definition                                   | Measurement method         |
|----------------------------|----------------------------------------------|----------------------------|
| Packet delivery ratio      | Messages delivered / messages sent            | Count at source and dest   |
| End-to-end latency         | Time from send to delivery                    | Timestamp comparison       |
| Hop count                  | Number of intermediate nodes traversed        | Counter in packet          |
| Route discovery time       | Time from RREQ to usable route                | Timestamp delta            |
| Control-message overhead   | RREQ/RREP count relative to data messages     | Counter comparison         |
| Route recovery time        | Time from failure detection to new route       | Timestamp delta            |

> Define each metric and its measurement method **before** collecting data.  
> **Do not present simulated measurements as physical wireless measurements.**

---

## 7. Claims we can make

✅ **If tests pass**, we may state:
> The prototype demonstrates application-level multi-hop forwarding across logical nodes in the tested configuration.

❌ **If real phones have not been tested**, we must state:
> Real Android multi-hop operation remains unverified.

---

## 8. Security limitations

The prototype initially lacks authentication and encryption. It is **not suitable** for:
- Sensitive messages
- Deployment in untrusted environments

---

## 9. Research integrity

- **Do not** invent citations, paper findings, experimental data, or performance improvements.
- **Record** negative results and limitations.
- A meaningful contribution may be an implementation, reproducible evaluation, or careful analysis of Android transport constraints.
- **Novelty must be assessed against related work** rather than assumed.
