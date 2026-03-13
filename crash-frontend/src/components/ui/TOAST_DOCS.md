# Toast System

Global toast notifications. Call from anywhere — no context/provider needed.

## Import

```ts
import { showGlobalToast } from '@/components/ui/Toast';
```

## API

```ts
showGlobalToast(message: string, type?: 'success' | 'error' | 'info', amount?: number)
```

| Param     | Type                              | Default     | Description                          |
|-----------|-----------------------------------|-------------|--------------------------------------|
| `message` | `string`                          | required    | Toast text                           |
| `type`    | `'success' \| 'error' \| 'info'` | `'success'` | Controls color + icon                |
| `amount`  | `number`                          | `undefined` | If set, shows `+X.XXXX MNT` subtext |

## Examples

```ts
// Success (purple gradient)
showGlobalToast('Bet placed successfully!', 'success');

// Error (red gradient)
showGlobalToast('Transaction failed: insufficient funds', 'error');

// Info (blue gradient)
showGlobalToast('Game has not ended yet', 'info');

// With MNT amount subtext
showGlobalToast('You won!', 'success', 0.0245);
// renders: "You won!" + "+0.0245 MNT"
```

## Behavior

- Auto-dismisses after **5 seconds**
- Click to dismiss early
- Stacks vertically (top-right corner, `z-100`)
- Slide-in animation + progress bar
- Works from hooks, components, callbacks — anywhere client-side

## Setup

`<ToastProvider>` or `<ToastContainer />` must be mounted once in the root layout. It uses `window.dispatchEvent` internally so no React context is needed.

## Styles

| Type      | Color                        |
|-----------|------------------------------|
| `success` | Purple gradient (`#9B61DB`)  |
| `error`   | Red gradient (`red-500/700`) |
| `info`    | Blue gradient (`blue-500/700`)|
