#VOID Cyber-Deck

**VOID** is a feature-rich, open-source personal website designed as a unified cyber-deck for open-source intelligence, real-time visualization, and multimedia streaming.

## 🚀 Features

### ** Core Features**

- **WebGL Canvas**: Interactive particle system with generative visuals.
- **Immersive Backgrounds**: Night-mode video (Astronaut/Space) with dynamic opacity.
- **Tactical UI**: Military-inspired design with scanlines, HUD brackets, and neon accents.
- **Music Sync**:
  - Infinite background music loop.
  - **VoidBeats Audio Deck**: Full-featured music player with YouTube-based frequency streaming and playlist management.

### **Core Modules**

| ID       | Module Name       | Description                                                       |
|----------|-------------------|-------------------------------------------------------------------|
| **MOD_01** | **WORLD_FM**      | Live FM radio stream aggregator with real-time frequency mapping.  |
| **MOD_02** | **EYES_OF_THE_WORLD** | Real-time global earthquake and seismic activity visualization.     |
| **MOD_03** | **SHADY_VOID**    | Dark, curated film archive with metadata and recommendations.       |
| **MOD_04** | **DATA.SYS**      | Dashboard for monitoring global internet latency and speed tests. |
| **MOD_05** | **VOID_BEATS**    | Expanded Music Player with YouTube streaming and full audio deck.   |

## 🛠️ Technologies Used

- **Frontend Framework**: Pure HTML, CSS, and Vanilla JavaScript (No framework overhead).
- **3D/2D Graphics**: `three.js` for the 3D particle system, `<canvas>` for visualizations.
- **Styling**:
  - Custom CSS with CSS Variables for theme management.
  - **Tailwind CSS v3**: Integrated via `cdn.tailwindcss.com` for utility-first styling.
- **Animations**:
  - CSS Animations for layout transitions and HUD elements.
  - JavaScript-driven WebGL and Audio visualizations.
- **PWA**: Progressive Web App capabilities with Manifest and Offline support.

## 📦 Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd VOID
    ```

2.  **Run Locally**:
    This project uses a simple local server. Use the included `live-server` or Python's simple server:
    ```bash
    # Option 1: Python 3
    python -m http.server 8000

    # Option 2: VS Code Live Server Extension
    # (Install extension, right-click index.html > Open with Live Server)
    ```
    Then open `http://localhost:8000` in your browser.

## ⚙️ Configuration

### **Environment Variables**
Ensure you have a `.env` file in the root directory for Supabase configuration:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### **Audio Configuration**
- **Background Music**: Place your audio file as `music.mp3` in the root directory.
- **YouTube API Key**: The project uses YouTube API to stream audio. No API key is strictly required for basic functionality, but performance or rate-limit handling might benefit from one.

## 🏃 Usage

### **Music Deck (MOD_05)**
- Click **"LAUNCH AUDIO INTERFACE"** to open the full Decibel Matrix.
- Use the **Search Terminal** to find tracks or artists.
- Toggle **Play/Pause**, adjust **Volume**, and switch **Loop Mode** using the central controls.
- Filter tracks by genre: **LO-FI CYBERPUNK**, **SYNTHWAVE**, **AMBIENT**.

### **Navigation**
- Use the **Main Navigation** (HOME, ABOUT, SYSTEMS, LINK) at the top.
- Scroll down to reveal **Feature Modules**.
- Click "INITIALIZE" to jump to the Systems section.