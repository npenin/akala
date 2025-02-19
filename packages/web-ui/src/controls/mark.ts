import { Control, wcObserve, WebComponent } from "@akala/client";

@wcObserve('needle')
@wcObserve('text')
export class Mark extends Control<{ needle: string, text: string }> implements Partial<WebComponent>
{
    constructor(element: HTMLElement)
    {
        super(element);
    }

    connectedCallback()
    {
        super.connectedCallback();

        let text: string = undefined;
        let needle: string = undefined;

        const refreshNodes = () =>
        {
            const nodes = []
            if (!needle)
            {
                nodes.push(document.createTextNode(text));
            }
            else
            {

                let lastIndexOfNeedle: number = -needle.length;
                let indexOfNeedle: number;
                while ((indexOfNeedle = text?.indexOf(needle, lastIndexOfNeedle) ?? -1) > -1)
                {
                    if (indexOfNeedle == 0)
                    {
                        const mark = document.createElement('mark');
                        mark.innerText = needle;
                        nodes.push(mark);
                        lastIndexOfNeedle = indexOfNeedle + needle.length;
                        continue;
                    }

                    if (indexOfNeedle > lastIndexOfNeedle)
                    {
                        nodes.push(document.createTextNode(text.substring(lastIndexOfNeedle, indexOfNeedle)));
                    }
                    const mark = document.createElement('mark');
                    mark.innerText = needle;
                    nodes.push(mark);
                    lastIndexOfNeedle = indexOfNeedle + needle.length;
                }
                if (lastIndexOfNeedle < text.length)
                    nodes.push(document.createTextNode(text.substring(lastIndexOfNeedle)));
            }
            this.element.replaceChildren(...nodes)
        }

        this.teardown(this.bind('text').onChanged(ev =>
        {
            text = ev.value;
            if (ev.oldValue != text)
                refreshNodes()
        }, true));

        this.teardown(this.bind('needle')?.onChanged(ev =>
        {
            needle = ev.value
            if (ev.oldValue != needle)
                refreshNodes();
        }, true));
    }
}