import { Container, Trigger } from '@akala/commands'

export default new Trigger<[options?: Partial<{ element: HTMLElement, warnOnUnkownCommand?: boolean }>], void>('keybinding', (container, options) =>
{
    let chord = container;
    (options?.element ?? document).addEventListener('keydown', (ev: KeyboardEvent) =>
    {
        let sequence = '';
        if (ev.ctrlKey)
            sequence += 'Ctrl+';
        if (ev.metaKey)
            sequence += 'Meta+';
        if (ev.shiftKey)
            sequence += 'Shift+';
        if (ev.altKey)
            sequence += 'Alt+';
        if (ev.key == 'Alt' || ev.key == 'Shift' || ev.key == 'Ctrl' || ev.key == 'Meta')
            return;
        if (ev.key)
            sequence += ev.key;
        else
            sequence += ev.code;

        const cmd = container.resolve(sequence);
        if (chord !== container && !cmd)
        {
            if (options?.warnOnUnkownCommand)
                console.error('no command matches ' + chord.name + ', ' + sequence);
            return;
        }
        if (!cmd)
        {
            if (options?.warnOnUnkownCommand)
                console.error('no command matches ' + sequence);
            return;
        }
        if (cmd instanceof Container)
        {
            chord = cmd;
        }
        container.dispatch(cmd, ev);
    });
})