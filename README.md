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
mystery UFO, extra life at 1500, increasingly lower/faster waves, shared high score in monday storage.

## Scripts

- `npm run lint` – ESLint (typescript-eslint, react-hooks, react-refresh; Prettier-compatible)
- `npm run format` / `npm run format:check` – Prettier

## monday

The game lives in a monday board view and finds out where it is from monday, with `monday-sdk-js`. No board id is
written in the code.

- **Board:** every new game opens a new group named with the date and time (for example `Game 2026-10-20 14:05:33`)
  on the board the view is on, and every alien you shoot becomes an item in that group with a fun name, like
  "Grok the Great". The UFO does not count. The board comes from `monday.get('context')`, and the game follows
  `monday.listen('context')`. A game already running stays on the board it started on.
- **Theme:** the page around the arcade screen follows monday's theme (light, dark or black).
- **High score:** kept in global storage (`monday.storage`), so it is the same on every board. It's saved with the
  `version` from `getItem`, so two players finishing at the same time never overwrite each other: if someone saved
  in between, the game reads again and saves only if it is still higher. Beat it and monday shows a notice.
- **End screen:** when the game ends, every alien killed this round is listed by name. Click one to open its item
  card (`monday.execute('openItemCard')`), using the item id monday returned when the alien was saved.

### Set it up

1. Copy `.env.example` to `.env` and fill in two values:
   - `MONDAY_API_TOKEN`: in the monday Developer Center, click **API token** in the sidebar and copy it.
     No `VITE_` prefix, and never commit it (`.env` is in `.gitignore`).
   - `VITE_DEV_BOARD_ID`: a **test** board for the plain browser tab, the number in its URL after `/boards/`. Not a
     secret. Inside monday it is ignored: the board comes from the context. If it is missing, the game still plays.
2. `npm install`, then `npm run dev`, and open <http://localhost:5173>. Restart the dev server after editing `.env`.

### Two worlds

All SDK calls go through `src/monday/sdk.ts`, which decides once at startup whether the game runs inside monday's
iframe.

|                               | Inside monday                              | Plain browser tab (mock mode)                        |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Context                       | Real board, user and theme                 | `VITE_DEV_BOARD_ID`, a mock user, your system theme  |
| Storage                       | `monday.storage` (global)                  | `localStorage`, same keys, versions and return shape |
| `execute` (item card, notice) | Opens the card, shows the notice           | **Can't be mocked:** logged in the Console           |
| API calls                     | `SeamlessApiClient`, with the app's scopes | Dev-only `/__monday` endpoint in the Vite dev server |

Only inside monday can you check: the real board from the context, theme changes, item cards opening, the
notice, and the high score being shared between boards and players.

The dev endpoint (`vite-plugins/monday-dev-api.ts`) reads the token from `.env` in Node, so it never reaches the
browser. It does not exist in `npm run build`, only answers JSON `POST` requests from localhost, refuses other
websites and tunnels, and only runs the two operations in `src/monday/queries.ts`.

`monday-sdk-js` ships its types as `.ts` files that this project's strict compiler settings refuse, so
`tsconfig.app.json` points the import at a small hand-written `src/types/monday-sdk-js.d.ts`.
