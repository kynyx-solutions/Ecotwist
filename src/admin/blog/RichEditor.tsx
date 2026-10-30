import { useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import { TableKit } from '@tiptap/extension-table';
import { CharacterCount } from '@tiptap/extension-character-count';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Columns3, Eraser, Highlighter, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Palette,
  Quote, Redo2, Rows3, Strikethrough, Table2, Trash2, Underline, Undo2, X,
} from 'lucide-react';
import { Button, Input, useToast } from '../ui';
import { uploadBlogImage } from './shared';
import { wordCount } from '../../lib/blog';
import '../../styles/article.css';
import './editor.css';

const TEXT_COLOURS = ['#1A1A1A', '#4A5D23', '#38461B', '#C5A059', '#8A5A2B', '#B23B3B', '#2F5D8A', '#6B6A62'];
const HIGHLIGHTS = ['#F6EBC8', '#E4ECD3', '#F5D9D0', '#DCE8F2', '#ECE3F2'];
const FONT_SIZES = ['14px', '16px', '18px', '20px', '24px', '30px'];

type Panel = 'link' | 'image' | 'colour' | 'highlight' | null;

// WordPress-style editor for the article body. Value and onChange are HTML.
export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
        code: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { target: null, rel: null } },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your article…  Use Heading 2 for sections.' }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontSize,
      TableKit.configure({ table: { resizable: false } }),
      CharacterCount,
    ],
    content: value,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'article-body tiptap-body', spellcheck: 'true' } },
    // isEmpty is also true for a doc holding only an image or empty table, so check the HTML itself
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(/^(<p><\/p>)*$/.test(html) ? '' : html);
    },
  });

  const words = wordCount(value);

  if (!editor) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex justify-between border-t border-admin-line px-4 py-2 text-xs text-gray-500">
        <span>{words} {words === 1 ? 'word' : 'words'} · about {Math.max(1, Math.round(words / 200))} min read</span>
        <span className="hidden sm:inline">⌘B bold · ⌘I italic · ⌘U underline · ⌘Z undo</span>
      </div>
    </div>
  );
}

/* ── Toolbar ─────────────────────────────────────────────────── */

