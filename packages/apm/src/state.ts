import { ErrorWithStatus, Logger } from "@akala/core";
import { FileHandle, FileSystemProvider, OpenFlags } from "@akala/fs"

export interface State
{
    registry: Record<string, string>
    fs: FileSystemProvider;
    logger: Logger
    cacheFolder: FileSystemProvider;
}

export async function closest(fs: FileSystemProvider, fileName: string): Promise<FileHandle>
{
    if (!fs)
        throw new ErrorWithStatus(404);
    try
    {
        return await fs.open(fileName, OpenFlags.ReadWrite | OpenFlags.Truncate);
    }
    catch (e)
    {
        if (e.statusCode == 404)
            return closest(fs.newChroot('../'), fileName);
        throw e;
    }
}
