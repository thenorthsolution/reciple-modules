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
import { InteractionListenerType, InteractionListenerHaltReason } from 'reciple-interaction-events';
import { ButtonBuilder, ButtonStyle, ComponentType, time } from 'discord.js';
import { MessageCommandBuilder } from 'reciple';

export class MyModule {
    commands = [
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
    ];

    interactionListeners = [
        {
            type: InteractionListenerType.Button, // The type of interaction you want to listen to
            customId: 'delete-message', // You can also use a function for dynamic customIds

            // The execute function of your event listener
            execute: async interaction => {
                await interaction.deferUpdate();
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
    ];

    async onStart() {
        return true;
    }
};

export default new MyModule();
```

## Example Interaction Event Listener (Typescript Decorations)

```ts
import { InteractionListenerType, InteractionListenerHaltReason, setRegisterInteractionEvents, setInteractionEvent } from 'reciple-interaction-events';
import { ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction, time } from 'discord.js';
import { setRecipleModule, setRecipleModuleStart, setMessageCommand } from '@reciple/decorators';
import type { MessageCommandExecuteData, RecipleModuleData } from 'reciple';

@setRecipleModule()
export class MyModule implements RecipleModuleData {
    @setRecipleModuleStart()
    @setRegisterInteractionEvents()
    async onStart(): Promise<boolean> {
        return true;
    }

    @setMessageCommand({ name: 'test', description: 'Go test' })
    async handleMessageCommand({ message }: MessageCommandExecuteData): Promise<void> {
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
    }

    @setInteractionEvent({
        type: InteractionListenerType.Button,
        customId: 'delete-message',
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
    })
    async onInteraction(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate();
        await interaction.message.delete();
    }
}

export default new MyModule();
```