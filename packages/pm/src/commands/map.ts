import State from "../state";
import { join } from "path";

export default async function map(this: State, name: string, targetPath: string, commandable?: boolean)
{
    this.config.mapping[name] = { path: targetPath, commandable: !!commandable };
    await this.config.save();
    return { [name]: this.config.mapping[name] }
};