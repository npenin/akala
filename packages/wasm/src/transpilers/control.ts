
/**
 * Represents the WebAssembly control instructions and block types.
 * Each enum value corresponds to the opcode or block type as defined in the WebAssembly binary format.
 *
 * @enum control
 * 
 * @property {number} block - (0x02) Begins a block of instructions.
 * @property {number} loop - (0x03) Begins a loop block.
 * @property {number} if - (0x04) Begins an if block.
 * @property {number} else - (0x05) Begins an else block within an if statement.
 * 
 * @property {number} br - (0x0c) Branches to a given label.
 * @property {number} br_if - (0x0d) Conditionally branches to a given label.
 * @property {number} br_table - (0x0e) Branches to a label based on an index.
 * @property {number} call - (0x10) Calls a function by its index.
 * @property {number} call_indirect - (0x11) Calls a function indirectly via a table.
 * @property {number} drop - (0x1a) Drops the value at the top of the stack.
 * 
 * @property {number} empty_block - (0x40) Indicates an empty block type.
 * @property {number} unreachable - (0x00) An unreachable instruction; traps immediately when executed.
 * @property {number} nop - (0x01) No operation; does nothing.
 * @property {number} end - (0x0b) Marks the end of a block, loop, or function.
 * @property {number} return - (0x0f) Returns zero or more values from a function.
 */
export enum control 
{
    block = 0x02,
    loop = 0x03,
    if = 0x04,
    else = 0x05,

    br = 0x0c,
    br_if = 0x0d,
    br_table = 0x0e,
    call = 0x10,
    call_indirect = 0x11,
    drop = 0x1a,

    empty_block = 0x40,
    unreachable = 0x00,
    nop = 0x01,
    end = 0x0b,
    return = 0x0f,

}
