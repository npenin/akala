import { dom } from '@akala/pages';

export class Page implements dom.Document
{
    readonly type = 'html';
    public body: dom.FlowContentTags[];

    constructor(public head: dom.Document['head'], body?: dom.FlowContentTags[])
    {
        if (body)
            this.body = body;
    }

    preRender(): dom.Tag<string, Record<string, { value: string; }>> | dom.Tag<string, Record<string, { value: string; }>>[]
    {
        const entries = Object.entries(dom.customElementRegistry);
        if (entries.length > 0)
        {
            this.head.jsInit = this.head.jsInit || [];
            this.head.jsInit.push({
                type: 'script', content: entries.map(e =>
                {
                    if ('preRender' in e[1].component && typeof e[1].component.preRender == 'function')
                    {
                        const prerenderTags = e[1].component.preRender();
                        if (Array.isArray(prerenderTags))
                            this.head.jsInit.push(...prerenderTags.filter(pt => pt.type == 'script' && 'content' in pt) as dom.Script[]);
                        else if (prerenderTags.type == 'script' && 'content' in prerenderTags)
                            this.head.jsInit.push(prerenderTags as dom.Script);
                    }
                    let customElement = `class ${e[1].component.name}Element extends ${e[1].parent}{
                        
                        constructor(){
                        super(); 
                        const C=(${Object.getOwnPropertyDescriptor(e[1].component.prototype, 'constructor').value}); 
                        const c=new C();
                        if(c.attributes || c.style) 
                        {
                            const lateBoundAttributes= c.attributes;
                            const lateBoundStyle= c.style;
                            if(C.prototype.connectedCallback)
                            {
                                this.connectedCallback=function(...args){
                                    if(lateBoundAttributes)
                                        Object.assign(this.attributes, lateBoundAttributes);
                                    if(lateBoundStyle)
                                        Object.assign(this.attributes, lateBoundStyle);
                                    return C.prototype.connectedCallback.apply(this, args);
                                }
                            }
                            else
                                this.connectedCallback=function(){
                                    if(lateBoundAttributes)
                                        Object.assign(this.attributes, lateBoundAttributes);
                                    if(lateBoundStyle)
                                        Object.assign(this.attributes, lateBoundStyle);
                                }
                            
                            if(lateBoundStyle)
                                delete c.style;
                            if(lateBoundAttributes)
                                delete c.attributes;
                        }    
                        Object.assign(this,c);
                      } `;
                    Object.entries(Object.getOwnPropertyDescriptors(e[1].component.prototype)).forEach(p =>
                    {
                        if (p[0] === 'constructor')
                            return;
                        switch (typeof p[1].value)
                        {
                            case 'function':
                                if (['connectedCallback'].indexOf(p[0]) > -1)
                                { customElement += '__' + p[1].value; }
                                else
                                    customElement += p[1].value;
                                break;
                            case 'undefined':
                                customElement += p[1].get;
                                customElement += p[1].set;
                                break;
                            default:
                                console.error(p[1].value);
                                console.error(p);
                                break;
                        }
                    });
                    customElement += '}';
                    return `customElements.define('${e[0]}', ${customElement}, ${JSON.stringify(e[1].options)})`;
                }).join(';')
            });

        }
        return [];
    }
}
