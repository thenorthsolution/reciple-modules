import { AnySelectMenuInteraction, AutocompleteInteraction, Awaitable, BaseInteraction, ButtonInteraction, ChatInputCommandInteraction, ContextMenuCommandInteraction, ModalSubmitInteraction } from 'discord.js';

export enum InteractionListenerType {
    Autocomplete,
    ContextMenu,
    ChatInput,
    Button,
    ModalSubmit,
    SelectMenu
}

export interface InteractionListener<T extends BaseInteraction> {
    type: InteractionListenerType;
    execute: (interaction: T) => Awaitable<void>;
    commandName?: string|((interaction: T) => Awaitable<boolean>);
    customId?: string|((customId: T) => Awaitable<boolean>);
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