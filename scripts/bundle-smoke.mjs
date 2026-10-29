// Load the shipped CommonJS bundle with the same Obsidian contract host as the tests.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as host from '../tests/obsidian-host.mjs';
const shipped = await readFile('main.js', 'utf8');
const module = { exports: {} };
new Function('require', 'module', 'exports', shipped)((name) => {
  assert.equal(name, 'obsidian', 'The distributable must bundle every runtime dependency except Obsidian');
  return host;
}, module, module.exports);
const TranslatePlugin = module.exports.default;
assert.equal(typeof TranslatePlugin, 'function');
const app = host.makeApp('---\nid: synthetic\n---\nHello world [[Other]].\n');
app.settings = {
  providers: [{ id: 'test', name: 'Synthetic API', apiKey: 'synthetic-test-only', model: 'test', baseUrl: 'https://example.invalid/v1' }],
  activeProviderId: 'test', targetLanguage: 'English',
};
const plugin = new TranslatePlugin(app, JSON.parse(await readFile('manifest.json', 'utf8')));
await plugin.onload();
host.setResponder((options) => {
  const request = JSON.parse(options.body);
  assert.match(request.messages[0].content, /Swedish/);
  const text = request.messages[1].content.replace(/Hello world/g, 'Hej världen');
  return { status: 200, headers: { 'content-type': 'text/event-stream' }, text:
    `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n` };
});
const waitFor = async (predicate) => {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 5)); }
  throw Error('Bundle smoke test timed out');
};
const menu = new host.Menu(); app.events.get('file-menu')(menu, app.source);
assert.equal(menu.items[0].title, 'Translate…'); menu.items[0].click();
await waitFor(() => host.modals.length > 0);
const modal = host.modals[0]; host.button(modal.contentEl, 'Swedish').click();
host.button(modal.contentEl, 'Translate').click();
await waitFor(() => !plugin.translating);
assert.equal(app.files.size, 2);
assert.equal(app.bytes.get(app.source.path), '---\nid: synthetic\n---\nHello world [[Other]].\n');
const path = [...app.files.keys()].find((path) => path !== app.source.path);
assert.equal(app.bytes.get(path), '---\nid: synthetic\n---\nHej världen [[Other]].\n');
plugin.onunload();
console.log('Production bundle smoke test passed: file menu → language dialog → SDK → new file; original unchanged.');
