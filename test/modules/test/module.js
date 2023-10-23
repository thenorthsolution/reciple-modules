// @ts-check

import { ContextMenuCommandBuilder, MessageCommandBuilder, SlashCommandBuilder } from "reciple";

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
                await message.reply('test');
            }),
        new ContextMenuCommandBuilder()
            .setName('Test')
            .setType('Message')
            .setExecute(async ({ interaction }) => {
                await interaction.reply('test');
            }),
    ],
    onStart: () => true,
};