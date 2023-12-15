import { dom, renderOuterWithDomAPI } from '@akala/pages'
import sass from 'sass'

export interface CssConfig<Colors extends string>
{

    colors: Record<Colors, string>,
    lightnesses: { [key in Colors]?: Record<string, number> } & { default: Record<string, number> },
    darknesses: { [key in Colors]?: Record<string, number> } & { default: Record<string, number> },
}

const config: CssConfig<string> = {
    colors: { accent: "#00acf5", secondAccent: "#f5b700", success: "#89fc00", error: "#dc0073", warning: "#f5b700", 'dark': "#1F1E1C", 'light': "#FFFFFD" },
    lightnesses: {
        default: { "extra-dark": - 0.9, dark: -0.7, "medium-dark": -0.3, "medium-light": 0.3, light: 0.7, "extra-light": 0.9 },
        grey: { dark: -0.8, light: 0.7, "extra-light": 0.9 }
    },
    darknesses: {
        default: { dark: 0.8, medium: -0.3, light: -0.7, "extra-light": -0.9 },
        grey: { dark: 0.8, light: -0.7, "extra-light": -0.9 }
    }
}

const page: dom.Document = { type: 'html', head: {}, body: [] };

function updatePage()
{
    console.log('updating page')
    renderOuterWithDomAPI(page, document.getElementsByTagName('iframe')[0].contentDocument);
}

updatePage();

document.getElementById('page-title').addEventListener('input', ev => { page.head.title = (ev.target as HTMLInputElement).value; updatePage() })