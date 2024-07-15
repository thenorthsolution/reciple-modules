# Reciple Anticrash

A simple crash handler for Reciple

## Usage

```bash
npm i reciple-anticrash
```

```js
import { RecipleAnticrash } from 'reciple-anticrash';

export default new RecipleAnticrash({
    // The channel ids to send the report to
    reportChannels: process.env.ERROR_CHANNELS ? process.env.ERROR_CHANNELS.split(',') : [],
    // The base message options of the report message
    baseMessageOptions: {
        allowedMentions: {
            parse: [],
            repliedUser: false
        }
    },
    // Custom logger instance
    logger: undefined
});
```