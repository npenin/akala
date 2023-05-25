import { renderOuter } from './dom-walker.js'
import * as dom from './dom.js'
export { dom }
export { renderOuter, renderOuterWithDomAPI } from './dom-walker.js'

const page: dom.Document = {
    type: 'html',
    head: { title: 'pwet', meta: { 'og:product': 'totot' } },
    body: [
        { type: '', content: 'coucou' }
    ]
}



console.log(renderOuter(page, '\n'));