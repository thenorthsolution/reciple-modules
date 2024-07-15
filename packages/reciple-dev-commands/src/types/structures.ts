import type { ApplicationCommandType, PermissionsBitField } from 'discord.js';

export interface RecipleDevCommandsPermissionsCache {
    command: string;
    type: ApplicationCommandType;
    required_member_permissions?: PermissionsBitField;
    default_member_permissions?: PermissionsBitField;
}