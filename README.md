# Jade Blackjack

A full-featured local Blackjack game built with React, TypeScript, and Vite.

## Features

- Configurable shoe: **1, 5, 6, or 8 decks**
- Difficulty modes: **Easy ($2,000)**, **Medium ($1,000)**, **Hard ($500)**
- **Easy 21 Mode** — see cards remaining and shuffle card position (not available on Hard)
- Cut-card shoe for multi-deck play; single-deck reshuffles every hand
- Casino rules: Hit, Stand, Double Down, Split, Insurance
- Dealer hits soft 17; blackjack pays 3:2
- Session stats in `localStorage`

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (default: `http://localhost:5173`).

## Settings

Open **Settings** from the header (only between hands):

- Choose deck count and difficulty
- Toggle Easy 21 Mode (disabled on Hard)
- Apply to start a fresh shoe and bankroll

On first visit, the settings panel opens automatically.

## How to play

1. Configure settings and apply
2. Click chips to build your bet (min $5, max $500)
3. Press **Deal**
4. Use **Hit**, **Stand**, **Double**, or **Split** when available
5. Press **Next Hand** after each round

## License

The source code is licensed under the [MIT License](LICENSE).

Third-party assets are **not** covered by the MIT License and remain under their
own respective licenses/terms:

- Card and chip images in `public/cards` and `public/chips`
- Sound effects in `public/sounds` (sourced from Freesound and BigSoundBank)

If you reuse this project, make sure you have the rights to any bundled assets.
