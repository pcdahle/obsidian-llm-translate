import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeApp, sourceFor, editorFor, MarkdownView, TFile, WorkspaceLeaf,
  Menu, button, modals, notices, window, setResponder,
} from './obsidian-host.mjs';
import { loadPluginSettings, getTargetLanguages } from '../src/settings.ts';
import { extractBody } from '../src/translation/extract-body.ts';
import { protectMarkdown, validateTranslation } from '../src/translation/protected-markdown.ts';
import { SafeFileWriter } from '../src/files/safe-file-writer.ts';
import { TranslationOptionsModal } from '../src/ui/translation-options.ts';
import { TranslationView } from '../src/ui/translation-view.ts';
import TranslatePlugin from '../src/main.ts';

beforeEach(() => { modals.length = 0; notices.length = 0; });
const waitFor = async (predicate) => {
  for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 5)); }
  throw Error('Timed out waiting for plugin');
};
function sse(text) {
  const chunks = [text.slice(0, 15), text.slice(15)];
  const payload = chunks.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`).join('') +
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`;
  return { status: 200, headers: { 'content-type': 'text/event-stream' }, text: payload };
}
const translate = (text) => text.replace(/Hello/g, 'Hej').replace(/world/g, 'världen').replace(/Read this/g, 'Läs detta');
const provider = { id: 'test', name: 'Synthetic API', apiKey: 'synthetic-test-only', model: 'test-model', baseUrl: 'https://example.invalid/v1' };
async function pluginFor(app) {
  app.settings = { providers: [provider], activeProviderId: 'test', targetLanguage: 'English' };
  const plugin = new TranslatePlugin(app, { id: 'translate-note', dir: '.obsidian/plugins/translate-note' });
  await plugin.onload();
  return plugin;
}
function select(el, index, value) {
  const dropdown = el.querySelectorAll('select')[index];
  dropdown.value = value; dropdown.dispatchEvent(new window.Event('change'));
}
async function runCommand(plugin, app, id = 'translate-document', options = {}) {
  const command = plugin.commands.find((command) => command.id === id);
  command.editorCallback(options.editor ?? editorFor(app.bytes.get(app.source.path)));
  await waitFor(() => modals.length > 0);
  const modal = modals.at(-1);
  button(modal.contentEl, 'Swedish').click();
  if (options.beforeTranslate) await options.beforeTranslate();
  button(modal.contentEl, 'Translate').click();
  await waitFor(() => !plugin.translating);
  return app.leaves.find((leaf) => leaf.view instanceof TranslationView)?.view;
}

// Settings and language picker acceptance.
test('legacy settings, provider credentials, prompt, custom language and unknown keys survive', () => {
  const old = { providers: [provider], targetLanguage: 'French', activeProviderId: 'test', translationSystemPrompt: 'Custom {{targetLanguage}}', unknown: 42 };
  const loaded = loadPluginSettings(old);
  for (const [key, value] of Object.entries(old)) assert.deepEqual(loaded[key], value);
  assert.equal(loaded.lastTargetLanguage, ''); assert.equal(loaded.additionalLanguages, '');
  loaded.providers[0].name = 'changed'; assert.equal(provider.name, 'Synthetic API');
  assert.deepEqual(getTargetLanguages(loadPluginSettings(null)), ['English', 'Swedish']);
});
test('quick languages, configured languages and legacy defaults are deduplicated', () => {
  const settings = loadPluginSettings({ targetLanguage: 'French', lastTargetLanguage: 'German', additionalLanguages: 'swedish,Italian\nFrench; German' });
  assert.deepEqual(getTargetLanguages(settings), ['English', 'Swedish', 'German', 'French', 'Italian']);
});
test('picker has English/Swedish quick buttons, remembers last choice, defaults to new file', () => {
  let result;
  const modal = new TranslationOptionsModal(makeApp(), loadPluginSettings({ lastTargetLanguage: 'Swedish' }), true, (value) => { result = value; });
  modal.open();
  assert.equal(modal.contentEl.querySelector('select').value, 'Swedish');
  button(modal.contentEl, 'English').click();
  button(modal.contentEl, 'Translate').click();
  assert.deepEqual(result, { language: 'English', mode: 'new-file' });
});
test('Escape/close of picker resolves cancellation without a language mutation', () => {
  let result = 'pending'; const settings = loadPluginSettings({ lastTargetLanguage: 'French' });
  const modal = new TranslationOptionsModal(makeApp(), settings, false, (value) => { result = value; });
  modal.open(); modal.close(); assert.equal(result, null); assert.equal(settings.lastTargetLanguage, 'French');
});

