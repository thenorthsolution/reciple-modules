# Reciple Registry Cache

Cache application commands to prevent register api spam

## Usage

- You can install [`@reciple/npm-loader`](https://www.npmjs.com/package/@reciple/npm-loader) to automatically load module from node_modules.
- Make a module file and export the module

## Installation

### NPM Loader Method

```bash
npm i @reciple/npm-loader reciple-registry-cache
```

### Export Method

```bash
npm i reciple-registry-cache
```

Create a new module and export a new class instance of `RegistryCacheManager`.

```js
import { RegistryCacheManager } from 'reciple-registry-cache';

export default new RegistryCacheManager();
```