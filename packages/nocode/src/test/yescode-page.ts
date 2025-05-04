import { renderOuter } from "@akala/pages";
import { Page } from "../components/page.js";
import { Select } from "../components/select.js";
import { Columns } from "../layouts/columns.js";

export const page = new Page(null, [new Columns([
    { width: 3, content: [{ type: Select }] },
    { width: 3 },
    { width: 3 },
])]);

console.log(renderOuter(page));
