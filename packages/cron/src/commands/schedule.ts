import { Container } from '@akala/commands'
import getTarget, { DateRequest } from "..";
import { State } from '../state';
import wait from './wait';

export default function schedule(
    this: State,
    cmdNameToTrigger: string,
    container: Container<void>,
    date: DateRequest, recursive?: boolean)
{
    const d = getTarget(date);
    wait(date).then(async () =>
    {
        await container.dispatch(cmdNameToTrigger);
        if (recursive)
            schedule.call(this, cmdNameToTrigger, container, date, recursive);
    });
}