import interact from "..";

export default async function pwet(a: string): Promise<void>
{
    if (!a)
        interact('please specify a')
    console.log(a);
}