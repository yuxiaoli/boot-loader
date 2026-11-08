/** Explicit compiled operations, never executable expressions from JSON. */
export const nativeHandlers = Object.freeze({
  time: () => ({lines:[new Date().toLocaleString(undefined,{timeZoneName:'short'}),`Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`]}),
  // The terminal controller performs window.location.reload only after dispatch.
  reload: () => ({lines:[] as string[],reload:true}),
});
export type NativeHandlerId = keyof typeof nativeHandlers;
export function isNativeHandlerId(value:unknown):value is NativeHandlerId {
  return typeof value==='string' && Object.hasOwn(nativeHandlers,value);
}
