import State from "../state";

export default function (this: State, name: string)
{
    this.schedules[name].start();
}