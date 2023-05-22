# Reciple Anticrash

A simple crash handler for Reciple

## Usage

- You can install [`@reciple/npm-loader`](https://www.npmjs.com/package/@reciple/npm-loader) to automatically load module from node_modules.
- Make a module file and export the module

## Installation

### NPM Loader Method

```bash
npm i @reciple/npm-loader reciple-anticrash
```

### Export Method

```bash
npm i reciple-anticrash
```

Create a new module and export a new class instance of `RecipleCrashHandler`.

```js
import { RecipleCrashHandler } from 'reciple-anticrash';

export default new RecipleCrashHandler();
```