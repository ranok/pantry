#!/usr/bin/env -S tea -E

// returns all pantry entries as `[{ name, path }]`

/*---
args:
  - deno
  - run
  - --allow-env
  - --allow-read
  - --import-map={{ srcroot }}/import-map.json
---*/

import { Path } from "types"
import useFlags from "hooks/useFlags.ts"
import useCellar from "hooks/useCellar.ts"

const prefix = new Path(`${useCellar().prefix}/tea.xyz/var/pantry/projects`)

interface Entry {
  project: string
  path: Path
}


//------------------------------------------------------------------------- funcs
export async function* ls(): AsyncGenerator<Entry> {
  for await (const path of _ls_pantry(prefix)) {
    yield {
      project: path.parent().relative({ to: prefix }),
      path
    }
  }
}

async function* _ls_pantry(dir: Path): AsyncGenerator<Path> {
  if (!dir.isDirectory()) throw new Error()

  for await (const [path, { name, isDirectory }] of dir.ls()) {
    if (isDirectory) {
      for await (const x of _ls_pantry(path)) {
        yield x
      }
    } else if (name === "package.yml") {
      yield path
    }
  }
}

//-------------------------------------------------------------------------- main
if (import.meta.main) {
  const flags = useFlags()

  const rv: Entry[] = []
  for await (const item of ls()) {
    rv.push(item)
  }

  if (Deno.env.get("GITHUB_ACTIONS")) {
    const projects = rv.map(x => x.project).join(":")
    console.log(`::set-output name=projects::${projects}`)
  } else if (flags.json) {
    const obj = rv.map(({ path, project }) => ({ path: path.string, project }))
    const out = JSON.stringify(obj, null, 2)
    console.log(out)
  } else {
    console.log(rv.map(x => x.project).join("\n"))
  }
}
