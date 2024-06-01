import { AnyCommandInteraction, AnyCommandInteractionListener, AnyComponentInteraction, AnyComponentInteractionListener, AnyInteractionListener, InteractionListenerHaltReason, InteractionListenerType } from '../types/listeners.js';
import { CommandPermissionsPrecondition, CooldownData, Logger, RecipleClient, RecipleModuleData, RecipleModuleStartData } from '@reciple/core';
import { RecipleInteractionListenerModule } from '../types/RecipleInteractionListenerModule.js';
import { GuildTextBasedChannel, PermissionsBitField, isJSONEncodable } from 'discord.js';
import { InteractionEventListenerError } from './InteractionEventListenerError.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export class InteractionEventManager implements RecipleModuleData {
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));

    readonly id: string = 'com.reciple.interaction-events';
    readonly name: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/core'];

    public client!: RecipleClient;
    public logger?: Logger;

    constructor() {
        this.emitInteraction = this.emitInteraction.bind(this);
    }

    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
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
        let scripts: RecipleInteractionListenerModule[] = this.client.modules.cache.map(s => s.data as RecipleInteractionListenerModule);

        const commandType = this.getInteractionListenerType(interaction);

        for (const script of scripts) {
            if (!script.interactionListeners?.length) continue;

            const listeners = script.interactionListeners.map(l => isJSONEncodable(l) ? l.toJSON() : l);

            for (const listener of listeners) {

                if (listener.type !== commandType) continue;

                try {
                    if (this.isAnyCommandInteractionListener(listener)) {
                        if (!await this.satisfiesCommandName(interaction as AnyCommandInteraction, listener)) continue;
                    } else if (this.isAnyComponentInteractionListener(listener)) {
                        if (!await this.satisfiesCustomId(interaction as AnyComponentInteraction, listener)) continue;
                    }

                    const channel = interaction.channelId ? await interaction.guild?.channels.fetch(interaction.channelId) as GuildTextBasedChannel : null;
                    const requiredMemberPermissions = listener.requiredMemberPermissions ? PermissionsBitField.resolve(listener.requiredMemberPermissions) : null;
                    const requiredBotPermissions = listener.requiredBotPermissions ? PermissionsBitField.resolve(listener.requiredBotPermissions) : null;

                    if (channel && interaction.inCachedGuild()) {
                        if (requiredMemberPermissions && !channel.permissionsFor(interaction.member).has(requiredMemberPermissions)) {
                            if (listener.halt) await listener.halt({
                                reason: InteractionListenerHaltReason.MissingMemberPermissions,
                                missingPermissions: new PermissionsBitField(channel.permissionsFor(interaction.member).missing(requiredMemberPermissions)),
                                // @ts-expect-error LOL
                                interaction
                            });
                            continue;
                        }

                        if (requiredBotPermissions && !await CommandPermissionsPrecondition.userHasPermissionsIn(channel ?? interaction.guild, requiredBotPermissions)) {
                            if (listener.halt) await listener.halt({
                                reason: InteractionListenerHaltReason.MissingBotPermissions,
                                missingPermissions: await CommandPermissionsPrecondition.getMissingPermissionsIn(channel ?? interaction.guild, requiredBotPermissions),
                                // @ts-expect-error LOL
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
                            if (listener.halt) await listener.halt({
                                reason: InteractionListenerHaltReason.Cooldown,
                                cooldown: isCooledDown,
                                // @ts-expect-error LOL
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
                    const handled = listener.halt ? await listener.halt({
                        reason: InteractionListenerHaltReason.Error,
                        error,
                        // @ts-expect-error LOL
                        interaction
                    }) : null;

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