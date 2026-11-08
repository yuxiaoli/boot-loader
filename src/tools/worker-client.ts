export type ToolOutput = {stdout:string; stderr:string; exitCode:number};
export interface ToolRuntime { load(signal:AbortSignal):Promise<void>; run(argv:string[],signal:AbortSignal):Promise<ToolOutput>; dispose():void }
export class FigletWorker implements ToolRuntime {
  private worker?: Worker;
  private sequence = 0;
  private pending = new Map<number,{resolve:(value:any)=>void;reject:(reason:Error)=>void;cleanup:()=>void}>();
  private request(argv:string[]|undefined, signal:AbortSignal):Promise<any> {
    if(signal.aborted) return Promise.reject(Error('Command cancelled.'));
    if(!this.worker) {
      this.worker = new Worker(new URL('./tool-worker.ts',import.meta.url),{type:'module'});
      this.worker.onmessage = ({data}) => {
        const request=this.pending.get(data.id); if(!request)return;
        this.pending.delete(data.id); request.cleanup();
        if(data.error)request.reject(Error(data.error));else request.resolve(data.result);
      };
      this.worker.onerror = () => this.dispose();
    }
    return new Promise((resolve,reject)=>{
      const id=++this.sequence;
      const cancel=()=>this.dispose();
      signal.addEventListener('abort',cancel,{once:true});
      this.pending.set(id,{resolve,reject,cleanup:()=>signal.removeEventListener('abort',cancel)});
      this.worker!.postMessage({id,argv});
    });
  }
  async load(signal:AbortSignal):Promise<void>{await this.request(undefined,signal);}
  run(argv:string[],signal:AbortSignal):Promise<ToolOutput>{return this.request(argv,signal);}
  dispose():void {
    this.worker?.terminate(); this.worker=undefined;
    for(const item of this.pending.values()){item.cleanup();item.reject(Error('Tool stopped or unavailable.'));}
    this.pending.clear();
  }
}