// Markdown preservation and strict model-response validation.
const richNote = '\uFEFF---\r\nid: 12345678-1234-1234-1234-123456789abc\r\ntitle: Hello\r\n---\r\n# Hello world\r\n\r\nHello **world**. Read this [[Other#Heading|Hello *world*]] and ![[image.png]].\r\n\r\n- [x] Hello world ^block-id\r\n> [!NOTE]+ Hello world\r\n\r\n[Hello](../Other.md#Heading) [world][ref]\r\n[ref]: dbox:11111111-2222-3333-4444-555555555555\r\n\r\n| Hello | world |\r\n| --- | --- |\r\n| Hello | world |\r\n\r\n`Hello world`\r\n```ts\r\nconst x = "Hello world";\r\n```\r\n%% Hello world %% $Hello$ #my/tag\r\nHello &amp; world \\* text\r\n';
test('Markdown, BOM/CRLF, frontmatter, links, dbox IDs, heading anchors, blocks and code round-trip exactly', () => {
  const prepared = protectMarkdown(richNote, 0, richNote.length);
  assert.equal(prepared.restore(prepared.input), richNote);
  assert.ok(!prepared.input.includes('12345678-1234'));
  assert.ok(!prepared.input.includes('dbox:'));
  assert.ok(!prepared.input.includes('const x'));
  const result = prepared.restore(translate(prepared.input));
  assert.ok(result.includes('Hej **världen**'));
  assert.ok(result.includes('# Hello world\r\n'));
  assert.ok(result.includes('[[Other#Heading|Hello *world*]]'));
  assert.ok(result.includes('[Hello](../Other.md#Heading)'));
  assert.ok(result.includes('dbox:11111111-2222-3333-4444-555555555555'));
  assert.ok(result.includes('const x = "Hello world";'));
  assert.equal(extractBody(result).frontmatter, extractBody(richNote).frontmatter);
});
test('frontmatter supports empty YAML, BOM, CRLF, EOF closing delimiter and YAML end marker', () => {
  for (const fm of ['---\n---\n', '\uFEFF---\r\nid: x\r\n---\r\n', '---\na: b\n---', '---\na: b\n...\n']) {
    const result = extractBody(fm); assert.equal(result.frontmatter, fm); assert.equal(result.body, '');
  }
  assert.throws(() => protectMarkdown('---\nid: unfinished\nHello', 0, 26), /Unclosed frontmatter|Invalid translation range/);
});
test('selection inside YAML, a wiki-link or code cannot translate protected content', () => {
  for (const selected of ['12345678', 'Other#Heading', 'const x']) {
    const start = richNote.indexOf(selected);
    assert.throws(() => protectMarkdown(richNote, start, start + selected.length), /no translatable prose/);
  }
});
test('partial selection restores only its original range', () => {
  const original = 'Keep. Hello world. Leave.';
  const start = original.indexOf('Hello'); const end = start + 'Hello world'.length;
  const prepared = protectMarkdown(original, start, end);
  const result = validateTranslation(original, start, end, prepared.restore(translate(prepared.input)));
  assert.equal(result, 'Keep. Hej världen. Leave.');
});
test('missing, duplicate, reordered placeholders, preamble, empty span and injected Markdown fail closed', () => {
  const prepared = protectMarkdown('Hello **world**.\n', 0, 'Hello **world**.\n'.length);
  const tokens = prepared.input.match(/⟪TN_[^⟫]+⟫/g);
  const invalid = [
    '', prepared.input.replace(tokens[0], ''), prepared.input + tokens[0],
    prepared.input.replace(/⟪TN_[^⟫]+⟫/g, (token) => token === tokens[0] ? tokens[1] : token === tokens[1] ? tokens[0] : token),
    'Translation: ' + prepared.input, prepared.input.replace('Hello', ''),
    prepared.input.replace('Hello', '# Hello'),
  ];
  for (const response of invalid) assert.throws(() => prepared.restore(response));
});
test('review validation refuses edited links, missing frontmatter, or newly introduced formatting', () => {
  assert.throws(() => validateTranslation('Hello [[Other]]\n', 0, 16, 'Hej [[Wrong]]\n'));
  assert.throws(() => validateTranslation('---\nid: x\n---\nHello\n', 0, 22, 'Hej\n'));
  assert.throws(() => validateTranslation('Hello world.\n', 0, 13, '**Hej världen.**\n'));
});

