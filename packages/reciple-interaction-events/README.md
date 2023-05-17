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

### Module Export Method

```bash
npm i reciple-interaction-events
```
<details>
    <summary>Simple export method</summary>

```js
export * from 'reciple-interaction-events';
```
</details>

<details>
    <summary>Advanced export method</summary>

```js
import { InteractionEventManager } from 'reciple-interaction-events';

export class InteractionEvents extends InteractionEventManager {
    // Modify class behaviour
}

export default new InteractionEvents();
```
</details>
