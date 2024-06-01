# Reciple Anticrash

A simple crash handler for Reciple

## Usage

```bash
npm i reciple-anticrash
```

```js
// Create new module instance
import { RecipleAnticrash } from 'reciple-anticrash';

export default new RecipleAnticrash();
// or
export default new RecipleAnticrash(['0000000000000000000']); // Send error report to channels
```