// File operations with changes injected into the actual write callback.
test('overwrite preserves frontmatter and creates a verified original-content recovery copy', async () => {
  const app = makeApp('---\nid: x\n---\nHello world.\n');
  const source = sourceFor(app, 'note', extractBody(app.bytes.get(app.source.path)).bodyStartOffset);
  const writer = new SafeFileWriter(app, '.obsidian/plugins/translate-note');
  await writer.overwrite(source, 'Hej världen.\n');
  assert.equal(app.bytes.get(source.filePath), '---\nid: x\n---\nHej världen.\n');
  const backups = [...app.bytes.entries()].filter(([path]) => path.endsWith('.json'));
  assert.equal(backups.length, 1);
  const backup = JSON.parse(backups[0][1]);
  assert.equal(backup.content, source.originalContent); assert.equal(backup.filePath, source.filePath);
});
test('late external edit inside process refuses overwrite and preserves the newer bytes', async () => {
  const app = makeApp(); const source = sourceFor(app);
  app.beforeProcess = () => app.bytes.set(source.filePath, 'Syncthing latest.\n');
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').overwrite(source, 'Hej världen.\n'), /changed before saving/);
  assert.equal(app.bytes.get(source.filePath), 'Syncthing latest.\n');
});
test('external edit not yet announced to Obsidian is detected through adapter read', async () => {
  const app = makeApp(); const source = sourceFor(app);
  app.bytes.set(source.filePath, 'External change.\n');
  app.vault.read = async () => source.originalContent; // stale API cache
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').overwrite(source, 'Hej världen.\n'), /source note changed/);
  assert.equal([...app.bytes.keys()].filter((path) => path.endsWith('.json')).length, 0);
});
test('a dirty editor in any leaf prevents overwrite', async () => {
  const app = makeApp(); const source = sourceFor(app);
  app.leaves.push({ view: new MarkdownView(app.source, 'Unsaved edits') });
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').overwrite(source, 'Hej världen.\n'), /unsaved editor changes/);
  assert.equal(app.bytes.get(source.filePath), source.originalContent);
});
test('rename, delete and same-path replacement all refuse overwrite', async () => {
  for (const change of [
    (app) => { app.source.path = 'Moved.md'; },
    (app) => { app.files.delete(app.source.path); },
    (app) => { app.files.set(app.source.path, new TFile(app.source.path)); },
  ]) {
    const app = makeApp(); const source = sourceFor(app); change(app);
    await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').overwrite(source, 'Hej världen.\n'), /moved, deleted or replaced/);
  }
});
test('backup failure aborts the write', async () => {
  const app = makeApp(); const source = sourceFor(app); app.failBackup = true;
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').overwrite(source, 'Hej världen.\n'), /disk full/);
  assert.equal(app.bytes.get(source.filePath), source.originalContent);
});
test('unverified backup aborts the write', async () => {
  const app = makeApp(); const source = sourceFor(app); const read = app.vault.adapter.read;
  app.vault.adapter.read = (path) => path.endsWith('.json') ? Promise.resolve('corrupted') : read(path);
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').overwrite(source, 'Hej världen.\n'), /recovery copy/);
  assert.equal(app.bytes.get(source.filePath), source.originalContent);
});
test('new files stay in the source folder, preserve metadata and never touch the source', async () => {
  const app = makeApp('---\nid: x\n---\nHello world.\n');
  const source = sourceFor(app, 'note', extractBody(app.bytes.get(app.source.path)).bodyStartOffset);
  const writer = new SafeFileWriter(app, '.obsidian/plugins/translate-note');
  const a = await writer.createNew(source, 'Hej världen.\n', '../Swedish:bad/path');
  const b = await writer.createNew(source, 'Hej världen.\n', 'Swedish');
  assert.notEqual(a, b); assert.match(a, /^Notes\/Source\.[^/]+\.md$/);
  assert.equal(app.bytes.get(a), '---\nid: x\n---\nHej världen.\n');
  assert.equal(app.bytes.get(source.filePath), source.originalContent);
});
test('destination race never overwrites a competing file', async () => {
  const app = makeApp(); const source = sourceFor(app); let destination;
  app.beforeCreate = (path) => { destination = path; app.bytes.set(path, 'Concurrent creator'); };
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note').createNew(source, 'Hej världen.\n', 'Swedish'), /already exists/);
  assert.equal(app.bytes.get(destination), 'Concurrent creator');
  assert.equal(app.bytes.get(source.filePath), source.originalContent);
});
test('unload during backup prevents an ensuing write', async () => {
  const app = makeApp(); const source = sourceFor(app); let loaded = true;
  const write = app.vault.adapter.write;
  app.vault.adapter.write = async (...args) => { await write(...args); loaded = false; };
  await assert.rejects(new SafeFileWriter(app, '.obsidian/plugins/translate-note', () => loaded).overwrite(source, 'Hej världen.\n'), /unloaded/);
  assert.equal(app.bytes.get(source.filePath), source.originalContent);
});

