// @ts-check

import { ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import { ContextMenuCommandBuilder, MessageCommandBuilder, SlashCommandBuilder } from "reciple";
import { InteractionListenerType } from "reciple-interaction-events";

/**
 * @satisfies {import("reciple").RecipleModuleData}
 */
export default {
    versions: '^8',
    devCommands: [
        new SlashCommandBuilder()
            .setName('test')
            .setDescription('Test dev command')
            .setExecute(async ({ interaction }) => {
                await interaction.reply('test');
            }),
        new MessageCommandBuilder()
            .setName('test')
            .setDescription('Test dev command')
            .setExecute(async ({ message }) => {
                await message.reply({
                    content: 'test',
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new ButtonBuilder()
                                    .setCustomId('test')
                                    .setLabel('Test Button')
                                    .setStyle(ButtonStyle.Secondary)
                            ]
                        }
                    ]
                });
            }),
        new ContextMenuCommandBuilder()
            .setName('Test')
            .setType('Message')
            .setExecute(async ({ interaction }) => {
                await interaction.reply('test');
            }),
    ],
    /**
     * @satisfies {import("reciple-interaction-events").AnyCommandInteractionListener[]}
     */
    interactionListeners: [
        {
            type: InteractionListenerType.Button,
            customId: 'test',
            cooldown: 5000,
            execute: async interaction => {
                await interaction.reply({
                    content: 'Hello, world!',
                    ephemeral: true
                });
            }
        }
    ],
    onStart: () => true,
};