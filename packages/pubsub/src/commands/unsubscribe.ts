import { Container } from "@akala/commands";
import { State } from "../state";

export default function unsubscribe(this: State, container: Container<unknown>, topic: string)
{
    var indexOfContainer = this[topic].findIndex(el => el.container === container);
    if (indexOfContainer > -1)
        this[topic].splice(indexOfContainer, 1);
}