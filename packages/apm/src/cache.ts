import { type Arguments, packagejson } from "@akala/core";
import add from "./commands/cache/add.js";
import { type State } from "./state.js";

export default function Cache(state: State)
{
    return {
        add(...args: Arguments<typeof add>): Promise<packagejson.CoreProperties> { return add.apply(state, args); }
    }
} 
