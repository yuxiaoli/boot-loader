import { loadFiglet, runFiglet } from './figlet';
self.onmessage = async (event: MessageEvent<{id:number; argv?:string[]}>) => {
  const { id, argv } = event.data;
  try {
    if (argv === undefined) { await loadFiglet(); self.postMessage({ id, result: null }); }
    else self.postMessage({ id, result: await runFiglet(argv) });
  } catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Tool failed.' }); }
};
