
import { type Configuration, Container, Metadata, Trigger } from '@akala/commands/browser'

export interface KeyboardShortcutConfiguration extends Configuration
{
    shortcuts: string[];
}

declare module '@akala/commands/browser'
{
    interface ConfigurationMap
    {
        keyboard: KeyboardShortcutConfiguration;
    }
}

/** 
 * Creates a keybinding trigger that maps keyboard shortcuts to commands.
 * @param {Partial<{ element: HTMLElement, warnOnUnknownCommand?: boolean }>} [options] - Configuration options.
 * @description Listens for keydown events and resolves command sequences from pressed keys.
 */
export default new Trigger<[options?: Partial<{ element: HTMLElement, warnOnUnknownCommand?: boolean }>], void>('keybinding', async (container, options) =>
{
    const meta: Metadata.Container = await container.dispatch('$metadata', true);
    [...meta.commands, container.resolve('$metadata')].forEach(cmd => registerCommand(cmd, container, options?.element || document));
})
function registerCommand(cmd: Metadata.Command, container: Container<unknown>, element: HTMLElement | Document): void
{
    if (!cmd?.config?.keyboard)
        return;

    let activeChords: string[];

    /**
     * Attach keydown event listener to specified element (or document)
     * @param {HTMLElement} targetElement - Element to attach listener to
     */
    element.addEventListener('keydown', (ev: KeyboardEvent) =>
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

        sequence += ev.code || ev.key;

        if (activeChords?.length)
        {
            activeChords = activeChords.flatMap(chord =>
                cmd.config.keyboard.shortcuts.filter(s => s.startsWith(chord + ',' + sequence)).map(() => chord + ',' + sequence)
            ).filter(x => x.length);
        }
        else
        {
            activeChords = cmd.config.keyboard.shortcuts.filter(s => s.startsWith(sequence)).map(() => sequence)
        }

        if (activeChords.length == 1 && activeChords[0].endsWith(sequence))
        {
            container.dispatch(cmd.name, { event: ev, shortcut: activeChords[0], _trigger: 'keyboard' });
        }
    });
}

