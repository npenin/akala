import { Arguments } from "@akala/core";
import add from "./commands/cache/add.js";
import { State } from "./state.js";

export default function Cache(state: State)
{
    return {
        add(...args: Arguments<typeof add>) { return add.apply(state, args); }
    }
} 
