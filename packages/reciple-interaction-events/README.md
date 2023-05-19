# Reciple Interaction Events

Easily handle Reciple interaction events

## Usage

- You can install [`@reciple/npm-loader`](https://www.npmjs.com/package/@reciple/npm-loader) to automatically load module from node_modules.
- Make a module file and export the module

## Installation

### NPM Loader Method

```bash
npm i @reciple/npm-loader reciple-interaction-events
```

### Export Method

```bash
npm i reciple-interaction-events
```

Create a new module and export a new class instance of `InteractionEventManager`.

```js
import { InteractionEventManager } from 'reciple-interaction-events';

export default new InteractionEventManager();
```