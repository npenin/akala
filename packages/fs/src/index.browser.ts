import { UrlHandler } from '@akala/core';
import { FileHandle, FileSystemProvider } from './shared.js';

export * from './shared.js';

const fsHandler = new UrlHandler<[URL, void], FileSystemProvider<FileHandle>>(true);
export default fsHandler;
