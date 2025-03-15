import { EmptyBinding } from '@akala/core';

/**
 * Client bindings.
 * @param {any} client - The client instance.
 */
export class ClientBindings
{
    public static input(input: HTMLInputElement)
    {
        const binding = new EmptyBinding<string>();
        input.addEventListener('input', (ev =>
        {
            binding.setValue(input.value);
        }));
        return binding;
    }
    public static number(input: HTMLInputElement)
    {
        const binding = new EmptyBinding<number>();
        input.addEventListener('input', (ev =>
        {
            binding.setValue(input.valueAsNumber);
        }));
        return binding;
    }
    public static date(input: HTMLInputElement)
    {
        const binding = new EmptyBinding<Date>();
        input.addEventListener('input', (ev =>
        {
            binding.setValue(input.valueAsDate);
        }));
        return binding;
    }
    public static file(input: HTMLInputElement)
    {
        const binding = new EmptyBinding<File>();
        input.addEventListener('change', (ev =>
        {
            binding.setValue(input.files[0]);
        }));
        return binding;
    }
    public static files(input: HTMLInputElement)
    {
        const binding = new EmptyBinding<FileList>();
        input.addEventListener('change', (ev =>
        {
            binding.setValue(input.files);
        }));
        return binding;
    }
    public static select(input: HTMLSelectElement)
    {
        const binding = new EmptyBinding<string>();
        input.addEventListener('change', (ev =>
        {
            binding.setValue(input.value);
        }));
    }
}
