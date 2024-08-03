import * as cmds from "../../index.js";
import { configure } from "../../decorators.js";

export type state = { value: number };

export const calculator = new cmds.Container<state>('counter', { value: 0 });

let cmd = calculator.register(new cmds.SelfDefinedCommand<state>(function increment(step: number)
{
    if (step && typeof step == 'string')
        step = Number(step);
    this.value += step || 1;
}, 'increment', ['param.0']));
cmd.config.http = { method: 'post', route: '/increment/:step?', inject: ['route.step'] }

cmd = calculator.register(new cmds.SelfDefinedCommand<state>(function reset()
{
    this.value = 0;
}, 'reset'));
cmd.config.http = { method: 'post', route: '/reset' }

cmd = configure('http', { method: 'post', route: '/decrement/:step?', inject: ['$state', 'route.step'] })(
    calculator.register(new cmds.SelfDefinedCommand<state>(function decrement(state: state, step: number)
    {
        if (step && typeof step == 'string')
            step = Number(step);
        state.value -= step || 1;
    }))
);

cmd.inject = ['$state', 'param.0'];

