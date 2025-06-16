import { State } from "../../state.js";

export default async function (this: State, { uri }: { uri: string }): Promise<{
    contents: [
        {
            uri: string,
            mimeType: string,
            text: string,
        }
    ]
}>
{
    const url = new URL(uri);
    return await this.resourceRouter.process({
        uri: url,
        path: url.pathname,
    });
}
