import interact from "..";

export default async function pwet(a: string)
{
    if (!a)
        interact('please specify a')
    console.log(a);
}