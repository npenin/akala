export interface Translator {
    (key: string): string;
    (format: string, ...parameters: any[]): string;
}
