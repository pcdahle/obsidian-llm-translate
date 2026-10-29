// Contract host for the Obsidian API. Plugin, SDK, parser and UI code run unmodified.
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
export const window = dom.window;
Object.assign(globalThis, { window, document: window.document, AbortController: window.AbortController });
window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
function createEl(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.cls) el.className = options.cls;
  if (options.text) el.textContent = options.text;
  this.appendChild(el);
  return el;
}
Object.assign(window.HTMLElement.prototype, {
  empty() { this.replaceChildren(); },
  addClass(name) { this.classList.add(name); },
  toggleClass(name, enabled) { this.classList.toggle(name, enabled); },
  createEl,
  createDiv(options) { return createEl.call(this, 'div', options); },
});
Object.assign(globalThis, {
  createFragment: () => document.createDocumentFragment(),
  createDiv: () => document.createElement('div'),
  createSpan: () => document.createElement('span'),
});
export const notices = [];
export class Notice { constructor(text) { notices.push(text); this.messageEl = document.createElement('div'); } hide() {} }
export class App {}
export class TFile { constructor(path) { this.path = path; this.extension = path.split('.').pop(); this.stat = {}; } }
export class MarkdownView { constructor(file, value) { this.file = file; this.editor = { getValue: () => value }; } }
export class WorkspaceLeaf { constructor(app) { this.app = app; } }
export class ItemView { constructor(leaf) { this.app = leaf.app; this.contentEl = document.createElement('div'); } }
export const modals = [];
export class Modal {
  constructor(app) { this.app = app; this.contentEl = document.createElement('div'); }
  setTitle(title) { this.contentEl.dataset.title = title; return this; }
  open() { modals.push(this); this.onOpen(); }
  close() { modals.splice(modals.indexOf(this), 1); this.onClose(); }
}
export class FuzzySuggestModal extends Modal { setPlaceholder() {} }
export class PluginSettingTab { constructor(app, plugin) { this.app = app; this.plugin = plugin; } update() {} }
export class Plugin {
  constructor(app, manifest) { this.app = app; this.manifest = manifest; this.commands = []; }
  addCommand(command) { this.commands.push(command); }
  registerEvent() {}
  addSettingTab() {}
  registerView(type, factory) { this.app.workspace.factories.set(type, factory); }
  async loadData() { return this.app.settings; }
  async saveData(settings) { this.app.settings = structuredClone(settings); }
  addStatusBarItem() { return document.createElement('div'); }
}
export class Menu { constructor() { this.items = []; } addItem(callback) { const item = new MenuItem(); callback(item); this.items.push(item); return this; } }
class MenuItem {
  setTitle(value) { this.title = value; return this; }
  setIcon() { return this; }
  setSection() { return this; }
  onClick(callback) { this.click = callback; return this; }
}
export class Setting {
  constructor(el) { this.el = el.createDiv(); }
  setName(name) { this.el.dataset.name = name; return this; }
  addButton(callback) {
    const el = this.el.createEl('button');
    const component = {
      setButtonText(text) { el.textContent = text; return this; },
      setCta() { return this; },
      onClick(fn) { el.addEventListener('click', fn); return this; },
    };
    callback(component); return this;
  }
  addDropdown(callback) {
    const el = this.el.createEl('select');
    const component = {
      addOption(value, label) { el.add(new window.Option(label, value)); return this; },
      addOptions(values) { for (const [value, label] of Object.entries(values)) this.addOption(value, label); return this; },
      setValue(value) { el.value = value; return this; },
      onChange(fn) { el.addEventListener('change', () => fn(el.value)); return this; },
    };
    callback(component); return this;
  }
}
// Desktop status-bar loader runs against the DOM; icons are supplied by Obsidian in production.
export const Platform = { isMobile: false };
export function setIcon() {}
export const normalizePath = (path) => path.replace(/\/+/g, '/');
let responder;
export function setResponder(fn) { responder = fn; }
export async function requestUrl(options) { return responder(options); }

export function makeApp(content = 'Hello world.\n', path = 'Notes/Source.md') {
  const files = new Map();
  const bytes = new Map();
  const events = new Map();
  const leaves = [];
  const source = new TFile(path);
  files.set(path, source); bytes.set(path, content);
  const app = {
    source, files, bytes, events, leaves, settings: null,
    beforeProcess: null, beforeCreate: null, failBackup: false,
    vault: {
      configDir: '.obsidian',
      adapter: {
        read: async (path) => { if (!bytes.has(path)) throw Error('Missing file'); return bytes.get(path); },
        write: async (path, content) => { if (app.failBackup) throw Error('Backup disk full'); bytes.set(path, content); },
        exists: async (path) => bytes.has(path),
        mkdir: async (path) => { bytes.set(path, null); },
      },
      getAbstractFileByPath: (path) => files.get(path),
      read: async (file) => bytes.get(file.path),
      process: async (file, callback) => {
        await app.beforeProcess?.();
        const next = callback(bytes.get(file.path));
        bytes.set(file.path, next);
        return next;
      },
      create: async (path, content) => {
        await app.beforeCreate?.(path);
        if (bytes.has(path)) throw Error('File already exists');
        const file = new TFile(path); files.set(path, file); bytes.set(path, content); return file;
      },
    },
    workspace: {
      factories: new Map(),
      on: (name, callback) => { events.set(name, callback); return {}; },
      getActiveFile: () => app.activeFile ?? source,
      iterateAllLeaves: (callback) => leaves.forEach(callback),
      getLeavesOfType: (type) => leaves.filter((leaf) => leaf.view?.getViewType?.() === type),
      getRightLeaf: () => {
        const leaf = new WorkspaceLeaf(app);
        leaf.setViewState = async ({ type }) => { leaf.view = app.workspace.factories.get(type)(leaf); leaves.push(leaf); await leaf.view.onOpen(); };
        return leaf;
      },
      revealLeaf: async () => {},
    },
  };
  return app;
}
export function sourceFor(app, kind = 'note', start = 0, end = app.bytes.get(app.source.path).length) {
  return { file: app.source, filePath: app.source.path, originalContent: app.bytes.get(app.source.path), replaceStart: start, replaceEnd: end, kind };
}
export function editorFor(value, from = 0, to = value.length) {
  return { getValue: () => value, getSelection: () => value.slice(from, to), getCursor: (which) => which === 'from' ? from : to, posToOffset: (offset) => offset };
}
export function button(el, label) { return [...el.querySelectorAll('button')].find((button) => button.textContent === label); }
