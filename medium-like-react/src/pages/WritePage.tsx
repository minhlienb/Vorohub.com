import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { feedApi, uploadImage } from '../lib/api.js';
import type { Feed } from '../lib/api.js';
import {
  isAuthenticated,
  getUserEmail,
  getAvatarUrl,
  getStoredDisplayName,
  getMode
} from '../lib/auth.js';
import { editorBlocksToHtml } from '../lib/editorToHtml.js';
import { htmlToEditorBlocks } from '../lib/htmlToEditorBlocks.js';

// Loose types for EditorJS instances — the plugins don't ship
// .d.ts files, so we use `any` for the editor handle. The methods
// we call (save, destroy) are documented in @editorjs/editorjs.
type EditorHandle = {
  save: () => Promise<{ blocks: any[] }>;
  destroy: () => void;
} | null;

interface EditorJSToolConfig {
  uploader?: {
    uploadByUrl?: (url: string) => Promise<{ success: number; file: { url: string } }>;
    uploadByFile?: (file: File) => Promise<{ success: number; file: { url: string } }>;
  };
}

export default function WritePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [authed, setAuthed] = useState(isAuthenticated());
  const [editing, setEditing] = useState<Feed | null>(null);
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [tags, setTags] = useState('');
  const [coverStatus, setCoverStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const editorRef = useRef<EditorHandle>(null);
  const holderRef = useRef<HTMLDivElement>(null);

  // Auth gate — same lazy pattern as the Barba version.
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { returnPath: editId ? `/write?edit=${editId}` : '/write' } });
    } else {
      setAuthed(true);
    }
  }, [navigate, editId]);

  // Load existing feed when editing.
  useEffect(() => {
    if (!authed || !editId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await feedApi.getFeedItem(editId);
        if (cancelled) return;
        setEditing(res.feed);
        setTitle(res.feed.title || '');
        setCoverUrl(res.feed.image_url || '');
        setTags(Array.isArray(res.feed.tags) ? res.feed.tags.join(', ') : '');
      } catch (err) {
        setError('Failed to load article: ' + (err instanceof Error ? err.message : 'unknown'));
      }
    })();
    return () => { cancelled = true; };
  }, [authed, editId]);

  // Mount the EditorJS instance once the auth gate is past.
  useEffect(() => {
    if (!authed || !holderRef.current) return;
    let cancelled = false;
    (async () => {
      const [
        { default: EditorJS },
        { default: Header },
        { default: List },
        { default: Quote },
        { default: Delimiter },
        { default: ImageTool },
        { default: LinkTool },
        { default: Marker },
        { default: InlineCode },
        { default: CodeTool }
      ] = await Promise.all([
        import('@editorjs/editorjs'),
        import('@editorjs/header'),
        import('@editorjs/list'),
        import('@editorjs/quote'),
        import('@editorjs/delimiter'),
        import('@editorjs/image'),
        import('@editorjs/link'),
        import('@editorjs/marker'),
        import('@editorjs/inline-code'),
        import('@editorjs/code')
      ]);
      if (cancelled) return;

      let initialData: { blocks: any[] } | undefined;
      if (editing) {
        const blocks = htmlToEditorBlocks(editing.content || '');
        if (blocks.length) initialData = { blocks };
      }

      editorRef.current = new EditorJS({
        holder: holderRef.current!,
        placeholder: 'Kể câu chuyện của bạn…',
        data: initialData,
        tools: {
          header: { class: Header, config: { levels: [2, 3, 4], defaultLevel: 2 } },
          list: { class: List, config: { defaultStyle: 'unordered' } },
          quote: { class: Quote, config: { quotePlaceholder: 'Quote', captionPlaceholder: 'Tác giả' } },
          delimiter: Delimiter,
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByUrl: async (url: string) => ({ success: 1, file: { url } }),
                uploadByFile: async (file: File) => {
                  const url = await uploadImage(file);
                  return { success: 1, file: { url } };
                }
              }
            }
          },
          linkTool: LinkTool,
          marker: Marker,
          inlineCode: InlineCode,
          code: CodeTool
        }
      });
    })();
    return () => {
      cancelled = true;
      if (editorRef.current) {
        try { editorRef.current.destroy(); } catch (e) { /* noop */ }
        editorRef.current = null;
      }
    };
  }, [authed, editing]);

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCoverStatus('Only image files are allowed.');
      e.target.value = '';
      return;
    }
    setCoverStatus(`Uploading ${file.name}…`);
    try {
      const url = await uploadImage(file);
      setCoverUrl(url);
      setCoverStatus('Upload complete.');
    } catch (err) {
      setCoverStatus('Upload failed: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
      e.target.value = '';
    }
  };

  const publish = useCallback(async () => {
    setError('');
    if (!title.trim()) {
      setError('Thêm tiêu đề cho bài viết trước khi đăng.');
      return;
    }
    if (!editorRef.current) {
      setError('Editor đang tải, thử lại trong giây lát.');
      return;
    }
    setSubmitting(true);
    try {
      const output = await editorRef.current.save();
      const html = editorBlocksToHtml(output.blocks);
      const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const userEmail = getUserEmail();
      const basePayload = {
        title: title.trim(),
        content: html,
        image_url: coverUrl.trim() || null,
        tags: tagArr,
        author: getStoredDisplayName(userEmail) || userEmail || 'Anonymous',
        author_avatar: getAvatarUrl(userEmail || 'anonymous'),
        author_email: userEmail
      };
      let feed: Feed;
      if (editing) {
        const res = await feedApi.updateFeed(editing.id, basePayload);
        feed = res.feed;
      } else {
        const res = await feedApi.createFeed(basePayload);
        feed = res.feed;
      }
      const path = getMode() === 'mobile' ? `/short/${feed.slug}` : `/read/${feed.slug}`;
      navigate(path);
    } catch (err) {
      console.error('Publish error:', err);
      setError(editing ? 'Không thể lưu bài viết. Thử lại.' : 'Không thể đăng bài. Thử lại.');
    } finally {
      setSubmitting(false);
    }
  }, [title, coverUrl, tags, editing, navigate]);

  // Ctrl/Cmd+S publishes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        publish();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [publish]);

  if (!authed) return null;

  const isEditing = !!editing;
  const publishLabel = submitting
    ? (isEditing ? 'Saving…' : 'Publishing…')
    : (isEditing ? 'Save changes' : 'Publish');

  return (
    <main className="main write-main">
      <div className="write-page">
        {coverStatus && (
          <div className="write-cover-status" style={{ marginBottom: 8 }}>
            {coverStatus}
          </div>
        )}

        <div className="write-cover-field">
          <label className="write-label" htmlFor="write-cover">
            Cover image URL (optional)
          </label>
          <div className="write-cover-row">
            <input
              type="url"
              className="form-input write-cover-input"
              id="write-cover"
              placeholder="https://… or upload from your device"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              autoComplete="off"
            />
            <label className="write-cover-upload" htmlFor="write-cover-file">
              <span className="write-cover-upload-label">Upload</span>
              <input
                type="file"
                id="write-cover-file"
                accept="image/*"
                onChange={handleCoverFile}
                hidden
              />
            </label>
          </div>
          {coverUrl && (
            <div className="write-cover-preview">
              <img src={coverUrl} alt="Cover preview" />
            </div>
          )}
        </div>

        <input
          type="text"
          className="write-title-input"
          id="write-title"
          placeholder="Tiêu đề bài viết"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />

        <input
          type="text"
          className="write-tags-input"
          id="write-tags"
          placeholder="Thẻ (cách nhau bằng dấu phẩy): AI, Công nghệ"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          autoComplete="off"
        />

        <div className="write-editor" ref={holderRef} />

        {error && <div className="write-error">{error}</div>}

        <div className="write-actions">
          <button
            type="button"
            className="write-publish"
            onClick={publish}
            disabled={submitting}
          >
            {publishLabel}
          </button>
          <Link to="/profile" className="write-cancel">Cancel</Link>
        </div>
      </div>
    </main>
  );
}
