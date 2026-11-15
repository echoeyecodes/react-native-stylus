# react-native-stylus

Edit a React Native app from the app itself. Hold two fingers on any element, describe a change, and Claude Code edits your source while Fast Refresh updates the screen in your hand. Every change can be undone from the phone.

Stylus runs only in development. In production builds `<Stylus>` renders its children and nothing else.

## Setup

```sh
npm install react-native-stylus react-native-view-shot react-native-safe-area-context
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

With Expo Router, wrap the `<Stack />` or `<Slot />` in `app/_layout.tsx`.

Edits are made by Claude Code on the machine running Metro, so it uses the account you are signed in to there. Run `claude` once to sign in, or set `ANTHROPIC_API_KEY` before starting Metro.

## Using it

- **Hold two fingers** on the screen for half a second to start. In the iOS Simulator, hold Option to show two touch points, then click and hold.
- **Tap an element.** Dragging previews what is under your finger, and lifting picks it.
- A sheet opens with the components around the element and the file and line of the selected one. Tap a name to edit that component instead, or **Change** to pick another element.
- **Describe the change** and send it. Keyboard dictation works well here. The app stays usable while Claude works, and the send button becomes a stop button.
- The conversation shows each request, Claude's reasoning when it reasons, every file it read or searched, each edit with its diff, and its reply. Drag the sheet's header to see more of the app or more of the conversation.
- **Undo** puts back the files changed by the latest request. Undo again to go further back.

## When a change breaks the app

Every change is checked twice before Stylus calls it done.

- **In the code.** When Claude finishes, Metro type-checks the files it edited with your project's TypeScript. Errors the change introduced go straight back to Claude to fix, up to twice, before the turn can end. Errors a file already had are left alone. Projects without a `tsconfig.json` get a syntax check.
- **On the device.** After the edits reach the phone, Stylus watches the app for a moment. If it crashes, the turn shows where, and Stylus asks Claude once to fix the crash its change caused. If that doesn't work, it stops and offers Undo.

A crash in the app never takes Stylus down. The crashed screen is replaced with a short message, with Reload and **Fix with Stylus**, while the conversation and Undo stay available. React Native still shows its own error screen in development; dismiss it to get back to Stylus.

Stylus can also be opened with `openStylus()`, for example from a dev-only button, and from "Edit with Stylus" in the dev menu of development builds. Expo Go's dev menu doesn't show items added by apps.

To use a different model, pass it to `withStylus`:

```js
module.exports = withStylus(getDefaultConfig(__dirname), { model: "opus" });
```

## How it works

- **Finding the element.** Stylus hit-tests the touch through the React renderer's DevTools hook, the same call React Native's element inspector uses, and walks up the component tree that rendered it.
- **Finding the code.** In development React records a stack trace wherever a JSX element is created. Stylus symbolicates those traces through Metro's `/symbolicate` endpoint, as LogBox does, which gives the exact file and line of every JSX element around the one you touched. Elements created inside libraries are left out.
- **Making the change.** `withStylus` adds a few routes to Metro. Each session runs one Claude Code conversation through the Agent SDK. The conversation starts while you are still picking, so the CLI is ready when you send. Each request carries the component path, a screenshot of the app, and the current source of the picked element's file, so Claude can usually edit on its first step.
- **Undo.** Claude Code checkpoints every file before editing it. Undo and Stop restore the checkpoint taken before that request.
- **Checks.** The type check runs in a worker thread inside Metro and keeps TypeScript's language service warm, so a check after an edit takes tens of milliseconds and never stalls bundling. It runs from a Claude Code Stop hook, which is how errors reach Claude before it can finish. Crashes are caught by an error boundary around your app and by React Native's global error handler.
- **Limits.** Claude can read and edit files in the project and in other workspace folders Metro watches, and nothing else. It can't run commands.

## Requirements

- React Native's New Architecture, with React 19 or later. Tested on React Native 0.88 and Expo SDK 58.
- Metro serving the JavaScript bundle, as in any development build or Expo Go.
- Claude Code signed in on the machine running Metro, or `ANTHROPIC_API_KEY` set.
