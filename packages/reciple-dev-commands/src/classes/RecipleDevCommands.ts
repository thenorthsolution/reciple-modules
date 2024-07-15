import { CommandType, ContextMenuCommandBuilder, MessageCommandBuilder, SlashCommandBuilder, Utils, type AnyCommandBuilder, type AnyCommandExecuteData, type RecipleClient, type RecipleModuleData, type RecipleModuleLoadData, type RecipleModuleStartData, type RecipleModuleUnloadData } from '@reciple/core';
import { setRecipleModule, setRecipleModuleLoad, setRecipleModuleStart, setRecipleModuleUnload } from '@reciple/decorators';
import { kleur, type Logger, type PackageJson } from 'fallout-utility';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DevCommandPrecondition } from './DevCommandPrecondition.js';
import type { RecipleDevCommandModuleData } from '../types/DevCommandModule.js';

export interface RecipleDevCommandsOptions {
    allowExecuteInDms?: boolean;
    allowExecuteInNonDevGuild?: boolean;
    allowNonDevUserExecuteInDevGuild?: boolean;
    devGuilds?: (string|{ id: string; })[];
    devUsers?: (string|{ id: string; })[];
    logger?: Logger;
}

export interface RecipleDevCommands extends RecipleModuleData, RecipleDevCommandsOptions {
    id: string;
    name: string;
    versions: string;
}

const packageJson: PackageJson = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'))

@setRecipleModule({
    id: 'org.reciple.js.dev-commands',
    name: packageJson.name,
    versions: packageJson.peerDependencies?.['@reciple/core'],
})
export class RecipleDevCommands implements RecipleModuleData, RecipleDevCommandsOptions {
    public precondition: DevCommandPrecondition = new DevCommandPrecondition({ manager: this });
    public allowExecuteInDms: boolean;
    public allowExecuteInNonDevGuild: boolean;
    public allowNonDevUserExecuteInDevGuild: boolean;
    public devGuilds: string[] = [];
    public devUsers: string[] = [];
    public client!: RecipleClient;
    public logger?: Logger;

    public commands: AnyCommandBuilder[] = [];

    get applicationCommands() {
        return this.commands.filter(command => !command.isMessageCommand());
    }

    constructor(options?: RecipleDevCommandsOptions) {
        this.allowExecuteInDms = options?.allowExecuteInDms ?? true;
        this.allowExecuteInNonDevGuild = options?.allowExecuteInNonDevGuild ?? true;
        this.allowNonDevUserExecuteInDevGuild = options?.allowNonDevUserExecuteInDevGuild ?? true;
        this.devGuilds = options?.devGuilds?.map(guild => typeof guild === 'string' ? guild : guild.id).filter(Boolean) ?? [];
        this.devUsers = options?.devUsers?.map(user => typeof user === 'string' ? user : user.id).filter(Boolean) ?? [];
        this.logger = options?.logger;
    }

    @setRecipleModuleStart()
    public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
        this.client = client;
        this.logger ??= client.logger?.clone({ name: 'RecipleDevCommands' });

        return true;
    }

    @setRecipleModuleLoad()
    public async onLoad({ client }: RecipleModuleLoadData): Promise<void> {
        client.commands.addPreconditions(this.precondition);

        for (const [id, module] of client.modules.cache) {
            const commands = RecipleDevCommands.getModuleDevCommands(module.data);
            if (!commands.length) continue;

            this.commands.push(...commands);
            this.logger?.log(`Loaded (${commands.length}) dev command(s) from ${kleur.green(module.displayName)}`);
        }

        this.logger?.log(`Loaded (${this.commands.length}) dev command(s) from ${kleur.green(client.modules.cache.size)} modules`);
    }

    @setRecipleModuleUnload()
    public async onUnload({ client }: RecipleModuleUnloadData): Promise<void> {
        client.commands.preconditions.delete(this.precondition.id);
    }

    public static getModuleDevCommands(script: RecipleDevCommandModuleData): AnyCommandBuilder[] {
        const commands: AnyCommandBuilder[] = [];
        if (!script?.devCommands) return commands;

        for (const command of script.devCommands) {
            const data = Utils.resolveCommandBuilder(command);
            commands.push(
                data.command_type === CommandType.ContextMenuCommand
                    ? ContextMenuCommandBuilder.resolve(data)
                    : data.command_type === CommandType.MessageCommand
                        ? MessageCommandBuilder.resolve(data)
                        : SlashCommandBuilder.resolve(data)
            );
        }

        return commands;
    }

    public isDevCommand(name: string, type: CommandType): boolean {
        return this.commands.some(devCommand => devCommand.name === name && devCommand.command_type === type);
    }

    public async isExecutable(data: AnyCommandExecuteData): Promise<boolean> {
        const user = data.type === CommandType.MessageCommand ? data.message.author : data.interaction.user;
        const channelId = data.type === CommandType.MessageCommand ? data.message.channelId : data.interaction.channelId;

        const channel = await this.client.channels.fetch(channelId).catch(() => null);
        if (!channel) return false;

        if (channel.isDMBased()) {
            return this.devUsers.includes(user.id) ? this.allowExecuteInDms : false;
        }

        const guild = channel.guild;
        const isDevUser = this.devUsers.includes(user.id);
        const isDevGuild = this.devGuilds.includes(guild.id);

        if (isDevUser && !isDevGuild) return this.allowExecuteInNonDevGuild;
        if (!isDevUser && isDevGuild) return this.allowNonDevUserExecuteInDevGuild;

        return false;
    }
}