import { CommandType, type AnyCommandExecuteData, type RecipleModuleData } from 'reciple';
import { setMessageCommand, setRecipleModule, setRecipleModuleStart, setSlashCommand } from '@reciple/decorators';
import { ButtonBuilder, ButtonStyle, ComponentType, type BaseMessageOptions, type ButtonInteraction } from 'discord.js';
import { InteractionListenerType, setRegisterInteractionEvents, setInteractionEvent } from 'reciple-interaction-events';

@setRecipleModule({
    id: 'com.reciple.commands'
})
export class Module implements RecipleModuleData {
    @setRecipleModuleStart()
    @setRegisterInteractionEvents()
    async onStart(): Promise<boolean> {
        return true;
    }

    @setSlashCommand({ name: 'error', description: 'test' })
    async handleErrorCommand(): Promise<void> {
        throw new Error('Test Error');
    }

    @setMessageCommand({ name: 'ping', description: 'Ping command' })
    @setSlashCommand({ name: 'ping', description: 'Ping command' })
    async pingCommand(data: AnyCommandExecuteData): Promise<void> {
        switch (data.type) {
            case CommandType.ContextMenuCommand:
            case CommandType.SlashCommand:
                await data.interaction.reply(this.createPingMessageOptions(data.client.ws.ping));
                break;
            case CommandType.MessageCommand:
                await data.message.reply(this.createPingMessageOptions(data.client.ws.ping));
                break;
        }
    }

    @setInteractionEvent(InteractionListenerType.Button, { customId: 'refresh-ping' })
    async pingRefresh(interaction: ButtonInteraction): Promise<void> {
        await interaction.deferUpdate();
        await interaction.message.edit(this.createPingMessageOptions(interaction.client.ws.ping));
        throw new Error('Test Error');
    }

    createPingMessageOptions(ping: number): BaseMessageOptions {
        return {
            content: ping + 'ms',
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        new ButtonBuilder()
                            .setCustomId('refresh-ping')
                            .setLabel('Refresh')
                            .setStyle(ButtonStyle.Secondary)
                    ]
                }
            ]
        };
    }
}

export default new Module();