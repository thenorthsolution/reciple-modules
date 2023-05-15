import { AnyCommandBuilder, CommandType, ContextMenuCommandBuilder, Logger, MessageCommandBuilder, MessageCommandExecuteData, MessageCommandExecuteFunction, RecipleClient, RecipleModuleScript, RecipleModuleScriptUnloadData, SlashCommandBuilder, getCommandBuilderName } from '@reciple/client';
import { RecipleDevCommandModuleScript } from '../types/DevCommandModule';
import { readFileSync } from 'fs';
import path from 'path';

export class DevCommandManager implements RecipleModuleScript {
    private packageJson: Record<string, any> = JSON.parse(readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
    readonly moduleName: string = this.packageJson.name;
    readonly versions: string = this.packageJson.peerDependencies['@reciple/client'];
    readonly devCommands: AnyCommandBuilder[] = [];

    public client!: RecipleClient;
    public logger?: Logger;
    public devGuilds?: string[];
    public devUsers?: string[];

    public async onStart(client: RecipleClient<false>): Promise<boolean> {
        this.client = client;
        this.logger = client.logger?.clone({ name: 'DevCommands' });

        if (!this.devGuilds && process.env.DEV_GUILD) this.devGuilds = process.env.DEV_GUILD.split(' ');

        return true;
    }

    public async onLoad(client: RecipleClient<true>): Promise<void> {
        for (const [id, mdule] of client.modules.modules) {
            this.devCommands.push(...await this.getModuleDevCommands(mdule.script));
        }

        const applicationCommands = this.devCommands.filter(c => c.commandType !== CommandType.MessageCommand) as (ContextMenuCommandBuilder|SlashCommandBuilder)[];

        client.once('recipleRegisterApplicationCommands', () => {
            client.commands.add(this.devCommands);

            this.logger?.log(`Loaded (${applicationCommands.length}) dev application command(s)`);
            this.logger?.log(`Loaded (${this.devCommands.length - applicationCommands.length}) dev message command(s)`);
        });

        for (const guildId of (this.devGuilds ?? [])) {
            await client.application.commands.set(applicationCommands, guildId);
            this.logger?.log(`Registered (${applicationCommands.length}) dev commands to ${guildId}`);
        }
    }

    public async onUnload(unloadData: RecipleModuleScriptUnloadData): Promise<void> {
        for (const command of this.devCommands) {
            switch (command.commandType) {
                case CommandType.ContextMenuCommand:
                    this.client.commands.contextMenuCommands.delete(command.name);
                    break;
                case CommandType.MessageCommand:
                    this.client.commands.messageCommands.delete(command.name);
                    break;
                case CommandType.SlashCommand:
                    this.client.commands.slashCommands.delete(command.name);
                    break;
            }

            this.logger?.debug(`Removed ${getCommandBuilderName(command.commandType)}:${command.name}`)
        }
    }

    public async getModuleDevCommands(script: RecipleDevCommandModuleScript): Promise<(AnyCommandBuilder)[]> {
        const commands: AnyCommandBuilder[] = [];
        if (!script?.devCommands) return commands;

        for (const command of script.devCommands) {
            if (command.commandType !== CommandType.MessageCommand) {
                commands.push(
                    command.commandType === CommandType.ContextMenuCommand
                    ? ContextMenuCommandBuilder.resolve(command)
                    : SlashCommandBuilder.resolve(command)
                );
                continue;
            }

            const originalExecute = command.execute;
            const execute: MessageCommandExecuteFunction = (data: MessageCommandExecuteData) => {
                if (data.message.inGuild() && !(this.devGuilds ?? []).includes(data.message.guildId)) return;
                if (this.devUsers && !this.devUsers.includes(data.message.author.id)) return;

                return originalExecute ? originalExecute(data) : undefined;
            };

            commands.push(MessageCommandBuilder.resolve(command).setExecute(execute));
        }

        return commands;
    }
}