// Real plugin command/menu -> dialog -> unchanged SDK + fetch adapter -> panel -> writer.
test('full-note command asks for language, calls existing SDK/adapter, reviews and safely inserts', async () => {
  const app = makeApp('---\nid: x\n---\nHello world.\n'); const plugin = await pluginFor(app);
  let request;
  setResponder((options) => {
    request = JSON.parse(options.body);
    return sse(translate(request.messages[1].content));
  });
  const view = await runCommand(plugin, app);
  assert.equal(request.model, 'test-model'); assert.equal(request.stream, true);
  assert.match(request.messages[0].content, /into Swedish/);
  assert.ok(!request.messages[1].content.includes('id: x'));
  assert.equal(view.getText(), 'Hej världen.\n');
  assert.equal(app.bytes.get(app.source.path), '---\nid: x\n---\nHello world.\n');
  assert.equal(app.settings.lastTargetLanguage, 'Swedish'); assert.equal(app.settings.targetLanguage, 'English');
  await view.save('overwrite');
  assert.equal(app.bytes.get(app.source.path), '---\nid: x\n---\nHej världen.\n');
  assert.equal(view.hasPendingTranslation, false);
});
test('selection command stays bound to captured file and offsets despite active-file switch', async () => {
  const app = makeApp('Before. Hello world. After.\n'); const plugin = await pluginFor(app);
  setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
  const view = await runCommand(plugin, app, 'translate-selection', {
    editor: editorFor(app.bytes.get(app.source.path), 8, 19),
    beforeTranslate: () => { app.activeFile = new TFile('Other.md'); app.bytes.set('Other.md', 'Other'); },
  });
  await view.save('overwrite');
  assert.equal(app.bytes.get(app.source.path), 'Before. Hej världen. After.\n');
  assert.equal(app.bytes.get('Other.md'), 'Other');
});
test('file menu filters non-Markdown and runs each of the three save modes', async () => {
  for (const mode of ['new-file', 'overwrite', 'review']) {
    const app = makeApp(); const plugin = await pluginFor(app);
    setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
    const callback = app.events.get('file-menu');
    const ignored = new Menu(); callback(ignored, new TFile('picture.png')); assert.equal(ignored.items.length, 0);
    const folder = new Menu(); callback(folder, { path: 'Notes' }); assert.equal(folder.items.length, 0);
    const menu = new Menu(); callback(menu, app.source); assert.equal(menu.items[0].title, 'Translate…');
    menu.items[0].click(); await waitFor(() => modals.length > 0);
    const modal = modals.at(-1); button(modal.contentEl, 'Swedish').click(); select(modal.contentEl, 1, mode);
    button(modal.contentEl, 'Translate').click(); await waitFor(() => !plugin.translating);
    const view = app.leaves[0].view;
    if (mode === 'overwrite') assert.equal(app.bytes.get(app.source.path), 'Hej världen.\n');
    else assert.equal(app.bytes.get(app.source.path), 'Hello world.\n');
    if (mode === 'review') { assert.equal(view.hasPendingTranslation, true); await view.save('overwrite'); }
    if (mode === 'new-file') assert.equal([...app.files.keys()].length, 2);
  }
});
test('conflict keeps the result editable and allows recovery to a new file', async () => {
  const app = makeApp(); const plugin = await pluginFor(app);
  setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
  const view = await runCommand(plugin, app);
  app.bytes.set(app.source.path, 'Syncthing latest.\n');
  await view.save('overwrite');
  assert.equal(view.getText(), 'Hej världen.\n'); assert.equal(view.hasPendingTranslation, true);
  assert.match(view.contentEl.textContent, /still here/);
  await view.save('new-file');
  assert.equal(app.bytes.get(app.source.path), 'Syncthing latest.\n');
  assert.equal(app.files.size, 2);
});
test('review manual correction succeeds, link removal refuses save and retains the result', async () => {
  const app = makeApp('Hello world [[Other]].\n'); const plugin = await pluginFor(app);
  setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
  const view = await runCommand(plugin, app);
  view.setText('Hej världen.\n'); await view.save('overwrite');
  assert.equal(app.bytes.get(app.source.path), 'Hello world [[Other]].\n');
  assert.equal(view.hasPendingTranslation, true);
  view.setText('God dag [[Other]].\n'); await view.save('overwrite');
  assert.equal(app.bytes.get(app.source.path), 'God dag [[Other]].\n');
});
test('concurrent command does not open another dialog or erase a pending review', async () => {
  const app = makeApp(); const plugin = await pluginFor(app); let requests = 0;
  setResponder((options) => { requests++; return sse(translate(JSON.parse(options.body).messages[1].content)); });
  const command = plugin.commands.find((command) => command.id === 'translate-document');
  command.editorCallback(editorFor(app.bytes.get(app.source.path)));
  command.editorCallback(editorFor(app.bytes.get(app.source.path)));
  await waitFor(() => modals.length > 0); assert.equal(modals.length, 1);
  button(modals[0].contentEl, 'Translate').click(); await waitFor(() => !plugin.translating);
  const view = app.leaves[0].view; const previous = view.getText();
  command.editorCallback(editorFor(app.bytes.get(app.source.path)));
  await waitFor(() => !plugin.translating);
  assert.equal(modals.length, 0); assert.equal(view.getText(), previous); assert.equal(requests, 1);
});
test('cancelled language dialog sends no API request and does not persist a choice', async () => {
  const app = makeApp(); const plugin = await pluginFor(app); let requested = false;
  setResponder(() => { requested = true; throw Error('Must not send'); });
  plugin.commands[1].editorCallback(editorFor(app.bytes.get(app.source.path)));
  await waitFor(() => modals.length > 0); modals[0].close(); await waitFor(() => !plugin.translating);
  assert.equal(requested, false); assert.equal(app.settings.lastTargetLanguage, undefined);
});
test('API failure and corrupt model response never enable a write', async () => {
  for (const response of [
    { status: 400, headers: { 'content-type': 'application/json' }, text: JSON.stringify({ error: { message: 'Synthetic failure' } }) },
    sse('A model reply without safety placeholders'),
  ]) {
    const app = makeApp(); const plugin = await pluginFor(app); setResponder(() => response);
    const view = await runCommand(plugin, app); await view.save('overwrite');
    assert.equal(app.bytes.get(app.source.path), 'Hello world.\n');
    assert.equal(app.files.size, 1);
  }
});
test('plugin unload aborts an in-flight SDK request and leaves the original untouched', async () => {
  const app = makeApp(); const plugin = await pluginFor(app); let requested = false;
  setResponder(() => { requested = true; return new Promise(() => {}); });
  plugin.commands[1].editorCallback(editorFor(app.bytes.get(app.source.path)));
  await waitFor(() => modals.length > 0); button(modals[0].contentEl, 'Translate').click();
  await waitFor(() => requested); plugin.onunload(); await waitFor(() => !plugin.translating);
  assert.equal(app.bytes.get(app.source.path), 'Hello world.\n');
  assert.equal(app.leaves[0].view.hasPendingTranslation, false);
});
test('existing command IDs and provider-switch command are retained', async () => {
  const plugin = await pluginFor(makeApp());
  assert.deepEqual(plugin.commands.map((command) => command.id), ['translate-selection', 'translate-document', 'switch-provider']);
});

