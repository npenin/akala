import * as ac from '@akala/commands'

export default new ac.Trigger<void, void>('keybinding', (container) =>
{
    let chord = container;
    document.addEventListener('keydown', (ev) =>
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
            console.error('no command matches ' + chord.name + ', ' + sequence);
            return;
        }
        if (!cmd)
        {
            console.error('no command matches ' + sequence);
            return;
        }
        if (cmd instanceof ac.Container)
        {
            chord = cmd;
        }
        container.dispatch(cmd);
    });
})