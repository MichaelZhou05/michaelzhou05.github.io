import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../vim-game.js', import.meta.url), 'utf8');

function game() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, {
      dataset: {}, listeners: {}, innerHTML: '', textContent: '',
      classList: { add() {}, remove() {}, toggle() {} }, focus() {},
      addEventListener(type, callback) { this.listeners[type] = callback; },
    });
    return elements.get(id);
  };
  runInNewContext(source, {
    document: { querySelector: element, getElementById: element },
    performance: { now: () => 1 }, setInterval() {}, clearInterval() {},
  });
  element('vim-start').listeners.click();
  const decode = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return {
    key(...keys) {
      for (const key of keys) element('vim-screen').listeners.keydown({
        key, preventDefault() {}, stopPropagation() {},
      });
    },
    lines() {
      return [...element('vim-buffer').innerHTML.matchAll(/<div class="vim-line">(.*?)<\/div>/g)]
        .map(([, html]) => decode(html.replace(/<span class="vim-gutter">.*?<\/span>/, '')));
    },
    cursor() {
      const rows = element('vim-buffer').innerHTML.split('<div class="vim-line">').slice(1);
      const row = rows.findIndex(html => html.includes('vim-cursor'));
      const before = rows[row].split(/<span class="[^"]*vim-cursor/)[0]
        .replace(/<span class="vim-gutter">.*?<\/span>/, '');
      return [row, decode(before).length];
    },
  };
}

test('insert arrows move without inserting hjkl; literal hjkl still types', () => {
  const g = game();
  const original = g.lines();
  g.key('i', 'ArrowRight');
  assert.deepEqual(g.cursor(), [0, 1]);
  g.key('ArrowDown');
  assert.deepEqual(g.cursor(), [1, 1]);
  g.key('ArrowLeft', 'ArrowUp');
  assert.deepEqual(g.cursor(), [0, 0]);
  assert.deepEqual(g.lines(), original);
  g.key('h', 'j', 'k', 'l');
  assert.equal(g.lines()[0], 'hjkl' + original[0]);
});

test('insert cursor allows line end and restores its column across an empty line', () => {
  const g = game();
  const length = g.lines()[2].length;
  g.key('3', 'G', '$', 'a', 'ArrowRight');
  assert.deepEqual(g.cursor(), [2, length]);
  g.key('ArrowDown');
  assert.deepEqual(g.cursor(), [3, 0]);
  g.key('ArrowUp');
  assert.deepEqual(g.cursor(), [2, length]);
  g.key('Z', 'ArrowDown', 'ArrowUp');
  assert.deepEqual(g.cursor(), [2, length + 1]);
  g.key('Backspace', 'ArrowDown', 'ArrowUp');
  assert.deepEqual(g.cursor(), [2, length]);
});

test('arrows still move in normal mode and clamp at buffer boundaries', () => {
  const g = game();
  g.key('ArrowLeft', 'ArrowUp');
  assert.deepEqual(g.cursor(), [0, 0]);
  g.key('ArrowRight', 'ArrowDown');
  assert.deepEqual(g.cursor(), [1, 1]);
  g.key('G', '$', 'a', 'ArrowDown', 'ArrowRight');
  assert.deepEqual(g.cursor(), [22, g.lines()[22].trimEnd().length]);
});
