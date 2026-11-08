/** These imports exist in Commander but our reviewed single-command path never uses them. */
export default new Proxy(Object.freeze({}), {
  get(_target, name) {
    // CJS interop probes must not confer filesystem/process capabilities.
    if (name === '__esModule') return false;
    throw new Error(`Node API ${String(name)} is unavailable in this browser tool.`);
  },
});
