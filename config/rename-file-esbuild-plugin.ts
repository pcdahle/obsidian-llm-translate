import type { Plugin, PluginBuild } from "esbuild";
import fs from "node:fs/promises";
import path from "path";

export class RenameFilePlugin implements Plugin {
  readonly name = "RenameFilePlugin";

  #fromName: string;
  #toName: string;

  constructor(params: { fromName: string; toName: string }) {
    this.#fromName = params.fromName;
    this.#toName = params.toName;

    this.setup = this.setup.bind(this);
  }

  setup(build: PluginBuild) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      const from = path.join(this.#fromName);
      const to = path.join(this.#toName);

      await fs.rm(to, { force: true });
      await fs.rename(from, to);
    });
  }
}
