import { ErrorWithStatus, Http, HttpCallFormatterFactory, mapAsync } from "@akala/core";
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs/promises'
import State from "../state.js";
import path from 'path'
import mime from 'mime-types'

export type entry =
    {
        displayname: string;
        creationdate: Date;
        getcontentlength: number;
        getcontenttype: string;
        getetag: string;
        getlastmodified: Date;
        resourcetype?: 'collection';
    }

export default async function propfind(this: State, http: Http, route: string, properties: (keyof entry)[], depth?: number): Promise<entry[]>
{
    const cwd = await fs.stat(path.join(this.root, route));
    if (cwd.isDirectory())
    {
        return mapAsync(await fs.readdir(path.join(this.root, route), { withFileTypes: true }), async p =>
        {
            const stats = await fs.stat(path.join(this.root, route, p.name));
            return {
                displayname: p.name,
                creationdate: stats.ctime,
                getcontentlength: stats.size,
                getcontenttype: mime.contentType(p.name) || 'application/object',
                getetag: `W/"${stats.size}-${stats.mtime}`,
                getlastmodified: stats.mtime,
                resourcetype: stats.isDirectory() ? 'collection' : undefined
            };
        });
    }
}