/** No page globals, environment, executable, stdio or actual process access.
 * Named exports also support Commander's CommonJS require() namespace shape. */
const denied = () => { throw new Error('Node process operations are unavailable in this browser tool.'); };
export const env = Object.freeze({});
export const argv = Object.freeze([]);
export const execArgv = Object.freeze([]);
export const versions = Object.freeze({});
export const exitCode = 0;
export const stdout = Object.freeze({ isTTY: false, write: denied });
export const stderr = Object.freeze({ isTTY: false, write: denied });
export const exit = denied;
export const on = denied;
export default Object.freeze({ env, argv, execArgv, versions, exitCode, stdout, stderr, exit, on });
