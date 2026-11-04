import {expect,test} from 'vitest';
import {executeCommand,TerminalSession} from '../src/commands';
import {complete,CompletionCycle} from '../src/editor';

test('theme listing, filtering and application use slugs and preserve session state',()=>{
 const s=new TerminalSession();s.cwd='/';s.variables.set('home','https://example.com');
 s.themes.push({id:'gogh/Dracula',name:'Dracula dark'});
 expect(executeCommand('themes DRACULA',s).lines).toEqual(['dracula-dark  Dracula dark']);
 expect(executeCommand('theme dracula-dark',s).themeId).toBe('gogh/Dracula');
 expect(executeCommand('theme unknown',s).themeId).toBeUndefined();
 expect(executeCommand('theme',s).lines[0]).toContain('Usage');
 expect(executeCommand('refit',s).refit).toBe(true);
 expect(executeCommand('refit now',s).refit).toBeUndefined();
 expect(s.cwd).toBe('/');expect(s.variables.get('home')).toBe('https://example.com');
});

test('completion discovers slugs with cycling and catalogue invalidation',()=>{
 expect(complete('the')).toEqual(['theme','themes']);expect(complete('ref')).toEqual(['refit']);
 const ctx={themeIds:['gogh/Dracula','gogh/Dark'],themeNames:['Dracula Dark','Dark Ocean']};
 expect(complete('theme d',[],undefined,ctx.themeIds,ctx.themeNames)).toEqual(['theme default','theme dracula-dark','theme dark-ocean']);
 const c=new CompletionCycle();
 const a=c.next('theme d',7,ctx)!;expect(a.line).toBe('theme default');
 expect(c.next(a.line,a.cursor,ctx)!.line).toBe('theme dracula-dark');
 expect(c.canComplete('theme dr',8,{themeIds:[],themeNames:[]})).toBe(false);
});

test('duplicate slugs never silently choose a theme',()=>{
 const s=new TerminalSession();s.themes.push({id:'gogh/one',name:'Solarized Dark'},{id:'gogh/two',name:'solarized  dark'});
 const result=executeCommand('theme solarized-dark',s);
 expect(result.themeId).toBeUndefined();expect(result.lines[0]).toContain('Ambiguous');
 expect(complete('theme sol',[],undefined,s.themes.map(t=>t.id),s.themes.map(t=>t.name))).toEqual([]);
});

test('theme arguments use lowercase hyphenated names',()=>{
 const s=new TerminalSession();s.themes.push({id:'gogh/one',name:'Solarized Dark'});
 expect(executeCommand('theme solarized-dark',s).themeId).toBe('gogh/one');
 expect(executeCommand('theme Solarized Dark',s).themeId).toBeUndefined();
 expect(executeCommand('theme gogh/one',s).themeId).toBeUndefined();
 expect(complete('theme sol',[],undefined,['gogh/one'],['Solarized Dark'])).toEqual(['theme solarized-dark']);
 expect(complete('theme bad',[],undefined,['gogh/one'],['bad\x1b[2J'])).toEqual([]);
 expect(executeCommand('themes solarized',s).lines).toEqual(['solarized-dark  Solarized Dark']);
});

test('theme default restores the built-in default',()=>{
 expect(executeCommand('theme default').themeId).toBe('green');
});

test('themes refresh requests a catalogue reload',()=>{
 expect(executeCommand('themes refresh').refreshThemes).toBe(true);
});

test('reboot requests a fresh session and rejects arguments',()=>{
 expect(executeCommand('reboot')).toEqual({lines:[],reboot:true});
 expect(executeCommand('reboot now').reboot).toBeUndefined();
});

test('new commands are discoverable through help and completion',()=>{
 const help=executeCommand('help').lines.join('\n');
 expect(help).toContain('theme <slug>');expect(help).toContain('themes refresh');expect(help).toContain('reboot');
 expect(complete('reb')).toEqual(['reboot']);expect(complete('themes ref')).toEqual(['themes refresh']);
});

test('themes can be searched by its command slug',()=>{
 const s=new TerminalSession();s.themes.push({id:'gogh/one',name:'Solarized Dark'});
 expect(executeCommand('themes solarized-dark',s).lines).toEqual(['solarized-dark  Solarized Dark']);
});

test('listed colliding or reserved slugs are marked for selector use',()=>{
 const s=new TerminalSession();s.themes.push({id:'one',name:'Solarized Dark'},{id:'two',name:'solarized dark'},{id:'three',name:'Default'});
 expect(executeCommand('themes solarized',s).lines.every(line=>line.includes('ambiguous'))).toBe(true);
 expect(executeCommand('themes default',s).lines[0]).toContain('reserved');
 expect(executeCommand('theme default',s).themeId).toBe('green');
});
