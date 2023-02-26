import State from "../state.js";

export default function (this: State, name: string)
{
    this.schedules[name].stop();
}