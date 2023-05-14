# Reciple Dev Commands

Adds dev only commands to your Reciple bot

## Usage

- You can install [`@reciple/npm-loader`](https://www.npmjs.com/package/@reciple/npm-loader) to automatically load module from node_modules.
- Make a module file and export the module

## Installation

### NPM Loader Method

```bash
npm i @reciple/npm-loader reciple-dev-commands
```

### Module Export Method

```bash
npm i reciple-dev-commands
```
<details>
    <summary>Simple export method</summary>

```js
export * from 'reciple-dev-commands';
```
</details>

<details>
    <summary>Advanced export method</summary>

```js
import { DevCommandManager } from 'reciple-dev-commands';

export class DevCommands extends DevCommandManager {
    this.devGuilds = ['0000000000000000000'];
}

export default new DevCommands();
```
</details>
