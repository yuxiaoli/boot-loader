import { afterEach,expect,test,vi } from 'vitest';
import { FigletWorker } from '../src/tools/worker-client';
afterEach(()=>vi.unstubAllGlobals());
test('worker cancellation terminates rendering and rejects requests; next request starts fresh',async()=>{
  const workers:MockWorker[]=[];
  class MockWorker {
    onmessage?:({data}:any)=>void;onerror?:()=>void;terminate=vi.fn();postMessage=vi.fn();
    constructor(){workers.push(this);}
  }
  vi.stubGlobal('Worker',MockWorker);
  const runtime=new FigletWorker(),abort=new AbortController();
  const pending=runtime.run(['hello'],abort.signal);
  abort.abort();await expect(pending).rejects.toThrow('stopped');expect(workers[0].terminate).toHaveBeenCalledOnce();
  const load=runtime.load(new AbortController().signal);
  expect(workers).toHaveLength(2);
  const {id}=workers[1].postMessage.mock.calls[0][0];workers[1].onmessage!({data:{id,result:null}});
  await expect(load).resolves.toBeUndefined();runtime.dispose();
});
