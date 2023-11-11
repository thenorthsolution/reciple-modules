# Reciple Interaction Events

Easily handle Reciple interaction events

## Usage

```bash
npm i reciple-interaction-events
```

Create a new module and export an instance of `InteractionEventManager`.

```js
// New module instance
import { InteractionEventManager } from 'reciple-interaction-events';

export default new InteractionEventManager();
```

```js
// Default module instance
import interactionEventManager from 'reciple-interaction-events/module';

export default interactionEventManager;
```

Add your interaction event listeners to your module's `interactionListeners` property.

```js
import { MessageCommandBuilder } from '@reciple/core';
import { ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { InteractionListenerType } from 'reciple-interaction-events';

export default {
    versions: '^8',
    commands: [
        new MessageCommandBuilder()
            .setName('test')
            .setDescription('Go test')
            .setExecute(async ({ message }) => {
                await message.reply({
                    content: `Hello, world ${message.author}!`,
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setLabel('Delete Message')
                                    .setCustomId('delete-message')
                                    .setStyle(ButtonStyle.Secondary)
                            ]
                        }
                    ]
                });
            })
    ],
    interactionListeners: [
        {
            type: InteractionListenerType.Button,
            customId: 'delete-message', // You can also use a function for dynamic customIds
            execute: async interaction => {
                await interaction.message.delete();
            }
        }
    ]
};
```