test('multiline quotes and list indentation are protected even inside a single prose AST node', () => {
  const original = '> Hello\n> world\n>\n> - Hello\n>   world\n';
  const prepared = protectMarkdown(original, 0, original.length);
  assert.equal(prepared.restore(translate(prepared.input)), '> Hej\n> världen\n>\n> - Hej\n>   världen\n');
  assert.throws(() => validateTranslation(original, 0, original.length, '> Hej\nvärlden\n>\n> - Hej\n>   världen\n'));
});

test('custom prompts without the language placeholder still receive the chosen target language', async () => {
  const app = makeApp(); const plugin = await pluginFor(app); let prompt;
  plugin.settings.translationSystemPrompt = 'Keep the register formal.';
  setResponder((options) => {
    const request = JSON.parse(options.body); prompt = request.messages[0].content;
    return sse(translate(request.messages[1].content));
  });
  await runCommand(plugin, app);
  assert.match(prompt, /Keep the register formal/);
  assert.match(prompt, /Target language for this translation: Swedish/);
});
test('truncated and content-filtered model replies are never saved', async () => {
  for (const reason of ['length', 'content_filter']) {
    const app = makeApp(); const plugin = await pluginFor(app);
    setResponder((options) => {
      const text = translate(JSON.parse(options.body).messages[1].content);
      return { status: 200, headers: { 'content-type': 'text/event-stream' }, text:
        `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: reason }] })}\n\ndata: [DONE]\n\n` };
    });
    const view = await runCommand(plugin, app);
    await view.save('overwrite');
    assert.equal(app.bytes.get(app.source.path), 'Hello world.\n');
    assert.equal(view.completed, false);
  }
});
test('external change during the request also protects direct-overwrite mode and keeps the result', async () => {
  const app = makeApp(); const plugin = await pluginFor(app);
  setResponder((options) => {
    app.bytes.set(app.source.path, 'External edit during API call.\n');
    return sse(translate(JSON.parse(options.body).messages[1].content));
  });
  const menu = new Menu(); app.events.get('file-menu')(menu, app.source); menu.items[0].click();
  await waitFor(() => modals.length > 0);
  select(modals[0].contentEl, 1, 'overwrite'); button(modals[0].contentEl, 'Translate').click();
  await waitFor(() => !plugin.translating);
  assert.equal(app.bytes.get(app.source.path), 'External edit during API call.\n');
  assert.equal(app.leaves[0].view.hasPendingTranslation, true);
});
test('double-clicking save creates only one file', async () => {
  const app = makeApp(); const plugin = await pluginFor(app);
  setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
  const view = await runCommand(plugin, app);
  await Promise.all([view.save('new-file'), view.save('new-file')]);
  assert.equal(app.files.size, 2);
});
test('long text requires confirmation and cancelling sends no request', async () => {
  const app = makeApp('Hello world. '.repeat(1600)); const plugin = await pluginFor(app); let requested = false;
  setResponder(() => { requested = true; throw Error('Unexpected request'); });
  plugin.commands[1].editorCallback(editorFor(app.bytes.get(app.source.path)));
  await waitFor(() => modals.length > 0); button(modals[0].contentEl, 'Translate').click();
  await waitFor(() => modals.length > 0 && modals[0].contentEl.textContent.includes('This note is long'));
  button(modals[0].contentEl, 'Cancel').click(); await waitFor(() => !plugin.translating);
  assert.equal(requested, false);
});

