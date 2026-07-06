import fs from "node:fs/promises";
import path from "node:path";

export class RenameFilePlugin {
  name = "RenameFilePlugin";

  #fromName;
  #toName;

  constructor(params) {
    this.#fromName = params.fromName;
    this.#toName = params.toName;

    this.setup = this.setup.bind(this);
  }

  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;

      const from = path.join(this.#fromName);
      const to = path.join(this.#toName);

      await fs.rm(to, { force: true });
      await fs.rename(from, to);
    });
  }
}
