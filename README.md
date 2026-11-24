# Stylus

Stylus lets you change a React Native app while you're using it. Hold two fingers on the screen, tap the thing you want to change and say what should be different. A coding agent on your computer edits the source, and the app on your phone updates through Fast Refresh.

It uses Claude Code by default. Codex, OpenCode and other agents that support the [Agent Client Protocol](https://agentclientprotocol.com) work too.

## Getting started

```sh
npm install react-native-stylus react-native-view-shot react-native-safe-area-context react-native-svg
```

Add Stylus to your Metro config:

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withStylus } = require("react-native-stylus/metro");

module.exports = withStylus(getDefaultConfig(__dirname));
```

Wrap the root of your app:

```tsx
import { Stylus } from "react-native-stylus";

export default function App() {
  return (
    <Stylus>
      <Navigation />
    </Stylus>
  );
}
```

Start Metro as usual, open the app and hold two fingers on the screen. Stylus only runs in development; in production builds `<Stylus>` renders your app and nothing else.

Choosing an agent, Undo, the checks Stylus runs after each change and the requirements are documented in the [package README](packages/react-native-stylus/README.md).

## Repository

- `packages/react-native-stylus` is the library. `src/runtime` runs in the app, `src/metro` runs inside Metro and talks to the agent, and `src/shared` has the types both sides use.
- `apps/example` is a small coffee-ordering app for trying Stylus out.

## Working on Stylus

```sh
npm install

# Rebuild the library whenever it changes.
npm run dev --workspace react-native-stylus

# In another terminal, run the example app.
cd apps/example
npx expo start
```

Changes to `src/metro` need a Metro restart. Changes to `src/runtime` show up through Fast Refresh.

## License

MIT
