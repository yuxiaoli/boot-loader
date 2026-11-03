import {expect,test} from 'vitest';
import {executeCommand,TerminalSession} from '../src/commands';
import {complete,CompletionCycle} from '../src/editor';

test('theme listing/filtering and application are explicit and preserve session state',()=>{
 const s=new TerminalSession();s.cwd='/';s.variables.set('home','https://example.com');
 s.themes.push({id:'gogh/Dracula',name:'Dracula dark'});
 expect(executeCommand('themes DRACULA',s).lines).toEqual(['gogh/Dracula  Dracula dark']);
 expect(executeCommand('theme gogh/Dracula',s).themeId).toBe('gogh/Dracula');
 expect(executeCommand('theme unknown',s).themeId).toBeUndefined();
 expect(executeCommand('theme',s).lines[0]).toContain('Usage');
 expect(executeCommand('refit',s).refit).toBe(true);
 expect(executeCommand('refit now',s).refit).toBeUndefined();
 expect(s.cwd).toBe('/');expect(s.variables.get('home')).toBe('https://example.com');
});
test('completion discovers commands and exact catalog IDs with cycling and catalog invalidation',()=>{
 expect(complete('the')).toEqual(['theme','themes']);expect(complete('ref')).toEqual(['refit']);
 expect(complete('theme gogh/d',[],undefined,['gogh/Dracula','gogh/Dark'])).toEqual(['theme gogh/Dracula','theme gogh/Dark']);
 const c=new CompletionCycle(),ctx={themeIds:['gogh/Dracula','gogh/Dark']};
 const a=c.next('theme g',7,ctx)!;expect(a.line).toBe('theme gogh/Dracula');
 expect(c.next(a.line,a.cursor,ctx)!.line).toBe('theme gogh/Dark');
 expect(c.canComplete('theme g',7,{themeIds:[]})).toBe(false);
});

test('unique names with spaces work and complete; duplicate names never guess',()=>{
 const s=new TerminalSession();s.themes.push({id:'gogh/one',name:'Solarized Dark'},{id:'gogh/two',name:'Dracula'},{id:'gogh/three',name:'Dracula'});
 expect(executeCommand('theme solarized dark',s).themeId).toBe('gogh/one');
 expect(executeCommand('theme Dracula',s).themeId).toBeUndefined();
 expect(executeCommand('theme Dracula',s).lines[0]).toContain('Ambiguous');
 expect(executeCommand('theme gogh/two',s).themeId).toBe('gogh/two');
 const ids=s.themes.map(t=>t.id),names=s.themes.map(t=>t.name);
 expect(complete('theme Solarized D',[],undefined,ids,names)).toEqual(['theme Solarized Dark']);
 expect(complete('theme dra',[],undefined,ids,names)).toEqual([]);
 expect(complete('theme bad',[],undefined,ids,['bad\x1b[2J'])).toEqual([]);
});

test('a catalogue display name cannot shadow a different theme ID',()=>{
 const s=new TerminalSession();s.themes.push({id:'gogh/green',name:'Green'});
 expect(executeCommand('theme green',s).themeId).toBe('green');
 expect(executeCommand('theme Green',s).themeId).toBeUndefined();
 expect(executeCommand('theme gogh/green',s).themeId).toBe('gogh/green');
 expect(complete('theme gr',[],undefined,s.themes.map(t=>t.id),s.themes.map(t=>t.name))).toEqual(['theme green']);
});
