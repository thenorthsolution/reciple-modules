import { type CommandPrecondition, type CommandPreconditionData, type CommandPreconditionResultResolvable, type ContextMenuCommandExecuteData, type MessageCommandExecuteData, type SlashCommandExecuteData } from '@reciple/core';
import type { RecipleDevCommands } from './RecipleDevCommands.js';

export interface DevCommandPreconditionOptions {
    manager: RecipleDevCommands;
}

export class DevCommandPrecondition implements CommandPreconditionData {
    public id: string;

    private manager: RecipleDevCommands;

    constructor(options: DevCommandPreconditionOptions) {
        this.id = options.manager.id;
        this.manager = options.manager;
    }

    public async contextMenuCommandExecute(execute: ContextMenuCommandExecuteData, precondition: CommandPrecondition): Promise<CommandPreconditionResultResolvable<ContextMenuCommandExecuteData>> {
        const builder = execute.builder;

        if (!this.manager.isDevCommand(builder.name, builder.command_type)) return true;
        return this.manager.isExecutable(execute);
    }

    public async messageCommandExecute(execute: MessageCommandExecuteData, precondition: CommandPrecondition): Promise<CommandPreconditionResultResolvable<MessageCommandExecuteData>> {
        const builder = execute.builder;

        if (!this.manager.isDevCommand(builder.name, builder.command_type)) return true;
        return this.manager.isExecutable(execute);
    }

    public async slashCommandExecute(execute: SlashCommandExecuteData, precondition: CommandPrecondition): Promise<CommandPreconditionResultResolvable<SlashCommandExecuteData>> {
        const builder = execute.builder;

        if (!this.manager.isDevCommand(builder.name, builder.command_type)) return true;
        return this.manager.isExecutable(execute);
    }
}