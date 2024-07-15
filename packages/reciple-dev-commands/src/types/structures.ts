import { AnyCommandResolvable, RecipleModuleData } from '@reciple/core';

export interface RecipleDevCommandModuleData extends RecipleModuleData {
    devCommands?: AnyCommandResolvable[];
}