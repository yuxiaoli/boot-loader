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
 const ui=setup();await settled();expect(ui.status()).toContain('1363 compatible catalogue');
 expect(ui.root.querySelectorAll('[role=option]')).toHaveLength(50);
 ui.button('Next').click();expect(ui.status()).toContain('51–100');ui.button('Previous').click();expect(ui.status()).toContain('1–50');
 change(ui.find('Search terminal themes'),'1362');expect(ui.status()).toContain('1–1 of 1');
 ui.controller.select('sample/1362');expect(ui.apply).toHaveBeenCalledWith(expect.objectContaining({background:'#111111'}));
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('sample/1362');
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('<script>unsafe</script>');expect(ui.root.querySelector('script')).toBeNull();
 change(ui.find('Search terminal themes'),'no matches');expect(ui.root.querySelectorAll('[role=option]')).toHaveLength(0);expect(ui.status()).toContain('0–0 of 0');
 // Filtering never mutates the active palette.
 expect(ui.apply).toHaveBeenCalledTimes(1);
});
test('refresh failure keeps selected theme and visible last-good status; fallback clears it',async()=>{
 let fail=false;const ui=setup(async()=>{if(fail)throw Error('offline');return {data:fixture(),revision:'one'}});await settled();
 ui.controller.select('sample/0');fail=true;await ui.controller.refresh();
 expect(ui.status()).toContain('Retaining last-good');expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('sample/0');
 ui.controller.select('green');expect(ui.apply).toHaveBeenLastCalledWith(expect.objectContaining({foreground:'#11FF00'}));
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('Using the built-in');
});
test('removed selection falls back; native preset switching clears catalogue attribution',async()=>{
 let missing=false;const ui=setup(async()=>{const f=fixture();if(missing)f.themes.shift();return {data:f,revision:missing?'two':'one'}});await settled();
 ui.controller.select('sample/0');missing=true;await ui.controller.refresh();expect(ui.apply).toHaveBeenLastCalledWith(expect.objectContaining({foreground:'#11FF00'}));
 ui.controller.select('sample/1');ui.controller.useBuiltin();expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('Using the built-in');
});
test('dispose prevents pending load from writing/applying after terminal cleanup',async()=>{
 let resolve!:(v:any)=>void;const ui=setup(()=>new Promise(r=>{resolve=r}));ui.controller.dispose();resolve({data:fixture(),revision:'later'});await settled();
 expect(ui.root.isConnected).toBe(false);expect(ui.apply).not.toHaveBeenCalled();
});
test('a failed first load keeps built-in options available and retry can recover',async()=>{
 let fail=true;const ui=setup(async()=>{if(fail)throw Error('offline');return {data:fixture(),revision:'recovered'}});await settled();expect(ui.status()).toContain('Built-in themes remain available');
 fail=false;await ui.controller.refresh();expect(ui.status()).toContain('1363 compatible catalogue');
});
test('controls use native labels and never change palette during search or page navigation',async()=>{
 const ui=setup();await settled();expect(ui.find('Search terminal themes').type).toBe('search');
 expect(ui.find('Search terminal themes').getAttribute('role')).toBe('combobox');expect(ui.root.querySelector('[aria-live="polite"]')).not.toBeNull();
 ui.button('Next').click();change(ui.find('Search terminal themes'),'dark');expect(ui.apply).not.toHaveBeenCalled();
});

test('combobox keyboard selects only on Enter and Escape cancels without applying',async()=>{
 const ui=setup();await settled();const input=ui.find('Search terminal themes');
 change(input,'1362');input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 expect(input.getAttribute('aria-expanded')).toBe('true');
 expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toContain('Theme 1362');
 expect(ui.apply).not.toHaveBeenCalled();
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 expect(ui.apply).toHaveBeenCalledTimes(1);expect(input.getAttribute('aria-expanded')).toBe('false');
 change(input,'Theme 0');input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 expect(ui.apply).toHaveBeenCalledTimes(1);expect(input.getAttribute('aria-expanded')).toBe('false');
});
test('built-ins remain selectable while loading; controller rejects unknown identities',async()=>{
 const ui=setup(()=>new Promise(()=>{}));expect(ui.status()).toContain('Loading');
 expect(ui.controller.select('amber')).toBe(true);expect(ui.apply).toHaveBeenCalledTimes(1);
 expect(ui.controller.select('__proto__')).toBe(false);expect(ui.apply).toHaveBeenCalledTimes(1);
});

