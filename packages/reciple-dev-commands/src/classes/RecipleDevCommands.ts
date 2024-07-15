import { CommandType, ContextMenuCommandBuilder, MessageCommandBuilder, SlashCommandBuilder, Utils, type AnyCommandBuilder, type RecipleClient, type RecipleModuleData, type RecipleModuleLoadData, type RecipleModuleStartData, type RecipleModuleUnloadData } from '@reciple/core';
import { setClientEvent, setRecipleModule, setRecipleModuleLoad, setRecipleModuleStart, setRecipleModuleUnload } from '@reciple/decorators';
import { kleur, type Logger, type PackageJson } from 'fallout-utility';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DevCommandPrecondition } from './DevCommandPrecondition.js';
import type { RecipleDevCommandModuleData } from '../types/DevCommandModule.js';
import { ApplicationCommandType, PermissionsBitField, type ApplicationCommand, type Collection } from 'discord.js';
import type { RecipleDevCommandsPermissionsCache } from '../types/structures.js';

export interface RecipleDevCommandsOptions {
    allowExecuteInNonDevGuild?: boolean;
    devGuilds?: (string|{ id: string; })[];
    logger?: Logger;
}

const packageJson: PackageJson = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf-8'))

@setRecipleModule({
    id: 'org.reciple.js.dev-commands',
    name: packageJson.name,
    versions: packageJson.peerDependencies?.['@reciple/core'],
})
export class RecipleDevCommands implements RecipleModuleData, RecipleDevCommandsOptions {
    public precondition: DevCommandPrecondition = new DevCommandPrecondition({ devCommandManager: this });
    public allowExecuteInNonDevGuild: boolean;
    public devGuilds: string[] = [];
    public client!: RecipleClient;
    public logger?: Logger;

    public commands: AnyCommandBuilder[] = [];
    public commandPermissions: RecipleDevCommandsPermissionsCache[] = [];

    get applicationCommands() {
        return this.commands.filter(command => !command.isMessageCommand());
    }

    constructor(options?: RecipleDevCommandsOptions) {
        this.allowExecuteInNonDevGuild = options?.allowExecuteInNonDevGuild ?? true;
        this.devGuilds = options?.devGuilds?.map(guild => typeof guild === 'string' ? guild : guild.id).filter(Boolean) ?? [];
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

            permissionCacheLoop: for (const command of commands) {
                if (command.isMessageCommand() || this.allowExecuteInNonDevGuild) continue permissionCacheLoop;

                const requiredMemberPermissions = command.required_member_permissions;
                const defaultMemberPermissions = command.default_member_permissions;

                if (!requiredMemberPermissions && !defaultMemberPermissions) continue permissionCacheLoop;

                this.commandPermissions.push({
                    command: command.name,
                    type: command.type ?? ApplicationCommandType.ChatInput,
                    required_member_permissions: typeof requiredMemberPermissions !== 'undefined'
                        ? new PermissionsBitField(requiredMemberPermissions)
                        : undefined,
                    default_member_permissions: typeof defaultMemberPermissions !== 'undefined' && defaultMemberPermissions !== null
                        ? new PermissionsBitField(
                            typeof defaultMemberPermissions === 'string'
                                ? BigInt(defaultMemberPermissions)
                                : defaultMemberPermissions
                            )
                        : undefined
                });

                command.setDefaultMemberPermissions('0');
                command.setRequiredBotPermissions('0');
            }

            this.commands.push(...commands);
            this.logger?.log(`Loaded (${commands.length}) dev command(s) from ${kleur.green(module.displayName)}`);
        }

        this.logger?.log(`Loaded (${this.commands.length}) dev command(s) from ${kleur.green(client.modules.cache.size)} modules`);
    }

    @setClientEvent('recipleRegisterApplicationCommands')
    public async handleRegisterApplicationCommands(commands: Collection<string, ApplicationCommand>): Promise<void> {
        if (!this.commandPermissions.length || this.allowExecuteInNonDevGuild) return;

        const builders = this.applicationCommands;

        devGuildLoop: for (const guildId of this.devGuilds) {
            const guild = await this.client.guilds.fetch(guildId).catch(() => null);
            if (!guild) continue devGuildLoop;

            const applicationCommands = await guild.commands.fetch().catch(() => null);
            if (!applicationCommands?.size) continue devGuildLoop;

            applicationCommandLoop: for (const [id, applicationCommand] of applicationCommands) {
                const builder = builders.find(c => !c.isMessageCommand() && c.name === applicationCommand.name && c.type === applicationCommand.type);
                const permissionCache = this.commandPermissions.find(c => c.command === id && c.type === applicationCommand.type);
                if (!builder || !permissionCache || builder.isMessageCommand()) continue applicationCommandLoop;

                const requiredMemberPermissions = permissionCache.required_member_permissions;
                const defaultMemberPermissions = permissionCache.default_member_permissions;

                builder.setDefaultMemberPermissions(defaultMemberPermissions?.bitfield);
                builder.setRequiredBotPermissions(requiredMemberPermissions?.bitfield ?? null);

                await applicationCommand.edit({
                    defaultMemberPermissions: defaultMemberPermissions
                }).catch(() => null);
            }
        }
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
}