
// === The TLSF (Two-Level Segregate Fit) memory allocator ===
// see: http://www.gii.upv.es/tlsf/
// especially: http://www.gii.upv.es/tlsf/files/spe_2008.pdf

import { control } from "../helpers/control.js";
import { func } from "../helpers/func.js";
import { i32 } from "../helpers/i32.js";
import { i64 } from "../helpers/i64.js";
import { local } from "../helpers/local.js";
import { memory, usize } from "../helpers/memory.js";
import { Module } from "../helpers/module.js";
import { mergeUInt8Arrays } from "../helpers/types.js";
import { indexes } from "../helpers/wasmtype.js";
import { u32 } from "../transpilers/wasmtype.js";
import { Allocator } from "./contract.js";

// - `ffs(x)` is equivalent to `ctz(x)` with x != 0
// - `fls(x)` is equivalent to `sizeof(x) * 8 - clz(x) - 1`

// ╒════════════════════ Block layout (32-bit) ════════════════════╕
//    3                   2                   1
//  1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0  bits
// ├─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┼─┼─┤            ┐
// │                          size                             │L│F│ ◄─┐ info   overhead
// ╞>ptr═══════════════════════════════════════════════════════╧═╧═╡   │        ┘
// │                        if free: ◄ prev                        │ ◄─┤ usize
// ├───────────────────────────────────────────────────────────────┤   │
// │                        if free: next ►                        │ ◄─┤
// ├───────────────────────────────────────────────────────────────┤   │
// │                             ...                               │   │ >= 0
// ├───────────────────────────────────────────────────────────────┤   │
// │                        if free: back ▲                        │ ◄─┘
// └───────────────────────────────────────────────────────────────┘ >= MIN SIZE
// F: FREE, L: LEFTFREE

// Block constants. A block must have a minimum size of three pointers so it can hold `prev`,
// `next` and `back` if free.

// ╒═════════════════════ Root layout (32-bit) ════════════════════╕
//    3                   2                   1
//  1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0 9 8 7 6 5 4 3 2 1 0  bits
// ├─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┤          ┐
// │        0        |           flMap                            S│ ◄─────┐
// ╞═══════════════════════════════════════════════════════════════╡       │
// │                           slMap[0] S                          │ ◄─┐   │
// ├───────────────────────────────────────────────────────────────┤   │   │
// │                           slMap[1]                            │ ◄─┤   │
// ├───────────────────────────────────────────────────────────────┤  u2^j │
// │                              ...                              │ ◄─┤   │
// ├───────────────────────────────────────────────────────────────┤   |   │
// │                           slMap[22]                           │ ◄─┘   │
// ╞═══════════════════════════════════════════════════════════════╡     usize
// │                            head[0]                            │ ◄─────┤
// ├───────────────────────────────────────────────────────────────┤       │
// │                              ...                              │ ◄─────┤
// ├───────────────────────────────────────────────────────────────┤       │
// │                           head[367]                           │ ◄─────┤
// ╞═══════════════════════════════════════════════════════════════╡       │
// │                             tail                              │ ◄─────┘
// └───────────────────────────────────────────────────────────────┘   SIZE   ┘
// S: Small blocks map


// const usize = i32;
// // type usize = i32;
// type usize = i32 | i64;
// const usize = i64;
// type usize = i64;

