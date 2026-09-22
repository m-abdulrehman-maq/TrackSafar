<div align="center">

<!-- Animated SVG Bus Icon -->
<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="busGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00D2FF;stop-opacity:1">
        <animate attributeName="stop-color" values="#00D2FF;#3A7BD5;#00D2FF" dur="3s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" style="stop-color:#3A7BD5;stop-opacity:1">
        <animate attributeName="stop-color" values="#3A7BD5;#00D2FF;#3A7BD5" dur="3s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <!-- Bus Body -->
  <rect x="15" y="30" width="90" height="55" rx="12" fill="url(#busGrad)" filter="url(#glow)"/>
  <!-- Windows -->
  <rect x="22" y="38" width="18" height="18" rx="4" fill="rgba(255,255,255,0.9)"/>
  <rect x="44" y="38" width="18" height="18" rx="4" fill="rgba(255,255,255,0.9)"/>
  <rect x="66" y="38" width="18" height="18" rx="4" fill="rgba(255,255,255,0.9)"/>
  <rect x="88" y="38" width="12" height="18" rx="4" fill="rgba(255,255,255,0.9)"/>
  <!-- Wheels -->
  <circle cx="35" cy="90" r="10" fill="#1a1a2e">
    <animateTransform attributeName="transform" type="rotate" from="0 35 90" to="360 35 90" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="85" cy="90" r="10" fill="#1a1a2e">
    <animateTransform attributeName="transform" type="rotate" from="0 85 90" to="360 85 90" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="35" cy="90" r="5" fill="#444"/>
  <circle cx="85" cy="90" r="5" fill="#444"/>
  <!-- Door -->
  <rect x="55" y="65" width="12" height="20" rx="2" fill="rgba(255,255,255,0.7)"/>
  <!-- Signal Waves -->
  <circle cx="108" cy="20" r="5" fill="none" stroke="#00D2FF" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="5;18" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="108" cy="20" r="5" fill="none" stroke="#00D2FF" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="5;18" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;0" dur="1.5s" begin="0.5s" repeatCount="indefinite"/>
  </circle>
  <circle cx="108" cy="20" r="5" fill="none" stroke="#00D2FF" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="5;18" dur="1.5s" begin="1s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;0" dur="1.5s" begin="1s" repeatCount="indefinite"/>
  </circle>
</svg>

<br/>

<!-- Animated Title -->
<h1>
  <span style="background: linear-gradient(90deg, #00D2FF, #3A7BD5, #00D2FF); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s linear infinite; font-size: 3em; font-weight: 900; letter-spacing: 2px;">
    TrackSafar
  </span>
</h1>

