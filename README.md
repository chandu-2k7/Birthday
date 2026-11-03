# 💜 A Magical Birthday Surprise Website 🌙

A cinematic, interactive, and emotional multi-page birthday surprise web experience built with **HTML5, CSS3, and vanilla JavaScript only**.

Designed around a cinematic moonlit beach atmosphere featuring midnight navy, ocean blue, bioluminescent cyan, and moonlight silver, with procedural water, a textured moon, photo & video memories, and a chocolate cake birthday reveal.

---

## 🌟 Features Overview

### 1. 🌊 Atmospheric Moonlit Ocean Design
- Procedural Canvas ocean with layered dark swells, broken foam, a receding shoreline, and a shimmering moon reflection.
- Realistic generated lunar texture with soft maria, craters, limb shading, and a restrained atmospheric halo.
- Midnight navy sky with slow night clouds, horizon mist, and sparse bioluminescent plankton.
- HTML5 Canvas particle engine rendering gentle twinkling stars and ambient sparkles.
- Refined dark-glass UI with cool cyan accents, subtle borders, and quiet backdrop blurs.
- Responsive design tailored for mobile phones, tablets, and desktops.

### 2. 👃 Opening Screen: The Nose Boop Surprise
- Moonlit beach ambiance with a soft glowing character face.
- Interactive **rose nose button** with a quiet `"boop!"` banner and no heavy frosted bubble.
- On click or tap:
  - Squash-and-stretch pop physics animation.
  - Synthesized sweet pop & chime sound via the Web Audio API.
  - Subtle ripple wave and floating keepsake emojis.
  - Seamless automated transition to the Photo Memories page.

### 3. 📸 Photo Memories: "Our Little Moments"
- Horizontal cinematic sliding gallery with 6 photo slots.
- Elegant dark-glass photo frames with soft moonlit hover effects.
- **Local Uploading**:
  - Individual upload/replace buttons per card.
  - "📁 Upload Photos" batch upload button to populate all slots simultaneously.
  - Instant local preview using `URL.createObjectURL(file)` without server or data upload.
  - Graceful file type validation (PNG, JPG, WebP) with helpful toast notifications.
- **Controls & Navigation**:
  - Previous (`‹`) and Next (`›`) navigation arrows.
  - Interactive slide indicator dots.
  - Automatic 3-second slideshow toggle (`▶ Auto Play` / `⏸ Pause Slideshow`) with real-time progress bar.
  - Touch swipe support on mobile devices.
- **Editable Captions**:
  - Click any caption or the pencil icon (`✏️`) to customize captions directly.

### 4. 🎬 Video Memories: "Some Moments Deserve to Be Replayable"
- Responsive grid of 3 video memory cards.
- Default thematic titles:
  1. *"Geetha"*
  2. *"Likki"*
  3. *"Koushik"*
- Editable titles and captions.
- Attractive film-reel placeholder cards before videos are uploaded.
- Direct video uploading (`.mp4`, `.webm`, `.mov`) with local browser preview.
- Custom play/pause overlay and synchronized playback (automatically pauses other clips when one starts playing).
- "🔄 Replace" video options for each slot.

### 5. 🍫 Final Screen: Chocolate Cake Birthday Surprise
- Realistic, handcrafted chocolate birthday cake SVG centerpiece:
  - Multi-tiered rich dark chocolate sponge.
  - Glossy chocolate ganache glaze cascading over the edges.
  - Fresh ruby strawberries and decorative piping rosettes.
  - Three birthday candles with animated flickering glowing flames.
  - Gentle floating hover animation with "One last surprise... tap the cake 🎂" prompt.
- **Interactive Celebration Reveal**:
  - When tapped:
    - Candle flames extinguish with a magical puff.
    - Cake performs a squash-and-stretch celebration bounce.
    - Triumphant celebratory birthday fanfare synthesized via Web Audio API.
    - Massive colorful confetti, star sparkles, and floating hearts explosion.
    - Smooth reveal of glowing **"HAPPY BIRTHDAY!"** typography.
    - Personalized greeting with the recipient's name and emotional wish.
    - *"✨ Relight & Celebrate Again"* button to relight the candles and re-trigger the celebration anytime.

### 6. 🎵 Built-in Web Audio API Synthesizer
- **No external audio files or internet connection required!**
- Procedural audio synthesis for:
  - Cute bubble boop sound effect.
  - Happy birthday fanfare chord arpeggios.
  - Soft glassy UI clicks.
  - Dreamy ambient moonlit chord progression (Lofi music-box vibe).
- Header audio toggle with animated sound wave bars.

### 7. ✏️ Personalization & Customization
- Built-in **Personalize (⚙️)** modal in the header and on the final screen.
- Allows customizing:
  - Recipient's Name (e.g., *"My Favorite Person 💜"* or specific name).
  - Custom Birthday Wish Message.
  - Saves automatically to browser `localStorage`.

---

## 📁 Project Structure

```
magical-birthday-surprise/
├── index.html       # Master semantic HTML structure & SVG illustrations
├── style.css        # Moonlit-ocean theme, glassmorphism, animations, responsive queries
├── script.js        # Web Audio API synth, canvas particles, confetti, slider, video & cake logic
├── ocean-scene.js   # Procedural moon texture, ocean swells, reflection, shoreline & plankton
├── assets/          # Directory for local media and graphic assets
└── README.md        # Documentation and running instructions
```

---

## 🚀 How to Run the Website Locally

You can open and enjoy this website directly in any modern browser (Chrome, Edge, Firefox, Safari, etc.) without installing any dependencies or backend servers.

### Option A: Direct Browser Launch
1. Locate `index.html` in your file explorer:
   ```
   C:\Users\VIDYA SAGAR\Desktop\magical-birthday-surprise\index.html
   ```
2. Double-click `index.html` or drag it into your browser.

### Option B: Local HTTP Server (Recommended)
You can use Python, Node.js, or any simple static server:

```powershell
# Using Python 3:
cd "C:\Users\VIDYA SAGAR\Desktop\magical-birthday-surprise"
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

---

## 🎨 How to Customize

1. **Change Recipient Name and Wish**:
   - Click the **"✏️ Personalize"** button in the top header or on the cake celebration card.
   - Enter your custom name and birthday message, then click **"Save Changes"**.
   - You can also permanently change the defaults in `script.js` under `DEFAULT_CONFIG`.

2. **Add Your Own Background Song 🎵**:
   - **From the Browser UI**: Click the **"🎵 Add Song"** button in the header or open **"✏️ Personalize"** and select any song file (`.mp3`, `.wav`, `.m4a`, `.aac`). It is saved securely in your browser's IndexedDB and will loop automatically every time you visit!
   - **From the Folder**: Place an audio file named `song.mp3` or `music.mp3` inside the `assets/` directory (e.g. `assets/song.mp3`). The site will automatically detect and play it!
   - **Switching Back**: In the Personalize dialog, click **"Reset to Ambient"** anytime to return to the gentle procedural moonlit chimes.

3. **Change Color Palette**:
   - Open `style.css` and modify the CSS variables under `:root`:
     ```css
     :root {
       --bg-deep-night: #030b15;
       --bg-sunset-mauve: #0d2940;
       --bg-sunset-plum: #123a56;
       --accent-coral: #6fd4ff;
       --accent-peach: #a4e7ff;
       ...
     }
     ```

4. **Pre-loading Default Photos or Videos (Optional)**:
   - Place image files inside the `assets/` folder (e.g. `assets/photo1.jpg`).
   - In `index.html`, set the `<img src="assets/photo1.jpg" class="photo-img">` and remove `style="display: none;"` on the image element.
