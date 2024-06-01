# Reciple Registry Cache

Cache registered application commands locally and only register commands when the command list changes.

## Usage

```bash
npm i reciple-registry-cache
```

```js
// New module instance
import { RegistryCacheManager } from 'reciple-registry-cache';

export default new RegistryCacheManager({
    cacheFolder: './node_modules/.cache/reciple-registry-cache/' // (Optional) custom cache folder
});
```