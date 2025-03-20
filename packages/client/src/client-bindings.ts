import { EmptyBinding } from '@akala/core';

/**
 * Provides bindings for HTML form elements to observable values.
 */
export class ClientBindings
{
    /**
     * Creates a binding for text input elements.
     * @param input The HTMLInputElement to bind.
     * @returns Observable binding for the input's value.
     */
    public static input(input: HTMLInputElement): EmptyBinding<string>
    {
        const binding = new EmptyBinding<string>();
        input.addEventListener('input', () =>
        {
            binding.setValue(input.value);
        });
        return binding;
    }

    /**
     * Creates a binding for number input elements.
     * @param input The HTMLInputElement to bind.
     * @returns Observable binding for the input's numeric value.
     */
    public static number(input: HTMLInputElement): EmptyBinding<number>
    {
        const binding = new EmptyBinding<number>();
        input.addEventListener('input', () =>
        {
            binding.setValue(input.valueAsNumber);
        });
        return binding;
    }

    /**
     * Creates a binding for date input elements.
     * @param input The HTMLInputElement to bind.
     * @returns Observable binding for the input's date value.
     */
    public static date(input: HTMLInputElement): EmptyBinding<Date>
    {
        const binding = new EmptyBinding<Date>();
        input.addEventListener('input', () =>
        {
            binding.setValue(input.valueAsDate);
        });
        return binding;
    }

    /**
     * Creates a binding for file input elements (single file).
     * @param input The HTMLInputElement to bind.
     * @returns Observable binding for the selected File.
     */
    public static file(input: HTMLInputElement): EmptyBinding<File>
    {
        const binding = new EmptyBinding<File>();
        input.addEventListener('change', () =>
        {
            binding.setValue(input.files?.[0] ?? null);
        });
        return binding;
    }

    /**
     * Creates a binding for file input elements (multiple files).
     * @param input The HTMLInputElement to bind.
     * @returns Observable binding for the selected FileList.
     */
    public static files(input: HTMLInputElement): EmptyBinding<FileList>
    {
        const binding = new EmptyBinding<FileList>();
        input.addEventListener('change', () =>
        {
            binding.setValue(input.files);
        });
        return binding;
    }

    /**
     * Creates a binding for select elements.
     * @param input The HTMLSelectElement to bind.
     * @returns Observable binding for the selected value.
     */
    public static select(input: HTMLSelectElement): EmptyBinding<string>
    {
        const binding = new EmptyBinding<string>();
        input.addEventListener('change', () =>
        {
            binding.setValue(input.value);
        });
        return binding;
    }
}
