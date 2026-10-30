// @vitest-environment jsdom
import {afterEach,expect,test,vi} from 'vitest';
import {mountCatalogControls} from '../src/terminal-catalog-controls';
const roots:HTMLElement[]=[];
const ansi=Array(16).fill('#112233');
function fixture(count=1363){return {schema_version:'2.0',kind:'terminal',status:'complete',sources:{sample:{source:{id:'sample',url:'https://example.invalid/'}}},themes:Array.from({length:count},(_,i)=>({id:`sample/${i}`,name:`Theme ${i}`,source_id:'sample',source_theme_id:String(i),mode:'dark',palette:{background:'#111111',foreground:'#EEEEEE',accent:'#FFAA00',ansi},original:{author:'<script>unsafe</script>'},license:{expression:'Synthetic'}}))};}
function setup(load=async()=>({data:fixture(),revision:'one'})) {
 const root=document.createElement('section');document.body.append(root);roots.push(root);
 const apply=vi.fn();const controller=mountCatalogControls(root,load,apply);
 const find=(label:string)=>root.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
 const button=(label:string)=>Array.from(root.querySelectorAll('button')).find(b=>b.textContent===label)!;
 return {root,apply,controller,find,button,status:()=>root.querySelector('[role="status"]')!.textContent};
}
async function settled(){await new Promise(resolve=>setTimeout(resolve,0));}
function change(el:HTMLInputElement,value:string,event='input'){el.value=value;el.dispatchEvent(new Event(event));}
afterEach(()=>{roots.splice(0).forEach(root=>root.remove());});
test('all records searchable, paginated and selectable; provenance is plain text',async()=>{
 const ui=setup();await settled();expect(ui.status()).toContain('1363 compatible');
 expect(ui.find('Catalogue theme').children).toHaveLength(51);
 ui.button('Next').click();expect(ui.status()).toContain('51–100');ui.button('Previous').click();expect(ui.status()).toContain('1–50');
 change(ui.find('Search terminal themes'),'1362');expect(ui.status()).toContain('1–1 of 1');
 change(ui.find('Catalogue theme'),'sample/1362','change');expect(ui.apply).toHaveBeenCalledWith(expect.objectContaining({background:'#111111'}));
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('sample/1362');
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('<script>unsafe</script>');expect(ui.root.querySelector('script')).toBeNull();
 change(ui.find('Search terminal themes'),'no matches');expect(ui.find('Catalogue theme').disabled).toBe(true);expect(ui.status()).toContain('0–0 of 0');
 // Filtering never mutates the active palette.
 expect(ui.apply).toHaveBeenCalledTimes(1);
});
test('refresh failure keeps selected theme and visible last-good status; fallback clears it',async()=>{
 let fail=false;const ui=setup(async()=>{if(fail)throw Error('offline');return {data:fixture(),revision:'one'}});await settled();
 change(ui.find('Catalogue theme'),'sample/0','change');fail=true;ui.button('Refresh catalogue').click();await settled();
 expect(ui.status()).toContain('retaining last-good');expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('sample/0');
 ui.button('Use built-in theme').click();expect(ui.apply).toHaveBeenLastCalledWith(null);
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('Using the built-in');
});
test('removed selection falls back; native preset switching clears catalogue attribution',async()=>{
 let missing=false;const ui=setup(async()=>{const f=fixture();if(missing)f.themes.shift();return {data:f,revision:missing?'two':'one'}});await settled();
 change(ui.find('Catalogue theme'),'sample/0','change');missing=true;ui.button('Refresh catalogue').click();await settled();expect(ui.apply).toHaveBeenLastCalledWith(null);
 change(ui.find('Catalogue theme'),'sample/1','change');ui.controller.useBuiltin();expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('Using the built-in');
});
test('dispose prevents pending load from writing/applying after terminal cleanup',async()=>{
 let resolve!:(v:any)=>void;const ui=setup(()=>new Promise(r=>{resolve=r}));ui.controller.dispose();resolve({data:fixture(),revision:'later'});await settled();
 expect(ui.root.isConnected).toBe(false);expect(ui.apply).not.toHaveBeenCalled();
});
test('a failed first load keeps built-in options available and retry can recover',async()=>{
 let fail=true;const ui=setup(async()=>{if(fail)throw Error('offline');return {data:fixture(),revision:'recovered'}});await settled();expect(ui.status()).toContain('Built-in themes remain available');
 fail=false;ui.button('Refresh catalogue').click();await settled();expect(ui.status()).toContain('1363 compatible');
});
test('controls use native labels and never change palette during search or page navigation',async()=>{
 const ui=setup();await settled();expect(ui.find('Search terminal themes').type).toBe('search');
 expect(ui.find('Catalogue theme').tagName).toBe('SELECT');expect(ui.root.querySelector('[aria-live="polite"]')).not.toBeNull();
 ui.button('Next').click();change(ui.find('Search terminal themes'),'dark');expect(ui.apply).not.toHaveBeenCalled();
});
