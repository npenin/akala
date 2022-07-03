import { Container } from "@akala/commands";
import { State } from "../state";

export default async function subscribe(this: State, container: Container<unknown>, topic: string, commandToDispatch: string)
{
    this[topic] = this[topic] || [];
    this[topic].push({ container, commandToDispatch });
}