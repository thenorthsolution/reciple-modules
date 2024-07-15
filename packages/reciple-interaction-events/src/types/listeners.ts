import { Cooldown } from '@reciple/core';
import { AnySelectMenuInteraction, AutocompleteInteraction, Awaitable, BaseInteraction, ButtonInteraction, ChatInputCommandInteraction, ContextMenuCommandInteraction, ModalSubmitInteraction, PermissionResolvable, PermissionsBitField } from 'discord.js';

export enum InteractionListenerType {
    Autocomplete,
    ContextMenu,
    ChatInput,
    Button,
    ModalSubmit,
    SelectMenu
}

export enum InteractionListenerHaltReason {
    Error = 1,
    Cooldown,
    MissingMemberPermissions = 6,
    MissingBotPermissions = 7,
}

export type AnyInteractionListenerHaltData<T extends BaseInteraction = BaseInteraction> = InteractionListenerErrorHaltData<T>|InteractionListenerMissingPermissionsHaltData<T>|InteractionListenerCooldownHaltData<T>;

export interface InteractionListener<T extends BaseInteraction> {
    type: InteractionListenerType;
    cooldown?: number;
    execute: (interaction: T) => Awaitable<void>;
    halt?: (data: AnyInteractionListenerHaltData<T>) => Awaitable<boolean|void>;
    requiredMemberPermissions?: PermissionResolvable;
    requiredBotPermissions?: PermissionResolvable;
    commandName?: string|((interaction: T) => Awaitable<boolean>);
    customId?: string|((customId: T) => Awaitable<boolean>);
}

export interface InteractionListenerErrorHaltData<T extends BaseInteraction> {
    interaction: T;
    reason: InteractionListenerHaltReason.Error;
    error: unknown;
}

export interface InteractionListenerCooldownHaltData<T extends BaseInteraction> {
    interaction: T;
    reason: InteractionListenerHaltReason.Cooldown;
    cooldown: Cooldown;
}

export interface InteractionListenerMissingPermissionsHaltData<T extends BaseInteraction> {
    interaction: T;
    reason: InteractionListenerHaltReason.MissingMemberPermissions|InteractionListenerHaltReason.MissingBotPermissions;
    missingPermissions: PermissionsBitField;
}

export interface CommandInteractionListener<T extends BaseInteraction> extends Omit<InteractionListener<T>, 'customId'> {
    type: InteractionListenerType.Autocomplete|InteractionListenerType.ChatInput|InteractionListenerType.ContextMenu;
}

export interface ComponentInteractionListener<T extends BaseInteraction> extends Omit<InteractionListener<T>, 'commandName'> {
    type: InteractionListenerType.Button|InteractionListenerType.ModalSubmit|InteractionListenerType.SelectMenu;
}

export interface AutocompleteInteractionListener extends CommandInteractionListener<AutocompleteInteraction> {
    type: InteractionListenerType.Autocomplete;
}

export interface ChatInputInteractionListener extends CommandInteractionListener<ChatInputCommandInteraction> {
    type: InteractionListenerType.ChatInput;
}

export interface ContextMenuInteractionListener extends CommandInteractionListener<ContextMenuCommandInteraction> {
    type: InteractionListenerType.ContextMenu;
}

export interface ButtonInteractionListener extends ComponentInteractionListener<ButtonInteraction> {
    type: InteractionListenerType.Button;
}

export interface ModalSubmitInteractionListener extends ComponentInteractionListener<ModalSubmitInteraction> {
    type: InteractionListenerType.ModalSubmit;
}

export interface SelectMenuInteractionListener extends ComponentInteractionListener<AnySelectMenuInteraction> {
    type: InteractionListenerType.SelectMenu;
}

export type AnyCommandInteractionListener = AutocompleteInteractionListener|ChatInputInteractionListener|ContextMenuInteractionListener;
export type AnyComponentInteractionListener = ButtonInteractionListener|ModalSubmitInteractionListener|SelectMenuInteractionListener;
export type AnyInteractionListener = AnyCommandInteractionListener|AnyComponentInteractionListener;

export type AnyCommandInteraction = AutocompleteInteraction|ChatInputCommandInteraction|ContextMenuCommandInteraction;
export type AnyComponentInteraction = ButtonInteraction|ModalSubmitInteraction|AnySelectMenuInteraction;
export type InteractionListenerGuard<T extends InteractionListenerType> = T extends InteractionListenerType.Autocomplete
    ? AutocompleteInteractionListener
    : T extends InteractionListenerType.ChatInput
        ? ChatInputInteractionListener
        : T extends InteractionListenerType.ContextMenu
            ? ContextMenuInteractionListener
            : T extends InteractionListenerType.Button
                ? ButtonInteractionListener
                : T extends InteractionListenerType.ModalSubmit
                    ? ModalSubmitInteractionListener
                    : T extends InteractionListenerType.SelectMenu
                        ? SelectMenuInteractionListener
                        : AnyInteractionListener;