import { AnyCommandInteraction, AnyCommandInteractionListener, AnyComponentInteraction, AnyComponentInteractionListener, AnyInteractionListener, InteractionListenerHaltReason, InteractionListenerType, type AnyInteractionListenerHaltData, type InteractionListener } from '../types/listeners.js';
import { CommandPermissionsPrecondition, CooldownData, Logger, RecipleClient, RecipleModuleData, RecipleModuleStartData } from '@reciple/core';
import { setClientEvent, setRecipleModule, setRecipleModuleLoad, setRecipleModuleStart, setRecipleModuleUnload } from '@reciple/decorators';
import { GuildTextBasedChannel, PermissionsBitField, isJSONEncodable, type Interaction } from 'discord.js';
import { InteractionEventListenerError } from './InteractionEventListenerError.js';
import { RecipleInteractionEventsModuleData } from '../types/structures.js';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface RecipleInteractionEventsOptions {
    defaultHalt?: Exclude<InteractionListener<Interaction>['halt'], undefined>;
    logger?: Logger;
}

export interface RecipleInteractionEvents extends RecipleModuleData {
    id: string;
    name: string;
    versions: string;
}

const packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'));

@setRecipleModule({
    id: 'org.reciple.js.interaction-events',
    name: packageJson.name,
    versions: packageJson.peerDependencies?.['@reciple/core'],
})
export class RecipleInteractionEvents implements RecipleModuleData, RecipleInteractionEventsOptions {
    public client!: RecipleClient;
    public logger?: Logger;

    public defaultHalt?: Exclude<InteractionListener<Interaction>['halt'], undefined>;

    constructor(options?: RecipleInteractionEventsOptions) {
        this.emitInteraction = this.emitInteraction.bind(this);
        this.defaultHalt = options?.defaultHalt;
        this.logger = options?.logger;
    }

    @setRecipleModuleStart()
    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client;
        this.logger ??= client.logger?.clone({ name: 'RecipleInteractionEvents' });

        return true;
    }

    @setRecipleModuleLoad()
    public async onLoad(): Promise<void> {}

    @setRecipleModuleUnload()
    public async onUnload(): Promise<void> {}

    @setClientEvent('interactionCreate')
    public async emitInteraction(interaction: Parameters<AnyInteractionListener['execute']>[0]): Promise<void> {
        let scripts: RecipleInteractionEventsModuleData[] = this.client.modules.cache.map(s => s.data as RecipleInteractionEventsModuleData);

        const commandType = RecipleInteractionEvents.getInteractionListenerType(interaction);

        for (const script of scripts) {
            if (!script.interactionListeners?.length) continue;

            const listeners = script.interactionListeners.map(l => isJSONEncodable(l) ? l.toJSON() : l);

            for (const listener of listeners) {

                if (listener.type !== commandType) continue;

                try {
                    if (this.isAnyCommandInteractionListener(listener)) {
                        if (!await RecipleInteractionEvents.isCommandNameMatch(interaction as AnyCommandInteraction, listener)) continue;
                    } else if (this.isAnyComponentInteractionListener(listener)) {
                        if (!await RecipleInteractionEvents.isCustomIdMatch(interaction as AnyComponentInteraction, listener)) continue;
                    }

                    const channel = interaction.channelId ? await interaction.guild?.channels.fetch(interaction.channelId) as GuildTextBasedChannel : null;
                    const requiredMemberPermissions = listener.requiredMemberPermissions ? PermissionsBitField.resolve(listener.requiredMemberPermissions) : null;
                    const requiredBotPermissions = listener.requiredBotPermissions ? PermissionsBitField.resolve(listener.requiredBotPermissions) : null;

                    if (channel && interaction.inCachedGuild()) {
                        if (requiredMemberPermissions && !channel.permissionsFor(interaction.member).has(requiredMemberPermissions)) {
                            if (listener.halt) await this.executeListenerHalt(listener, {
                                reason: InteractionListenerHaltReason.MissingMemberPermissions,
                                missingPermissions: new PermissionsBitField(channel.permissionsFor(interaction.member).missing(requiredMemberPermissions)),
                                interaction
                            });
                            continue;
                        }

                        if (requiredBotPermissions && !await CommandPermissionsPrecondition.userHasPermissionsIn(channel ?? interaction.guild, requiredBotPermissions)) {
                            if (listener.halt) await this.executeListenerHalt(listener, {
                                reason: InteractionListenerHaltReason.MissingBotPermissions,
                                missingPermissions: await CommandPermissionsPrecondition.getMissingPermissionsIn(channel ?? interaction.guild, requiredBotPermissions),
                                interaction
                            });
                            continue;
                        }
                    }

                    if (listener.cooldown) {
                        const cooldownData: Omit<CooldownData, 'endsAt'> = {
                            commandName: `interaction-event ${'customId' in interaction ? interaction.customId : interaction.commandName}`,
                            guildId: interaction.guildId ?? undefined,
                            userId: interaction.user.id
                        };
                        const isCooledDown = this.client.cooldowns?.findCooldown(cooldownData);

                        if (isCooledDown) {
                            if (listener.halt) await this.executeListenerHalt(listener, {
                                reason: InteractionListenerHaltReason.Cooldown,
                                cooldown: isCooledDown,
                                interaction
                            });
                            continue;
                        }

                        this.client.cooldowns?.create({
                            ...cooldownData,
                            endsAt: new Date(Date.now() + listener.cooldown)
                        });
                    }

                    // @ts-expect-error Sure
                    await Promise.resolve(listener.execute(interaction));
                } catch(error) {
                    const handled = await this.executeListenerHalt(listener, {
                        reason: InteractionListenerHaltReason.Error,
                        error,
                        interaction
                    });

                    if (handled) continue;
                    this.client._throwError(new InteractionEventListenerError({
                        message: 'An error occured while executing an interaction event listener.',
                        cause: error,
                        listenerType: InteractionListenerType[listener.type] as keyof typeof InteractionListenerType
                    }))
                }
            }
        }
    }

    public async executeListenerHalt<T extends AnyInteractionListener>(listener: T, data: AnyInteractionListenerHaltData<Parameters<T['execute']>[0]>): Promise<boolean|void> {
        const result = listener.halt ? listener.halt(data as any) : null;
        if (typeof result === 'boolean') return result;

        return this.defaultHalt?.(data as any);
    }

    public static getInteractionListenerType(interaction: Parameters<AnyInteractionListener['execute']>[0]): InteractionListenerType {
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

    public static async isCommandNameMatch<T extends AnyCommandInteractionListener>(interaction: Parameters<T['execute']>[0], listener: T): Promise<boolean> {
        if (!listener.commandName) return true;

        return typeof listener.commandName === 'string'
            ? listener.commandName === interaction.commandName
            // @ts-expect-error 
            : listener.commandName(interaction);
    }

    public static async isCustomIdMatch<T extends AnyComponentInteractionListener>(interaction: Parameters<T['execute']>[0], listener: T): Promise<boolean> {
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