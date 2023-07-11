import { renderOuter } from './dom-walker.js'
import * as dom from './dom.js'
export { dom }
export { renderOuter, renderOuterWithDomAPI } from './dom-walker.js'

const page: dom.Document = {
    type: 'html',
    head: { title: 'pwet', meta: { 'og:product': { value: 'totot' } } },
    body: [
        {
            type: '',
            content: 'coucou',
            render(n, t, prefix?)
            {
                if (typeof n == 'string')
                    return n + prefix + 'pwetpwet'
            },
        }
    ]
}