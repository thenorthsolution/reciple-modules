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

Create a new module and export a new class instance of `DevCommandManager`.

```js
import { DevCommandManager } from 'reciple-dev-commands';

export default new DevCommandManager({
    devGuilds: ['0000000000000000000'],
    devUsers: ['0000000000000000000']
});
```