test('ArrowUp starts at the last visible result; selection synchronizes command choices',async()=>{
 const root=document.createElement('section');document.body.append(root);roots.push(root);
 const changed=vi.fn(),apply=vi.fn();
 const controller=mountCatalogControls(root,async()=>({data:fixture(1),revision:'one'}),apply,changed);
 await settled();expect(changed).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({id:'sample/0',name:'Theme 0'})]));
 const input=root.querySelector('input')!;input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
 expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toContain('Theme 0');
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 expect(apply).toHaveBeenCalledWith(expect.objectContaining({background:'#111111'}));
 expect(controller.choices()).toHaveLength(4);
});

test('keyboard reaches all result pages and Tab retains access to pagination',async()=>{
 const ui=setup();await settled();const input=ui.find('Search terminal themes');input.focus();
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'PageDown',bubbles:true}));
 expect(ui.status()).toContain('51–100');
 expect(document.getElementById(input.getAttribute('aria-activedescendant')!)?.textContent).toContain('Theme 47');
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}));
 ui.button('Next').focus();expect(ui.button('Next').hidden).toBe(false);
 ui.button('Next').click();expect(ui.status()).toContain('101–150');
 input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'PageDown',bubbles:true}));
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('sample/147');
});
test('catalogue identity collisions are rejected rather than applying a different palette',async()=>{
 const f=fixture(1);f.themes[0].id='green';const ui=setup(async()=>({data:f,revision:'collision'}));await settled();
 expect(ui.status()).toContain('identity conflicts');expect(ui.controller.choices()).toHaveLength(3);
 ui.controller.select('green');expect(ui.apply).toHaveBeenLastCalledWith(expect.objectContaining({background:'#000000'}));
});

test('unsafe or untypeable IDs are excluded before choices and completion are exposed',async()=>{
 const f=fixture(3);f.themes[0].id='sample/with space';f.themes[1].id='sample/\x1b[2J';
 const ui=setup(async()=>({data:f,revision:'safe-ids'}));await settled();
 expect(ui.controller.choices().map(t=>t.id)).toEqual(['green','amber','white','sample/2']);
 expect(ui.status()).toContain('2 excluded');expect(ui.controller.select('sample/with space')).toBe(false);
 expect(ui.controller.select('sample/\x1b[2J')).toBe(false);expect(ui.apply).not.toHaveBeenCalled();
});

test('an explicitly empty catalogue is a valid empty state with built-ins, not an outage',async()=>{
 const ui=setup(async()=>({data:fixture(0),revision:'empty'}));await settled();
 expect(ui.status()).toContain('0 compatible catalogue themes');expect(ui.status()).not.toContain('unavailable');
 expect(ui.controller.choices()).toHaveLength(3);expect(ui.controller.select('white')).toBe(true);
});

