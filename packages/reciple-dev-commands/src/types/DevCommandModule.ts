import { AnyCommandResolvable, RecipleModuleData } from '@reciple/core';

export interface RecipleDevCommandModuleScript extends RecipleModuleData {
    devCommands?: AnyCommandResolvable[];
}