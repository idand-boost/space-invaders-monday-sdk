# Space Invaders

A Space Invaders clone built with TypeScript + Vite, using React purely as the renderer.

```bash
npm install
npm run dev
```

## Controls

| Key              | Action          |
| ---------------- | --------------- |
| ← / → (or A / D) | Move            |
| Space (or ↑ / W) | Fire            |
| P / Esc          | Pause           |
| Enter            | Start / restart |

## Structure

- `src/game/` – framework-free engine: state, `update(state, input, dt)`, collisions, sprites as pixel bitmaps.
- `src/components/GameView.tsx` – pure render of the state as SVG at the original 224×256 resolution.
- `src/App.tsx` – `requestAnimationFrame` loop + keyboard input; re-renders once per frame.

Features: 6×12 formation that speeds up as it thins, bottom-row-only alien fire, erodible shields,
mystery UFO, extra life at 1500, increasingly lower/faster waves, hi-score saved in `localStorage`.

## Scripts

- `npm run lint` – ESLint (typescript-eslint, react-hooks, react-refresh; Prettier-compatible)
- `npm run format` / `npm run format:check` – Prettier

## monday

The game writes to a monday board: every new game opens a new group named with the date and time (for example
`Game 2026-10-20 14:05:33`), and every alien you shoot becomes an item in that group with a fun name, like
"Grok the Great". The UFO does not count.

### Set it up

1. Copy `.env.example` to `.env` and fill in two values:
   - `MONDAY_API_TOKEN`: in the monday Developer Center, click **API token** in the sidebar and copy it.
     No `VITE_` prefix, and never commit it (`.env` is in `.gitignore`).
   - `VITE_MONDAY_BOARD_ID`: the board's id, the number in its URL after `/boards/`. This one is not a secret.
     If it is missing, the game still plays and logs a warning in the browser console.
2. `npm install`, then `npm run dev`, and open <http://localhost:5173>. Restart the dev server after editing `.env`.

### How it works

- In a plain browser tab, the game POSTs queries to a dev-only endpoint (`/__monday`) in the Vite dev server
  (`vite-plugins/monday-dev-api.ts`). The server reads the token from `.env`, calls monday from Node, and the token
  never reaches the browser. The endpoint does not exist in `npm run build`. It only answers JSON `POST` requests
  from localhost, refuses other websites and tunnels, and only runs the two operations in `src/monday/queries.ts`.
- Inside monday (the board view), the game uses `SeamlessApiClient` from `@mondaydotcomorg/api`, with the app's own
  scopes (`me:read`, `boards:read`, `boards:write`). No token is involved.
- This is the happy path: every kill sends one request right away, with no queue and no retries.