<style>
  @keyframes shimmer {
    0% { background-position: 0% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes typing {
    from { width: 0; }
    to { width: 100%; }
  }
</style>

<p style="font-size: 1.2em; color: #555; animation: fadeInUp 1s ease-out;">
  <b>Real-Time Public Transport Tracking for Lahore</b>
</p>

<p>
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter"/>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Google_Maps-4285F4?style=for-the-badge&logo=google-maps&logoColor=white" alt="Google Maps"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
</p>

<p>
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-3DDC84?style=for-the-badge" alt="Platforms"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/Status-Planning-yellow?style=for-the-badge" alt="Status"/>
</p>

<br/>

<!-- Divider with animated dots -->
<p align="center">
  <svg width="200" height="10" viewBox="0 0 200 10">
    <circle cx="10" cy="5" r="3" fill="#00D2FF">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0s" repeatCount="indefinite"/>
    </circle>
    <circle cx="50" cy="5" r="3" fill="#3A7BD5">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="90" cy="5" r="3" fill="#5B86E5">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="130" cy="5" r="3" fill="#3A7BD5">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="0.9s" repeatCount="indefinite"/>
    </circle>
    <circle cx="170" cy="5" r="3" fill="#00D2FF">
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" begin="1.2s" repeatCount="indefinite"/>
    </circle>
  </svg>
</p>

</div>

---

## The Problem

Lahore's public transport system carries **millions** of commuters daily, yet passengers have **zero visibility** into:

- Where their bus is right now
- When the next bus will arrive at their stop
- Which route to take for their destination
- How crowded a bus is before boarding

> Commuters wait at bus stops blindly, wasting **hours** every week with no real-time information.

---

## The Solution

**TrackSafar** is a real-time bus tracking platform that connects commuters with Lahore's **Speedo Bus** and **Green Electric Bus** networks through live GPS tracking, smart ETA predictions, and an interactive map experience.

---

## How It Works

<table>
<tr>
<td align="center" width="33%">

### 1. Open App
Passenger launches the app and sees their location on an **interactive map** with nearby bus stops highlighted

</td>
<td align="center" width="33%">

### 2. Track Live
View **real-time bus positions** moving on the map, with route lines, bus numbers, and estimated arrival times

</td>
<td align="center" width="33%">

### 3. Ride Smart
Choose the **optimal bus**, know exactly when it arrives, and plan your journey with confidence

</td>
</tr>
</table>

---

## Features

<table>
<tr>
<td width="50%">

### Passenger App
- Live bus tracking on interactive map
- Nearby bus detection via GPS
- Search by bus number, route, or stop
- Route visualization with stops
- Estimated arrival time (ETA)
- Push notifications & alerts
- User profile & settings

</td>
<td width="50%">

### Driver App
- Simple login & trip management
- View assigned bus & route
- Start/end trip controls
- Automatic GPS location sharing
- Real-time status indicator
- Minimal, distraction-free UI

</td>
</tr>
<tr>
<td width="50%">

### Admin Dashboard
- Full user management (CRUD)
- Driver & bus fleet management
- Route & stop configuration
- Driver-bus-route assignments
- Live active bus monitoring
- System health overview

</td>
<td width="50%">

### Smart Features
- ETA calculation engine
- Multi-route search
- Offline map caching
- Traffic-aware predictions
- Occupancy estimation *(v2)*
- AI-powered ETA *(future)*

</td>
</tr>
</table>

---

## Tech Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Passenger   │  │   Driver    │  │   Admin Panel   │  │
│  │ Flutter App  │  │ Flutter App │  │   Web Dashboard │  │
│  │ (Mobile)     │  │ (Mobile)    │  │   (Browser)     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
└─────────┼────────────────┼──────────────────┼────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌──────────────────────────────────────────────────────────┐
│                    SERVER LAYER                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              FastAPI / REST Backend               │    │
│  │        Authentication · Business Logic            │    │
│  └──────────────────┬───────────────────────────────┘    │
└─────────────────────┼────────────────────────────────────┘
          │           │           │
          ▼           ▼           ▼
┌──────────────┐ ┌──────────┐ ┌──────────────────┐
│  Supabase    │ │  Google   │ │    WebSockets     │
│ PostgreSQL   │ │  Maps API │ │  (Real-time Bus   │
│ (Database)   │ │ (Mapping) │ │   Location Feed)  │
└──────────────┘ └──────────┘ └──────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Mobile** | Flutter | Cross-platform passenger & driver apps |
| **Web** | React / Next.js | Admin dashboard |
| **Backend** | FastAPI (Python) | REST API & business logic |
| **Database** | PostgreSQL via Supabase | Data storage & realtime subscriptions |
| **Auth** | Supabase Auth | User authentication & sessions |
| **Maps** | Google Maps API | Map rendering, routing & geocoding |
| **Realtime** | Supabase Realtime | Live bus location streaming |
| **Hosting** | Vercel / Railway | Backend & dashboard deployment |

---

## Getting Started

> **Note:** TrackSafar is currently in the planning phase. Setup instructions will be available once development begins.

```bash
# Clone the repository
git clone https://github.com/m-abdulrehman-maq/TrackSafar.git

# Navigate to project directory
cd TrackSafar

# Follow setup instructions (coming soon)
```

---

## Project Roadmap

| Phase | Milestone | Status |
|-------|-----------|--------|
| **Phase 1** | SRS & Documentation | <span style="color:green">Completed</span> |
| **Phase 2** | System Design & DB Schema | <span style="color:orange">In Progress</span> |
| **Phase 3** | Flutter App Scaffolding | <span style="color:gray">Planned</span> |
| **Phase 4** | Backend API Development | <span style="color:gray">Planned</span> |
| **Phase 5** | Supabase Integration | <span style="color:gray">Planned</span> |
| **Phase 6** | Maps & Realtime Tracking | <span style="color:gray">Planned</span> |
| **Phase 7** | Admin Dashboard | <span style="color:gray">Planned</span> |
| **Phase 8** | Testing & Deployment | <span style="color:gray">Planned</span> |

---

## Team

<table>
<tr>
<td align="center">
  <a href="https://github.com/m-abdulrehman-maq">
    <img src="https://github.com/m-abdulrehman-maq.png" width="80" style="border-radius:50%; animation: pulse 2s infinite;"/>
    <br/>
    <b>M. Abdul Rehman Maqsood</b>
  </a>
  <br/>
  <sub>2024-CE-31</sub>
</td>
<td align="center">
  <a href="#">
    <img src="https://ui-avatars.com/api/?name=Mujeeb+ur+Rehman&background=0D8ABC&color=fff&size=80" width="80" style="border-radius:50%; animation: pulse 2s infinite;"/>
    <br/>
    <b>Mujeeb ur Rehman</b>
  </a>
  <br/>
  <sub>2024-CE-09</sub>
</td>
<td align="center">
  <a href="https://github.com/afaq-pak">
    <img src="https://github.com/afaq-pak.png" width="80" style="border-radius:50%; animation: pulse 2s infinite;"/>
    <br/>
    <b>Afaq Ahmad</b>
  </a>
  <br/>
  <sub>2024-CE-19</sub>
</td>
</tr>
</table>

**Course:** Software Engineering (CMPE-311L) · **Semester:** 5th · **Instructor:** Ms. Sana Tasleem

---

## Future Enhancements

- Online ticket booking & digital payments
- Government transport API integration
- AI-powered ETA prediction models
- Bus occupancy estimation via sensors
- Passenger feedback & complaint system
- Emergency reporting features
- Multi-city expansion beyond Lahore
- Dedicated GPS hardware integration

---

<div align="center">

### Show Your Support

If you find TrackSafar valuable, give it a star to show your support!

[![Star History Chart](https://api.star-history.com/svg?repos=m-abdulrehman-maq/TrackSafar&type=Date)](https://star-history.com/#m-abdulrehman-maq/TrackSafar&Date)

---

<p style="color: #888;">
  Built with passion for Lahore's commuters
</p>

<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <circle cx="30" cy="30" r="28" fill="none" stroke="url(#heartGrad)" stroke-width="2">
    <animate attributeName="r" values="26;28;26" dur="1.5s" repeatCount="indefinite"/>
  </circle>
  <defs>
    <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00D2FF"/>
      <stop offset="100%" style="stop-color:#3A7BD5"/>
    </linearGradient>
  </defs>
  <text x="30" y="38" text-anchor="middle" font-size="28">&#10084;</text>
</svg>

<br/>

[MIT License](LICENSE) © 2026 TrackSafar Team

</div>
