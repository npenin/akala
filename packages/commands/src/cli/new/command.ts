import { type CliContext } from "@akala/cli";
import { outputHelper } from "../../new.js";

export default async function (name: string, options: CliContext<{ force?: boolean }>['options'], destination?: string, args?: { name: string, type?: string }[], resultType?: string, events?: { preFunctionDeclaration?(output: WritableStreamDefaultWriter): Promise<void>, postFunctionDeclaration?(output: WritableStreamDefaultWriter): Promise<void> })
{
    const { output } = await outputHelper(destination, name + '.ts', options && options.force);

    await events?.preFunctionDeclaration?.(output);

    await output.write(`export default async function ${name.replace(/[- \.](\w)/g, (m, letter) => letter.toUpperCase())}(${args?.map(a => a.type ? a.name + ': ' + a.type : a.name)?.join(', ') || ''}) ${resultType ? ': ' + resultType : ''}
{

}`);

    await events?.postFunctionDeclaration?.(output);

    await output.close();

}
