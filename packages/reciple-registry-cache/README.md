# Reciple Registry Cache

Cache registered application commands locally and only register commands when the command list changes.

## Usage

```bash
npm i reciple-registry-cache
```

Create a new module and export an instance of `RegistryCacheManager`.

```js
// New module instance
import { RegistryCacheManager } from 'reciple-registry-cache';

export default new RegistryCacheManager({
    cacheFolder: './node_modules/.cache/reciple-registry-cache/' // (Optional) custom cache folder
});
```
```js
// Default module instance
import registryCacheManager from 'reciple-registry-cache/module';

export default registryCacheManager;
```