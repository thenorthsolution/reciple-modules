# Reciple Interaction Events

Easily handle Reciple interaction events

## Usage

```bash
npm i reciple-interaction-events
```

```js
// New module instance
import { InteractionEventManager } from 'reciple-interaction-events';

export default new InteractionEventManager();
```


## Example Interaction Event Listener

```js
import { ButtonBuilder, ButtonStyle, ComponentType, InteractionListenerHaltReason, time } from 'discord.js';
import { InteractionListenerType } from 'reciple-interaction-events';
import { MessageCommandBuilder } from '@reciple/core';

export default {
    versions: '^9',
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
            type: InteractionListenerType.Button, // The type of interaction you want to listen to
            customId: 'delete-message', // You can also use a function for dynamic customIds

            // The execute function of your event listener
            execute: async interaction => {
                await interaction.message.delete();
            },

            cooldown: 5000, // (Optional) You can set cooldown for this interaction
            requiredBotPermissions: 'Administrator', // (Optional) You can set a required permissions to execute the interaction
            requiredMemberPermissions: 'Administrator', // (Optional) You can set a required member permissions to the interaction

            // (Optional) Function to handle errors, cooldowns, and permission abort
            halt: async ({ interaction, reason, error, cooldown, missingPermissions }) => {
                switch(reason) {
                    case InteractionListenerHaltReason.Error:
                        console.log(error);
                        return true;
                    case InteractionListenerHaltReason.Cooldown:
                        await interaction.reply({
                            content: `You are cooled-down for ${time(cooldown.endsAt, 'R')}`,
                            ephemeral: true
                        });
                        return true;
                    case InteractionListenerHaltReason.MissingBotPermissions:
                        await interaction.reply({
                            content: `Bot is missing ${missingPermissions.toJSON().map(p => '`' + p + '`').join(' ')} permissions to execute this command`,
                            ephemeral: true
                        });
                        return true;
                    case InteractionListenerHaltReason.MissingMemberPermissions:
                        await interaction.reply({
                            content: `You don't have ${missingPermissions.toJSON().map(p => '`' + p + '`').join(' ')} permissions to execute this command`,
                            ephemeral: true
                        });
                        return true;
                }
            }
        }
    ]
};
```