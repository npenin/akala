
import { Container, Trigger } from '@akala/commands'

/** 
 * Creates a keybinding trigger that maps keyboard shortcuts to commands.
 * @param {Partial<{ element: HTMLElement, warnOnUnknownCommand?: boolean }>} [options] - Configuration options.
 * @description Listens for keydown events and resolves command sequences from pressed keys.
 */
export default new Trigger<[options?: Partial<{ element: HTMLElement, warnOnUnknownCommand?: boolean }>], void>('keybinding', (container, options) =>
{
    let chord = container;
    /**
     * Attach keydown event listener to specified element (or document)
     * @param {HTMLElement} targetElement - Element to attach listener to
     */
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
        if (['Alt', 'Shift', 'Ctrl', 'Meta'].includes(ev.key))
            return;

        sequence += ev.key || ev.code;

        const cmd = container.resolve(sequence);
        if (chord !== container && !cmd)
        {
            if (options?.warnOnUnknownCommand)
                console.error(`No command matches ${chord.name}, ${sequence}`);
            return;
        }
        if (!cmd)
        {
            if (options?.warnOnUnknownCommand)
                console.error(`No command matches ${sequence}`);
            return;
        }
        if (cmd instanceof Container)
            chord = cmd;
        else
            container.dispatch(cmd, ev);
    });
})
