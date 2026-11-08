import { expect, test } from 'vitest';
import { executeCommand } from '../src/commands';

test('the approved intro and about copy remains exact', () => {
  expect(executeCommand('intro').lines).toEqual([
    'Welcome. Curiosity has a desktop now.', '',
    "I'm Sean. Welcome to Boot Loader's browser terminal.",
    'Explore browser desktops from a simulated shell.',
    'No real shell commands or host files are accessed.', '',
    'Start here:', '  ls               See the available systems',
    '  boot win11       Open Windows 11 in this tab',
    '  boot win11 --embed  Try it in the computer screen',
    'Some systems need a direct tab instead.', '',
    'Use Tab to complete commands; Up/Down for history.',
    'Press Esc to discard input without running it.',
    'Type help for commands or about for the story.',
  ]);
  expect(executeCommand('about').lines).toEqual([
    'About Boot Loader', '',
    'Built by Sean. A browser pretending to be somewhere',
    'else, built on the work of open-source communities.',
    'Boot Loader brings browser desktops together with',
    'a visual selector and a simulated terminal.', '',
    "The interesting part isn't making pixels look like",
    "an operating system. It's seeing how much of the",
    'experience lives in the details.', '',
    'Keep exploring: https://vectorindex.cloud',
    'Boot Loader source: https://github.com/yuxiaoli/boot-loader',
    'Type source for the individual system projects.',
    'Type intro to get started or help for commands.',
  ]);
});

test('the default help and virtual help file retain their original formatting', () => {
  const expected = [
    'A simulated shell. No real files or commands.',
    '  intro            Welcome and getting started',
    '  about            Project background and author',
    '  ls [path]        List virtual contents',
    '  pwd / cwd        Show the virtual directory',
    '  cd [path]        Change directory (home: /systems)',
    '  cat <path>       Read a virtual text file',
    '  echo <text>      Print literal text',
    '  boot <system>    Open a system in this tab',
    '  open <URL|$name> Open a webpage in this tab',
    '    --embed        Use the computer screen instead',
    '  set name=<URL>   Save a session-only URL',
    '  time             Local time and browser time zone',
    '  themes [search]  List available terminal themes',
    '  themes refresh   Reload the theme catalogue',
    '  theme <slug>     Apply a theme (Tab completes slugs)',
    '  theme default    Restore the built-in theme',
    '  reboot           Start a fresh terminal session',
    '  reload           Reload the current page',
    '  refit            Fit terminal to current viewport',
    '  source [system]  Show sources or open one',
    '  clear / cls      Clear the display',
    '  install <package> Enable a trusted browser tool',
    '  install --list   List all available trusted packages',
    '  uninstall <package> Remove tool enablement',
    '  help             Show this guide', '',
    'Try: ls | cd .. | cat README.txt | boot win11',
    'Systems: daedalos, macos, win12, winxp, win11, webvm, ubuntu',
    'set home=https://example.com then open $home',
    'Variable names: lowercase a-z, digits, underscore;',
    'start with a letter. Names are case-sensitive.',
    'Up/Down: history | Ctrl+C: cancel',
    'Tab: cycle matches | Shift+Tab: reverse',
    'Empty or unmatched Tab leaves the terminal.',
  ];
  expect(executeCommand('help').lines).toEqual(expected);
  expect(executeCommand('cat /help.txt').lines).toEqual(expected);
});