test('trailing LF and CRLF identities never reach the terminal completion choices',async()=>{
 const f=fixture(3);f.themes[0].id+='\n';f.themes[1].id+='\r\n';
 const ui=setup(async()=>({data:f,revision:'exact-ids'}));await settled();
 expect(ui.controller.choices().map(t=>t.id)).toEqual(['green','amber','white','sample/2']);
});
test('compact control omits auxiliary refresh and built-in buttons', async()=>{
 const ui=setup();await settled();
 expect(ui.root.textContent).not.toContain('Refresh catalogue');
 expect(ui.root.textContent).not.toContain('Use built-in theme');
});
test('dropdown stays within a narrow viewport when its control is near the edge',async()=>{
 const ui=setup();await settled();
 vi.spyOn(ui.root,'getBoundingClientRect').mockReturnValue({right:160,bottom:90} as DOMRect);
 vi.stubGlobal('innerWidth',320);
 ui.find('Search terminal themes').focus();
 const panel=ui.root.querySelector('.terminal-catalog-panel') as HTMLElement;
 expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(12);
 expect(parseFloat(panel.style.left)+parseFloat(panel.style.width)).toBeLessThanOrEqual(308);
 vi.unstubAllGlobals();
});
test('dropdown remains vertically reachable near the bottom of the viewport',async()=>{
 const ui=setup();await settled();
 vi.spyOn(ui.root,'getBoundingClientRect').mockReturnValue({right:200,bottom:590} as DOMRect);
 vi.stubGlobal('innerHeight',600);ui.find('Search terminal themes').focus();
 const panel=ui.root.querySelector('.terminal-catalog-panel') as HTMLElement;
 expect(parseFloat(panel.style.top)+parseFloat(panel.style.maxHeight)).toBeLessThanOrEqual(588);
 vi.unstubAllGlobals();
});
test('refresh returns whether the catalogue was successfully updated',async()=>{
 let fail=false;const ui=setup(async()=>{if(fail)throw Error('offline');return {data:fixture(1),revision:'one'}});await settled();
 expect(await ui.controller.refresh()).toBe(true);
 fail=true;expect(await ui.controller.refresh()).toBe(false);
});
test('refresh reports null if disposed while loading',async()=>{
 let resolve!:(v:any)=>void;let pending=false;
 const ui=setup(()=>pending?new Promise(r=>{resolve=r}):Promise.resolve({data:fixture(1),revision:'one'}));await settled();
 pending=true;const request=ui.controller.refresh();ui.controller.dispose();resolve({data:fixture(1),revision:'two'});
 expect(await request).toBe(null);expect(await ui.controller.refresh()).toBe(null);
});
test('a stale refresh cannot clear the newer request loading state',async()=>{
 const requests:((v:any)=>void)[]=[];let initial=true;
 const ui=setup(()=>initial?Promise.resolve({data:fixture(1),revision:'one'}):new Promise(r=>requests.push(r)));await settled();initial=false;
 const old=ui.controller.refresh(),current=ui.controller.refresh();
 requests[0]({data:fixture(1),revision:'old'});expect(await old).toBe(null);expect(ui.status()).toContain('Loading catalogue');
 requests[1]({data:fixture(1),revision:'new'});expect(await current).toBe(true);expect(ui.status()).not.toContain('Loading catalogue');
});
test('click reopens the combobox after Escape or selection while focus stays in the input',async()=>{
 const ui=setup();await settled();const input=ui.find('Search terminal themes');input.focus();
 input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));expect(input.getAttribute('aria-expanded')).toBe('false');
 input.click();expect(input.getAttribute('aria-expanded')).toBe('true');
 ui.controller.select('green');expect(input.getAttribute('aria-expanded')).toBe('false');
 input.click();expect(input.getAttribute('aria-expanded')).toBe('true');
});
test('collapsed combobox exposes the selected theme in an accessible description',async()=>{
 const ui=setup();await settled();ui.controller.select('sample/0');
 const input=ui.find('Search terminal themes');expect(input.getAttribute('aria-expanded')).toBe('false');
 const ids=input.getAttribute('aria-describedby')!.split(' ');
 const descriptions=ids.map(id=>document.getElementById(id)).filter((el):el is HTMLElement=>!!el && !el.closest('[hidden]'));
 expect(descriptions.map(el=>el.textContent).join(' ')).toContain('Theme 0');
});
test('refresh falls back if a theme selected during loading disappears from the new catalogue',async()=>{
 let resolve!:(v:any)=>void;let pending=false;
 const ui=setup(()=>pending?new Promise(r=>{resolve=r}):Promise.resolve({data:fixture(1),revision:'one'}));await settled();
 pending=true;const request=ui.controller.refresh();expect(ui.controller.select('sample/0')).toBe(true);
 resolve({data:fixture(0),revision:'two'});expect(await request).toBe(true);
 expect(ui.apply).toHaveBeenLastCalledWith(expect.objectContaining({foreground:'#11FF00'}));
 expect(ui.root.querySelector('.terminal-catalog-source')!.textContent).toContain('Using the built-in');
});
