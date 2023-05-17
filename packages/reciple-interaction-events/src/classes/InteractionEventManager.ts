import { Logger, RecipleClient, RecipleModuleScript } from '@reciple/client';
import { readFileSync } from 'fs';
import path from 'path';
import { AnyCommandInteraction, AnyCommandInteractionListener, AnyComponentInteraction, AnyComponentInteractionListener, AnyInteractionListener, InteractionListenerType } from '../types/listeners';
import { RecipleInteractionListenerModule } from '../types/RecipleInteractionListenerModule';

export class InteractionEventManager implements RecipleModuleScript {
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
    readonly moduleName: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/client'];

    public client!: RecipleClient;
    public logger?: Logger;

    constructor() {
        this.emitInteraction = this.emitInteraction.bind(this);
    }

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;
        this.logger = client.logger?.clone({ name: 'InteractionEventManager' });

        return true;
    }

    public async onLoad(): Promise<void> {
        this.client.on('interactionCreate', this.emitInteraction);
    }

    public async onUnload(): Promise<void> {
        this.client.removeListener('interactionCreate', this.emitInteraction);
    }

    public async emitInteraction(interaction: Parameters<AnyInteractionListener['execute']>[0]): Promise<void> {
        let scripts: RecipleInteractionListenerModule[] = this.client.modules.modules.map(s => s.script as RecipleInteractionListenerModule);

        const commandType = this.getInteractionListenerType(interaction);

        for (const script of scripts) {
            if (!script.interactionListeners?.length) continue;

            for (const listener of script.interactionListeners) {
                if (listener.type !== commandType) continue;

                if (this.isAnyCommandInteractionListener(listener)) {
                    if (!await this.satisfiesCommandName(interaction as AnyCommandInteraction, listener)) continue;
                } else if (this.isAnyComponentInteractionListener(listener)) {
                    if (!await this.satisfiesCustomId(interaction as AnyComponentInteraction, listener)) continue;
                }

                // @ts-expect-error Never type
                await Promise.resolve(listener.execute(interaction));
            }
        }
    }

    public getInteractionListenerType(interaction: Parameters<AnyInteractionListener['execute']>[0]): InteractionListenerType {
        if (interaction.isAutocomplete()) {
            return InteractionListenerType.Autocomplete;
        } else if (interaction.isChatInputCommand()) {
            return InteractionListenerType.ChatInput;
        } else if (interaction.isContextMenuCommand()) {
            return InteractionListenerType.ContextMenu;
        } else if (interaction.isButton()) {
            return InteractionListenerType.Button;
        } else if (interaction.isModalSubmit()) {
            return InteractionListenerType.ModalSubmit;
        } else if (interaction.isAnySelectMenu()) {
            return InteractionListenerType.SelectMenu;
        } else {
            throw new Error('Unknown interaction type');
        }
    }

    public async satisfiesCommandName<T extends AnyCommandInteractionListener>(interaction: Parameters<T['execute']>[0], listener: T): Promise<boolean> {
        if (!listener.commandName) return true;

        return typeof listener.commandName === 'string'
            ? listener.commandName === interaction.commandName
            // @ts-expect-error 
            : listener.commandName(interaction);
    }

    public async satisfiesCustomId<T extends AnyComponentInteractionListener>(interaction: Parameters<T['execute']>[0], listener: T): Promise<boolean> {
        if (!listener.customId) return true;

        return typeof listener.customId === 'string'
            ? listener.customId === interaction.customId
            // @ts-expect-error
            : listener.customId(interaction)
    }

    public isAnyCommandInteractionListener(listener: AnyInteractionListener): listener is AnyCommandInteractionListener {
        return listener.type === InteractionListenerType.Autocomplete || listener.type === InteractionListenerType.ChatInput || listener.type === InteractionListenerType.ContextMenu;
    }

    public isAnyComponentInteractionListener(listener: AnyInteractionListener): listener is AnyComponentInteractionListener {
        return listener.type === InteractionListenerType.Button || listener.type === InteractionListenerType.ModalSubmit || listener.type === InteractionListenerType.SelectMenu;
    }
}