export default function tlsf<TNative extends bigint | u32>(module: Module<TNative>, arch: memory<TNative>, j: number = 3 | 4 | 5 | 6, splitSizeThreshold: number = 32)
{
  const root = arch.memarg(0);
  module.needMemory(1)

  class Block
  {
    public readonly address: usize<TNative>
    public readonly local?: local<usize<TNative>>;

    // constructor(index: indexes.local)
    // constructor(fl: usize<TNative>, sl: i32)
    // constructor(address: usize<TNative>)
    constructor(index: indexes.local | usize<TNative>)
    {
      if (typeof index == 'number')
        this.address = (this.local = new local(index, arch.address)).get();
      else
        // if (!sl)
        this.address = index as usize<TNative>;
      // else
      //   this.address = head_list_address(index as i32, sl);
    }

    public teeAddress(value: usize<TNative>)
    {
      if (typeof this.local)
        return this.local.tee(value);
      else
        throw new Error('not supported tee on non-local defined block');
    }

    size()
    {
      return arch.address.load(blocks, this.address).shr_u(i32.const(2)).shl(i32.const(2))
    }
    setSize(value: usize<TNative>)
    {
      return value.shr_u(i32.const(2)).shl(i32.const(2)).or(this.isFree()).or(this.isLast().shl(i32.const(1))).store(blocks, this.address);
    }


    remove_head()
    {
      return [...arch.address.load(blocks, this.address).and(arch.address.max_u.sub(arch.address.const(1))).store(blocks, this.address),
      ...arch.address.load(blocks, this.address.add(arch.address.const(log2usize * 3))).store(blocks, arch.address.load(blocks, this.address.add(arch.address.const(log2usize * 2))).add(arch.address.const(log2usize * 2))),
      ...arch.address.load(blocks, this.address.add(arch.address.const(log2usize * 2))).store(blocks, arch.address.load(blocks, this.address.add(arch.address.const(log2usize * 3))).add(arch.address.const(log2usize * 3)))
      ]
    }

    split(requestedSize: usize<TNative>, remainingBlock: Block): Uint8Array
    {
      return mergeUInt8Arrays(
        remainingBlock.local.set(this.address.add(requestedSize.add(arch.address.const(log2usize * 2)))),
        remainingBlock.setSize(this.size().sub(requestedSize).add(arch.address.const(log2usize * 2))),
        this.setSize(requestedSize.add(arch.address.const(log2usize * 2)))
      )
    }

    setNextFree(block: Block)
    {
      if (block == null)
        return arch.address.const(0).store(blocks, this.address.add(arch.address.const(log2usize * 2)));
      return block.address.store(blocks, this.address.add(arch.address.const(log2usize * 2)));
    }

    setPrevFree(block: Block)
    {
      if (block == null)
        return arch.address.const(0).store(blocks, this.address.add(arch.address.const(log2usize * 3)));
      return block.address.store(blocks, this.address.add(arch.address.const(log2usize * 3)));
    }

    getNextFree()
    {
      return new Block(this.getNextFreeAddress());
    }

    getNextFreeAddress()
    {
      return arch.address.load(blocks, this.address.add(arch.address.const(log2usize * 2)));
    }

    getPrevFree()
    {
      return new Block(this.getPrevFreeAddress());
    }
    getPrevFreeAddress()
    {
      return arch.address.load(blocks, this.address.add(arch.address.const(log2usize * 3)));
    }

    isFree()
    {
      const result = arch.address.load(blocks, this.address).and(arch.address.const(1))
      if (i32guard(result))
        return result;
      return (result as i64).wrap();
    }

    static maxSize = arch.address.max_u.shr_u(i32.const(2)).shl(i32.const(2));

    setFree()
    {
      return arch.address.load(blocks, this.address).or(arch.address.const(1)).store(blocks, this.address); //set free flag on the block
    }

    setBusy()
    {
      return arch.address.load(blocks, this.address).and(arch.address.max_u.shr_u(i32.const(1)).shl(i32.const(1))).store(blocks, this.address); //remove free flag on the block
    }

    isLast()
    {
      const result = arch.address.load(blocks, this.address).and(arch.address.const(2));
      if (i32guard(result))
        return result;
      return (result as i64).wrap();
    }

    setLast(value: i32)
    {
      return arch.address.load(blocks, this.address).and(arch.address.max_u.sub(arch.address.const(2)).or(value.shl(i32.const(1)))).store(blocks, this.address); //set last flag on the block
    }

    isPrevPhysicalFree()
    {
      return new Block(this.prevPhysicalBlock()).isFree();
    }
    prevPhysicalBlock()
    {
      return this.address.add(arch.address.const(log2usize))
    }

    isNextPhysicalFree()
    {
      return new Block(this.nextPhysicalBlock()).isFree();
    }
    nextPhysicalBlock()
    {
      return this.address.add(this.size())
    }

    remove(fl: i32, sl: i32)
    {
      return [
        ...this.setBusy(),
        ...control.ifelse(undefined, toi32(this.getNextFreeAddress()),
          this.getNextFree().address.store(blocks, head_list_address(fl, sl)),
          mergeUInt8Arrays(
            storeSl(sl, loadSl(sl).and(arch.address.const(1).shl(sl).xor(arch.address.max_u))),
            control.if(undefined, loadSl(sl).eqz(),
              fl_bitmap.and(i32.const(1).shl(fl).xor(i32.max_u)).store(root, arch.address.const(0))
            ).toOpCodes()
          )
        ).toOpCodes(),
      ]
    }

    insert(fl: i32, sl: i32)
    {
      return [
        ...control.if(undefined, toi32(arch.address.load(blocks, head_list_address(fl, sl))),
          mergeUInt8Arrays(
            this.setNextFree(new Block(head_list_address(fl, sl))),
            this.getNextFree().setPrevFree(this)
          )
        ).toOpCodes(),
        ...this.address.store(blocks, head_list_address(fl, sl)),
        ...this.setFree(),
        ...fl_bitmap.or(i32.const(1).shl(fl)).store(root, arch.address.const(0)),
        ...storeSl(fl, loadSl(fl).or(arch.address.const(1).shl(sl)))
      ]
    }


    merge(next: Block)
    {
      return [
        ...this.setSize(this.size().add(next.size())),
        ...this.setLast(next.isLast()),
      ]
    }
  }

  splitSizeThreshold = Math.max(splitSizeThreshold, arch.address.size / 2);
  j = Math.min(j, Math.log2(arch.address.size));

  function loadSl(offset: usize<TNative>): usize<TNative>
  {
    switch (j)
    {
      case 3:
        return arch.address.load8_u(sl_bitmap, offset);
      case 4:
        return arch.address.load16_u(sl_bitmap, offset);
      case 5:
        if (arch.address === offset.type)
          return arch.address.load(root, offset);
        return i64.load32_u(sl_bitmap, offset as any) as usize<TNative>;
      case 6:
        return arch.address.load(sl_bitmap, offset);
    }
  }

  function storeSl(offset: usize<TNative> | i32, value: usize<TNative>): Uint8Array
  {
    if (arch.address !== offset.type)
      offset = (offset as i32).extend_u() as usize<TNative>;
    switch (j)
    {
      case 3:
        return value.store8(root, offset as usize<TNative>);
      case 4:
        return value.store16(root, offset as usize<TNative>)
      case 5:
        if (arch.address === offset.type)
          return value.store(root, offset as usize<TNative>)
        return (value as i64).store32(root, offset as usize<TNative>);
      case 6:
        return value.store(root, offset as usize<TNative>)
    }
  }

  function ffs(v: usize<TNative>)
  {
    return v.ctz();
  }

  module.export('ffs',
    module.addFunc((function ()
    {
      const l = new local(0, i32);
      return func.new([l], [i32], [], ffs(l.get()).toOpCodes())
    })()).func
  );

  function fls(v: usize<TNative>)
  {
    return i32.const(arch.address.size).sub(v.clz()).sub(i32.const(1));
  }

  module.export('fls',
    module.addFunc((function ()
    {
      const l = new local(0, i32);
      return func.new([l], [i32], [], fls(l.get()).toOpCodes())
    })()).func
  );

  const split_size_threshold = i32.const(splitSizeThreshold);
  const log2splitSizeThreshold = Math.log2(splitSizeThreshold);
  const log2_split_size_threshold = i32.const(log2splitSizeThreshold)
  const jpow = Math.pow(2, j);

  const log2usize = Math.log2(arch.address.size);
  const head = arch.memarg(Number(root.offset) + (arch.address.size - log2splitSizeThreshold) * jpow / 8 + arch.address.size / 8);
  const blocks = arch.memarg(Number(head.offset) + (arch.address.size - log2splitSizeThreshold) * jpow * arch.address.size / 8);
  console.log(head);
  console.log(blocks);
  const J = i32.const(j);
  const Jsize = arch.address.const(j);
  const Jpow = i32.const(jpow);
  const fl_bitmap = arch.address.load(root, arch.address.const(0));
  const sl_bitmap = arch.memarg(Number(root.offset) + 1, j - 3);
  // const sl_bitmap = (index: number) => loadJLength(arch.address.const(index + 1));

  /** returns sl then fl */
  const mapping_insert = (function ()
  {
    const r = new local(0, arch.address);
    const fl = new local(1, arch.address);
    return func.new([r], [i32, i32], [fl],
      mergeUInt8Arrays(
        r.get().shr_u(fls(r.get()).teeLocal(fl.index).sub(J)).sub(Jpow).toOpCodes(),
        fl.get().toOpCodes()
      ))
  })()

  module.addFunc(mapping_insert)
  module.export('mapping_insert', mapping_insert);

  /** returns sl then fl then r */
  const mapping_search = (function ()
  {
    const r = new local(0, arch.address);
    const fl = new local(1, i32);
    return func.new([r], [r.type, i32, i32], [fl],
      mergeUInt8Arrays(
        r.set(r.get().add(arch.address.const(1).shl(fls(r.get()).sub(J)).sub(arch.address.const(1)))),
        r.get().shr_u(fls(r.get()).teeLocal(fl.index).sub(J)).sub(Jpow).toOpCodes(),
        fl.get().toOpCodes(),
        r.get().toOpCodes()
      ))
  })()

  module.addFunc(mapping_search);
  module.export('mapping_search', mapping_search);

  function toi32(value: usize<TNative>)
  {
    if (i32guard(value))
      return value;
    return (value as i64).wrap();
  }

  function i32guard(v: usize<TNative>): v is i32
  {
    return v.type === i32;
  }

  /** returns address */
  const find_suitable_block = (function ()
  {
    const fl = new local(1, i32);
    const sl = new local(0, i32);
    const bitmap_tmp = new local(2, arch.address);

    return func.new([sl, fl], [i32], [bitmap_tmp],
      mergeUInt8Arrays(
        control.ifelse(
          undefined,
          bitmap_tmp.tee(arch.address.load(sl_bitmap, fl.get()).and(arch.address.max_u.shl(toi32(sl.get())))).eqz(),
          sl.set(ffs(arch.address.load(sl_bitmap, fl.tee(
            ffs(
              bitmap_tmp.tee(
                arch.address.load(root, arch.address.const(0)).and(arch.address.max_u.shl(fl.get().add(i32.const(1)))))
            )
          )))),
          sl.set(ffs(bitmap_tmp.get()))
        ).toOpCodes(),
        head_list(fl.get(), sl.get()).toOpCodes(),
        [control.transpiler.return]
      ));
  })();

  module.export('fl_bitmap', module.addFunc((function ()
  {
    return func.new([], [i32], [], arch.address.load(root, arch.address.const(0)).toOpCodes());
  })()).func);

  module.export('sl_bitmap', module.addFunc((function ()
  {
    const l = new local(0, i32);
    return func.new([l], [i32], [], arch.address.load(sl_bitmap, l.get()).toOpCodes());
  })()).func);


  module.addFunc(find_suitable_block);
  module.export('find_suitable_block', find_suitable_block);

  function head_list(fl: i32, sl: i32)
  {
    return arch.address.load(head, head_list_address(fl, sl));
  };

  function head_list_address(fl: i32, sl: i32): usize<TNative>
  {
    return fl.sub(log2_split_size_threshold).shl(J).add(sl).shl(i32.const(Math.log2(arch.address.size / 8) + 1));
  };

  /** returns address */
  const malloc = (function ()
  {
    const r = new local(0, arch.address);
    const freeBlock = new Block(1);
    const fl = new local(2, i32);
    const sl = new local(3, i32);
    const remaining_block = new Block(4);

    return func.new([r], [i32], [freeBlock.local, fl, sl, remaining_block.local],
      mergeUInt8Arrays(
        module.call(mapping_search, [r.get()], [
          (slResult) => sl.set(slResult),
          (flResult) => fl.set(flResult),
          (rResult) => r.set(rResult),
        ]),
        module.call(find_suitable_block, [r.get(), fl.get(), sl.get()], [
          (fb) => control.if(undefined, freeBlock.local.tee(fb).eqz(), mergeUInt8Arrays(i32.const(0).toOpCodes(), [control.transpiler.return])).toOpCodes()]),
        freeBlock.remove_head(),
        control.if(undefined, freeBlock.size().sub(r.get()).gt_u(split_size_threshold),
          mergeUInt8Arrays(freeBlock.split(r.get(), remaining_block),
            module.call(mapping_insert, [remaining_block.size()], [slResult => sl.set(slResult), flResult => fl.set(flResult)]),
            remaining_block.insert(fl.get(), sl.get())
          )
        ).toOpCodes(),
        freeBlock.address.toOpCodes(),
        [control.transpiler.return]
      )
    );
  })();

  module.addFunc(malloc);

  const merge_prev = (function ()
  {
    const block = new Block(0);
    const prev_block = new Block(1);
    const fl = new local(2, i32);
    const sl = new local(3, i32);

    return func.new([block.local], [arch.address], [prev_block.local, fl, sl],
      mergeUInt8Arrays(
        control.if(undefined, block.isPrevPhysicalFree(),
          mergeUInt8Arrays(
            module.call(mapping_insert, [prev_block.teeAddress(block.prevPhysicalBlock())], [
              (slResult) => sl.set(slResult),
              (flResult) => fl.set(flResult),
            ]),
            prev_block.remove_head(),
            prev_block.remove(fl.get(), sl.get()),
            prev_block.merge(block)
          )).toOpCodes(),
        prev_block.address.toOpCodes()
      )
    );

  })();

  module.addFunc(merge_prev);

  const merge_next = (function ()
  {
    const block = new Block(0);
    const next_block = new Block(1);
    const fl = new local(2, i32);
    const sl = new local(3, i32);

    return func.new([block.local], [arch.address], [next_block.local, fl, sl],
      mergeUInt8Arrays(
        control.if(undefined, block.isNextPhysicalFree(),
          mergeUInt8Arrays(
            module.call(mapping_insert, [next_block.teeAddress(block.nextPhysicalBlock())], [
              (slResult) => sl.set(slResult),
              (flResult) => fl.set(flResult),
            ]),
            next_block.remove(fl.get(), sl.get()),
            block.merge(next_block)
          )).toOpCodes(),
        next_block.address.toOpCodes()
      )
    )
  })();

  module.addFunc(merge_next);

  const free = (function ()
  {
    const block = new Block(0);
    const merged_block = new Block(1);
    const fl = new local(2, i32);
    const sl = new local(3, i32);

    return func.new([block.local], [], [merged_block.local, fl, sl],
      module.call(merge_prev, [block.address], [(mergedBlock: usize<TNative>) =>
        module.call(merge_next, [mergedBlock], [mergedBlock =>
          mergeUInt8Arrays(
            merged_block.local.set(mergedBlock),
            module.call(mapping_insert, [merged_block.size()], [slResult => sl.set(slResult), flResult => fl.set(flResult)]),
            merged_block.insert(fl.get(), sl.get())
          )
        ])
      ])
    );

  })();

  module.addFunc(free);

  const init = (function ()
  {
    const block = new Block(0);
    const fl = new local(1, i32);
    const sl = new local(2, i32);
    console.log(head.offset as number + ((arch.address.size - log2splitSizeThreshold) * jpow) * log2usize);
    return func.new([], [], [block.local, fl, sl],
      mergeUInt8Arrays(
        block.local.set(arch.address.const(0)),
        block.setSize(new arch.address(memory.transpiler.size).mul(arch.address.const(65536)).sub(arch.address.const(blocks.offset))),
        module.call(mapping_insert, [block.size()], [slResult => sl.set(slResult), flResult => fl.set(flResult)]),
        block.insert(fl.get(), sl.get())
      )
    );

  })();

  module.addFunc(init);

  return { mapping_insert, mapping_search, find_suitable_block, merge_prev, merge_next, free, init };
}

export class Tlsf<TNative extends bigint | number> implements Allocator<TNative>
{
  public tlsf: ReturnType<typeof tlsf>;

  constructor(private module: Module<TNative>, private arch: memory<TNative>, private j: number = 3 | 4 | 5 | 6, private splitSizeThreshold: number = 32)
  {
  }

  init()
  {
    this.tlsf = tlsf(this.module, this.arch, this.j, this.splitSizeThreshold);

  }
  start(): Uint8Array
  {
    // return new Uint8Array();
    return this.module.call(this.tlsf.init, [], []);
  }

  malloc(size: TNative): usize<TNative>
  {
    throw new Error('not implemented')
    // return new this.arch.address(this.module.call(this.tlsf.malloc, [this.arch.address.const(size)], []));
  }

}