function Tool({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-gray-700 transition hover:bg-admin-muted disabled:opacity-35 disabled:hover:bg-transparent ${active ? 'bg-brand-beige text-brand-olive ring-1 ring-brand-gold/50' : ''}`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-admin-line" aria-hidden />;

function Toolbar({ editor }: { editor: Editor }) {
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const chain = () => editor.chain().focus();

  const block =
    [1, 2, 3, 4].find((l) => editor.isActive('heading', { level: l })) ?? 0;
  const setBlock = (v: number) => (v ? chain().setHeading({ level: v as 1 | 2 | 3 | 4 }).run() : chain().setParagraph().run());
  const fontSize = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  const inTable = editor.isActive('table');
  const imageSelected = editor.isActive('image');

  return (
    <div className="sticky top-[53px] z-20 rounded-t-lg border-b border-admin-line bg-white/95 backdrop-blur lg:top-0">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <select
          value={block}
          onChange={(e) => setBlock(Number(e.target.value))}
          className="h-8 rounded-md border border-admin-line bg-white px-2 text-sm outline-none focus:border-brand-gold"
          aria-label="Text style"
        >
          <option value={0}>Paragraph</option>
          <option value={1}>Heading 1</option>
          <option value={2}>Heading 2</option>
          <option value={3}>Heading 3</option>
          <option value={4}>Heading 4</option>
        </select>
        <select
          value={fontSize}
          onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}
          className="ml-1 h-8 rounded-md border border-admin-line bg-white px-2 text-sm outline-none focus:border-brand-gold"
          aria-label="Font size"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s.replace('px', '')}</option>)}
        </select>
        <Sep />
        <Tool label="Bold (⌘B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}><Bold size={16} /></Tool>
        <Tool label="Italic (⌘I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></Tool>
        <Tool label="Underline (⌘U)" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()}><Underline size={16} /></Tool>
        <Tool label="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}><Strikethrough size={16} /></Tool>
        <Tool label="Text colour" active={panel === 'colour' || !!editor.getAttributes('textStyle').color} onClick={() => toggle('colour')}><Palette size={16} /></Tool>
        <Tool label="Highlight" active={panel === 'highlight' || editor.isActive('highlight')} onClick={() => toggle('highlight')}><Highlighter size={16} /></Tool>
        <Sep />
        <Tool label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()}><AlignLeft size={16} /></Tool>
        <Tool label="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()}><AlignCenter size={16} /></Tool>
        <Tool label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()}><AlignRight size={16} /></Tool>
        <Sep />
        <Tool label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}><List size={16} /></Tool>
        <Tool label="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></Tool>
        <Tool label="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}><Quote size={16} /></Tool>
        <Tool label="Divider line" onClick={() => chain().setHorizontalRule().run()}><Minus size={16} /></Tool>
        <Sep />
        <Tool label="Link" active={panel === 'link' || editor.isActive('link')} onClick={() => toggle('link')}><Link2 size={16} /></Tool>
        <Tool label={imageSelected ? 'Image alt text' : 'Insert image'} active={panel === 'image' || imageSelected} onClick={() => toggle('image')}>
          <ImagePlus size={16} />{imageSelected && <span className="text-xs font-medium">Alt</span>}
        </Tool>
        <Tool label="Insert table" active={inTable} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={inTable}><Table2 size={16} /></Tool>
        <Sep />
        <Tool label="Undo (⌘Z)" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}><Undo2 size={16} /></Tool>
        <Tool label="Redo (⇧⌘Z)" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}><Redo2 size={16} /></Tool>
        <Tool label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><Eraser size={16} /></Tool>
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-t border-admin-line bg-admin-bg px-3 py-1.5 text-xs">
          <span className="mr-1 font-semibold uppercase tracking-[0.1em] text-gray-500">Table</span>
          <TableBtn onClick={() => chain().addRowBefore().run()}><Rows3 size={13} /> Row above</TableBtn>
          <TableBtn onClick={() => chain().addRowAfter().run()}><Rows3 size={13} /> Row below</TableBtn>
          <TableBtn onClick={() => chain().deleteRow().run()}><X size={13} /> Delete row</TableBtn>
          <TableBtn onClick={() => chain().addColumnBefore().run()}><Columns3 size={13} /> Column left</TableBtn>
          <TableBtn onClick={() => chain().addColumnAfter().run()}><Columns3 size={13} /> Column right</TableBtn>
          <TableBtn onClick={() => chain().deleteColumn().run()}><X size={13} /> Delete column</TableBtn>
          <TableBtn onClick={() => chain().toggleHeaderRow().run()}>Header row</TableBtn>
          <TableBtn onClick={() => chain().deleteTable().run()} danger><Trash2 size={13} /> Delete table</TableBtn>
        </div>
      )}

      {panel === 'colour' && (
        <Swatches
          title="Text colour"
          colours={TEXT_COLOURS}
          current={editor.getAttributes('textStyle').color as string | undefined}
          onPick={(c) => chain().setColor(c).run()}
          onClear={() => chain().unsetColor().run()}
          onClose={() => setPanel(null)}
          custom
        />
      )}
      {panel === 'highlight' && (
        <Swatches
          title="Highlight"
          colours={HIGHLIGHTS}
          current={editor.getAttributes('highlight').color as string | undefined}
          onPick={(c) => chain().setHighlight({ color: c }).run()}
          onClear={() => chain().unsetHighlight().run()}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'link' && <LinkPanel key={editor.getAttributes('link').href ?? 'new'} editor={editor} onClose={() => setPanel(null)} />}
      {panel === 'image' && <ImagePanel key={imageSelected ? 'edit' : 'new'} editor={editor} onClose={() => setPanel(null)} />}
    </div>
  );
}

function TableBtn({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded border bg-white px-2 py-1 ${danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-admin-line text-gray-700 hover:border-brand-gold'}`}
    >
      {children}
    </button>
  );
}

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="border-t border-admin-line bg-admin-bg px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">{title}</span>
        <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-admin-muted" aria-label="Close"><X size={14} /></button>
      </div>
      {children}
    </div>
  );
}

function Swatches({ title, colours, current, onPick, onClear, onClose, custom }: {
  title: string; colours: string[]; current?: string; onPick: (c: string) => void; onClear: () => void; onClose: () => void; custom?: boolean;
}) {
  return (
    <PanelShell title={title} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        {colours.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            className={`h-7 w-7 rounded-full border ${current?.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-brand-gold ring-offset-1' : 'border-black/10'}`}
            style={{ background: c }}
          />
        ))}
        {custom && (
          <label className="flex items-center gap-1 text-xs text-gray-600">
            Custom <input type="color" value={current ?? '#1a1a1a'} onChange={(e) => onPick(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-admin-line bg-white" />
          </label>
        )}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClear} className="ml-1 text-xs font-medium text-brand-olive hover:underline">Default</button>
      </div>
    </PanelShell>
  );
}

function LinkPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const attrs = editor.getAttributes('link') as { href?: string; target?: string | null; rel?: string | null };
  const editing = editor.isActive('link');
  const [href, setHref] = useState(attrs.href ?? '');
  const [newTab, setNewTab] = useState(attrs.target === '_blank');
  const [nofollow, setNofollow] = useState(/nofollow/.test(attrs.rel ?? ''));

  const apply = () => {
    let url = href.trim();
    if (!url) return remove();
    if (!/^(https?:|mailto:|tel:|\/|#)/i.test(url)) url = /^[\w.-]+\.[a-z]{2,}/i.test(url) ? `https://${url}` : `/${url}`;
    const rel = [nofollow && 'nofollow', newTab && 'noopener noreferrer'].filter(Boolean).join(' ') || null;
    const link = { href: url, target: newTab ? '_blank' : null, rel };
    const { empty } = editor.state.selection;
    if (empty && !editing) {
      editor.chain().focus().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: link }] }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink(link).run();
    }
    onClose();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  return (
    <PanelShell title={editing ? 'Edit link' : 'Add link'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="flex flex-wrap items-center gap-2">
        <Input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://… or /solutions" className="!w-auto min-w-[14rem] flex-1 !py-1.5" aria-label="Link address" />
        <label className="flex items-center gap-1.5 text-sm text-gray-700"><input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} /> Open in new tab</label>
        <label className="flex items-center gap-1.5 text-sm text-gray-700" title="Tells Google not to pass ranking to this link (use for ads, sponsored or untrusted links)">
          <input type="checkbox" checked={nofollow} onChange={(e) => setNofollow(e.target.checked)} /> nofollow
        </label>
        <Button type="submit" className="!py-1.5">{editing ? 'Update' : 'Add link'}</Button>
        {editing && <Button type="button" variant="ghost" className="!py-1.5" onClick={remove}>Remove link</Button>}
      </form>
      {!editing && editor.state.selection.empty && <p className="mt-1.5 text-xs text-gray-500">Tip: select some words first to turn them into a link.</p>}
    </PanelShell>
  );
}

function ImagePanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const toast = useToast();
  const editing = editor.isActive('image');
  const current = editor.getAttributes('image') as { src?: string; alt?: string };
  const [src, setSrc] = useState(editing ? current.src ?? '' : '');
  const [alt, setAlt] = useState(editing ? current.alt ?? '' : '');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const res = await uploadBlogImage(file);
      setSrc(res.url);
      toast(`Photo uploaded (${res.note}). Now describe it.`);
    } catch (err) {
      toast((err as Error).message, true);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const apply = () => {
    if (!src) return toast('Upload a photo first.', true);
    if (!alt.trim()) return toast('Describe the photo (alt text). It is needed for accessibility and SEO.', true);
    if (editing) editor.chain().focus().updateAttributes('image', { alt: alt.trim() }).run();
    else editor.chain().focus().setImage({ src, alt: alt.trim() }).run();
    onClose();
  };

  return (
    <PanelShell title={editing ? 'Image' : 'Insert image'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="flex flex-wrap items-start gap-3">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded border border-admin-line bg-white">
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : (
            <Button type="button" variant="ghost" className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? 'Uploading…' : 'Choose photo'}
            </Button>
          )}
        </div>
        <div className="min-w-[14rem] flex-1 space-y-2">
          <Input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the photo, e.g. “Hand-woven jute hamper with diyas” (required)"
            aria-label="Alt text"
            className="!py-1.5"
            autoFocus={editing}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="!py-1.5" disabled={busy || !src || !alt.trim()}>{editing ? 'Save alt text' : 'Insert image'}</Button>
            {!editing && src && <Button type="button" variant="ghost" className="!py-1.5" onClick={() => fileInput.current?.click()}>Choose another</Button>}
            {editing && <Button type="button" variant="ghost" className="!py-1.5" onClick={() => { editor.chain().focus().deleteSelection().run(); onClose(); }}><Trash2 size={14} /> Remove image</Button>}
          </div>
        </div>
      </form>
      <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </PanelShell>
  );
}
