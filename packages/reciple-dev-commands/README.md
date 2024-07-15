# Reciple Dev Commands

Adds dev only commands to your Reciple bot

## Usage

```bash
npm i reciple-dev-commands
```

```js
import { RecipleDevCommands } from 'reciple-dev-commands';

export default new RecipleDevCommands({
    // Allow dev commands in dev users' DMs
    allowExecuteInDms: true,

    // Allow dev commands in non-dev guilds to be executed by dev users
    allowExecuteInNonDevGuild: true,

    // Allow non dev users in dev guilds to execute dev commands
    allowNonDevUserExecuteInDevGuild: false,

    // Deploy dev commands in production. Will check for NODE_ENV=production
    deployInProduction: true,

    // The dev guild ids
    devGuilds: process.env.DEV_GUILDS ? process.env.DEV_GUILDS.split(',') : [],

    // The dev user ids
    devUsers: process.env.DEV_USERS ? process.env.DEV_USERS.split(',') : [],

    // Custom logger instance
    logger: undefined
});
```

## Example Dev Command
```js
import { MessageCommandBuilder } from '@reciple/core';

export class MyModule {
    // Normal commands
    commands = [
        new MessageCommandBuilder()
            .setName('ping')
            .setDescription('Get pong')
            .setExecute(async ({ message, client }) => {
                await message.reply(`${client.ws.ping}`);
            })
    ];

    // Dev only commands
    devCommands = [
        new MessageCommandBuilder()
            .setName('test')
            .setDescription('Test dev command')
            .setExecute(async ({ message }) => {
                await message.reply(`Hello, world ${message.author}!`);
            })
    ];

    async onStart() {
        return true;
    }
}
```