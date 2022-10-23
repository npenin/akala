import { Container } from "@akala/commands";
import CliGatewayProcessor from "../cli-wrapper-processor";

export default async function $init(container: Container<void>, bin: string)
{
    if (!bin)
        bin = container.name;
    container.processor.useMiddleware(20, new CliGatewayProcessor(bin))
}