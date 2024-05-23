import interact from "../index.js";

export default async function pwet(a: string): Promise<void>
{
    if (!a)
        interact('please specify a')
    console.log(a);
}