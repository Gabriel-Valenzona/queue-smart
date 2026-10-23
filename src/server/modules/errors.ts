/** HTTP-facing failures belonging to Gabriel's modules. */
export class ModuleError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ModuleError";
  }
}
