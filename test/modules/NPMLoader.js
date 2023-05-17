const { RecipleNPMLoader } = require("@reciple/npm-loader");
const { RecipleClient, cli, MessageCommandBuilder, SlashCommandBuilder } = require("reciple");
const { ComponentType, TextInputBuilder, TextInputStyle } = require('discord.js');
const { InteractionListenerType } = require('reciple-interaction-events');
const path = require("path");

class NPMLoader extends RecipleNPMLoader {
    get cwd() { return cli.cwd; }

    devCommands = [
        new MessageCommandBuilder()
            .setName('ping')
            .setDescription('Pong')
            .setExecute(async ({ message }) => message.reply('Pong'))
    ];

    commands = [
        new SlashCommandBuilder()
            .setName("cmd")
            .setDescription("e")
            .setExecute(async ({ interaction }) => {
                await interaction.showModal({
                    custom_id: 'mymodal',
                    title: 'My Modal',
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [
                                new TextInputBuilder()
                                    .setCustomId('content')
                                    .setLabel('Content')
                                    .setRequired(true)
                                    .setStyle(TextInputStyle.Paragraph)
                            ]
                        }
                    ]
                })
            })
    ];

    /**
     * @type {import("reciple-interaction-events").AnyInteractionListener[]}
     */
    interactionListeners = [
        {
            type: InteractionListenerType.ModalSubmit,
            customId: 'ee',
            execute: async interaction => {
                await interaction.reply(interaction.fields.getTextInputValue('content'));
            }
        }
    ];

    /**
     * 
     * @param {RecipleClient} client 
     * @returns 
     */
    async onStart(client) {
        this.nodeModulesFolder = path.join(__dirname, '../../node_modules');
        this.disableVersionChecks = client.config.modules.disableModuleVersionCheck;

        return super.onStart(client);
    }
}

module.exports = {
    NPMLoader,
    default: new NPMLoader()
}