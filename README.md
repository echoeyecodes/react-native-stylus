# Stylus

Edit a React Native app from the app itself. Hold two fingers on any element, describe a change, and Claude Code edits the source while Fast Refresh updates the screen in your hand.

Setup, usage and how it works are in [packages/react-native-stylus/README.md](packages/react-native-stylus/README.md).

## Repository

- `packages/react-native-stylus`: the library. `src/runtime` runs in the app, `src/metro` runs inside Metro and drives Claude Code, and `src/shared` holds the types they exchange.
- `apps/example`: a small coffee-ordering app for trying Stylus.

## Development

```sh
npm install

# Rebuild the library on every change.
npm run dev --workspace react-native-stylus

# In another terminal, run the example.
cd apps/example
npx expo start
```

Changes to `src/metro` take effect after restarting Metro. Changes to `src/runtime` reload through Fast Refresh.