test('an editor-menu action uses its context file even if the active note has identical content', async () => {
  const app = makeApp(); const plugin = await pluginFor(app);
  const other = new TFile('Notes/Other.md'); app.files.set(other.path, other); app.bytes.set(other.path, 'Hello world.\n');
  app.activeFile = app.source;
  setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
  const menu = new Menu(); app.events.get('editor-menu')(menu, editorFor('Hello world.\n'), { file: other });
  menu.items.find((item) => item.title.startsWith('Translate full')).click();
  await waitFor(() => modals.length > 0); button(modals[0].contentEl, 'Translate').click();
  await waitFor(() => !plugin.translating); await app.leaves[0].view.save('overwrite');
  assert.equal(app.bytes.get(other.path), 'Hej världen.\n');
  assert.equal(app.bytes.get(app.source.path), 'Hello world.\n');
});

test('cancelling during the recovery-copy write prevents direct overwrite', async () => {
  const app = makeApp(); const plugin = await pluginFor(app);
  setResponder((options) => sse(translate(JSON.parse(options.body).messages[1].content)));
  const write = app.vault.adapter.write;
  app.vault.adapter.write = async (...args) => { await write(...args); plugin.abortController.abort(); };
  const menu = new Menu(); app.events.get('file-menu')(menu, app.source); menu.items[0].click();
  await waitFor(() => modals.length > 0);
  select(modals[0].contentEl, 1, 'overwrite'); button(modals[0].contentEl, 'Translate').click();
  await waitFor(() => !plugin.translating);
  assert.equal(app.bytes.get(app.source.path), 'Hello world.\n');
  assert.equal(app.leaves[0].view.getText(), 'Hej världen.\n');
});
