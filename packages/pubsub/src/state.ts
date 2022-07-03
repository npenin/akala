import { Container } from "@akala/commands";

export interface State
{
    [key: string]: { container: Container<unknown>, commandToDispatch: string }[];
}