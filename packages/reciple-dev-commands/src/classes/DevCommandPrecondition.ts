import { type AnyCommandExecuteData, type CommandPrecondition, type CommandPreconditionData, type CommandPreconditionResultResolvable, type ContextMenuCommandExecuteData, type MessageCommandExecuteData, type SlashCommandExecuteData } from '@reciple/core';
import type { RecipleDevCommands } from './RecipleDevCommands.js';

export interface DevCommandPreconditionOptions {
    devCommandManager: RecipleDevCommands;
}

export class DevCommandPrecondition implements CommandPreconditionData {
    public id: string = 'org.reciple.js.dev-command-precondition';

    private devCommandManager: RecipleDevCommands;

    constructor(options: DevCommandPreconditionOptions) {
        this.devCommandManager = options.devCommandManager;
    }

    public async contextMenuCommandExecute(execute: ContextMenuCommandExecuteData, precondition: CommandPrecondition): Promise<CommandPreconditionResultResolvable<ContextMenuCommandExecuteData>> {
        if (!this.isDevCommand(execute)) return true;

        return true;
    }

    public async messageCommandExecute(execute: MessageCommandExecuteData, precondition: CommandPrecondition): Promise<CommandPreconditionResultResolvable<MessageCommandExecuteData>> {
        if (!this.isDevCommand(execute)) return true;

        return true;
    }

    public async slashCommandExecute(execute: SlashCommandExecuteData, precondition: CommandPrecondition): Promise<CommandPreconditionResultResolvable<SlashCommandExecuteData>> {
        if (!this.isDevCommand(execute)) return true;

        return true;
    }

    private isDevCommand(execute: AnyCommandExecuteData): boolean {
        const builder = execute.builder;

        return this.devCommandManager.commands.some(devCommand => devCommand.name === builder.name && devCommand.command_type === builder.command_type);
    }
}