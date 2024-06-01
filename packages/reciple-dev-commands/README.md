# Reciple Dev Commands

Adds dev only commands to your Reciple bot

## Usage

```bash
npm i reciple-dev-commands
```

```js
import { DevCommandManager } from 'reciple-dev-commands';

export default new DevCommandManager({
    devGuilds: ['0000000000000000000'], // (Optional) Your test/dev guild
    devUsers: ['0000000000000000000'],  // (Optional) Your dev users
    prefix: '?',                        // (Optional) Custom prefix for dev message commands
    argSeparator: ' ',                  // (Optional) Custom arg separator for dev message commands
    allowExecuteInNonDevGuild: true,    // (Optional) Allow dev users execute dev commands outside dev guilds
    ignoreCommandsCacheRegister: false,  // (Optional) Ignore register cache when reciple-registry-cache is installed
});
```

## Example Dev Command

```js
import { MessageCommandBuilder } from '@reciple/core';

export default {
    versions: '^9',

    // Normal commands
    commands: [
        new MessageCommandBuilder()
            .setName('ping')
            .setDescription('Get pong')
            .setExecute(async ({ message, client }) => {
                await message.reply(`${client.ws.ping}`);
            })
    ],

    // Dev only commands
    devCommands: [
        new MessageCommandBuilder()
            .setName('test')
            .setDescription('Test dev command')
            .setExecute(async ({ message }) => {
                await message.reply(`Hello, world ${message.author}!`);
            })
    ]
};
```