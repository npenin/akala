import * as cmds from "../..";

export type state = { value: number };

export var calculator = new cmds.Container<state>('counter', { value: 0 });

var cmd = calculator.register(new cmds.Command<state>(function increment(step: number)
{
    if (step && typeof step == 'string')
        step = Number(step);
    this.value += step || 1;
}, 'increment', ['param.0']));
cmd.triggers['http'] = { method: 'post', route: '/increment/:step?', inject: ['route.step'] }


cmd = calculator.register(new cmds.Command<state>(function reset()
{
    this.value = 0;
}, 'reset'));
cmd.triggers['http'] = { method: 'post', route: '/reset' }


cmd = calculator.register(new cmds.Command<state>(function decrement(state: state, step: number)
{
    if (step && typeof step == 'string')
        step = Number(step);
    state.value -= step || 1;
}));

cmd.inject = ['$state', 'param.0'];
cmd.triggers['http'] = { method: 'post', route: '/decrement/:step?', inject: ['$state', 'route.step'] }

