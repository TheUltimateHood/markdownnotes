import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, Trash2, Edit3, Eye, Moon, Sun, Download, Upload, Tag, Copy, Check, AlertCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './App.css';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AppState {
  notes: Note[];
  currentNote: Note | null;
  searchTerm: string;
  isEditing: boolean;
  showPreview: boolean;
  isDarkMode: boolean;
}

const STORAGE_KEY = 'markdown-notes-app';

function App() {
  const [state, setState] = useState<AppState>({
    notes: [],
    currentNote: null,
    searchTerm: '',
    isEditing: false,
    showPreview: true,
    isDarkMode: false
  });

  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const createNote = useCallback(() => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '# Welcome to your new note!\n\nStart typing your markdown content here...',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes],
      currentNote: newNote,
      isEditing: true
    }));

    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    setEditTags('');
  }, []);

  const selectNote = useCallback((note: Note) => {
    setState(prev => ({
      ...prev,
      currentNote: note,
      isEditing: false
    }));
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags.join(', '));
    setShowMobileSidebar(false);
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.id !== noteId),
      currentNote: prev.currentNote?.id === noteId ? null : prev.currentNote
    }));
    setShowDeleteConfirm(null);
    setToast({ type: 'info', message: 'Note deleted' });
  }, []);

  const confirmDelete = useCallback((noteId: string) => {
    setShowDeleteConfirm(noteId);
  }, []);

  const saveNote = useCallback(() => {
    if (!state.currentNote) return;

    const updatedNote: Note = {
      ...state.currentNote,
      title: editTitle.trim() || 'Untitled Note',
      content: editContent,
      tags: editTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      updatedAt: new Date()
    };

    setState(prev => ({
      ...prev,
      notes: prev.notes.map(note => 
        note.id === updatedNote.id ? updatedNote : note
      ),
      currentNote: updatedNote,
      isEditing: false
    }));
    setToast({ type: 'success', message: 'Note saved' });
  }, [state.currentNote, editTitle, editContent, editTags]);

  const toggleEdit = useCallback(() => {
    if (state.isEditing) {
      saveNote();
    } else {
      setState(prev => ({ ...prev, isEditing: true }));
    }
  }, [state.isEditing, saveNote]);

  const toggleTheme = useCallback(() => {
    setState(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  }, []);

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setState(prev => ({
          ...prev,
          notes: parsed.notes.map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt)
          })),
          isDarkMode: parsed.isDarkMode || false
        }));
      } catch (error) {
        console.error('Failed to load notes:', error);
        setToast({ type: 'error', message: 'Failed to load notes from local storage.' });
      }
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            createNote();
            break;
          case 's':
            e.preventDefault();
            if (state.isEditing) {
              saveNote();
            }
            break;
          case 'e':
            e.preventDefault();
            if (state.currentNote) {
              toggleEdit();
            }
            break;
          case 'p':
            e.preventDefault();
            setState(prev => ({ ...prev, showPreview: !prev.showPreview }));
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.isEditing, state.currentNote, createNote, saveNote, toggleEdit]);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    const dataToSave = {
      notes: state.notes,
      isDarkMode: state.isDarkMode
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [state.notes, state.isDarkMode]);

  // Auto-save functionality
  useEffect(() => {
    if (state.isEditing && state.currentNote && (editContent !== state.currentNote.content || editTitle !== state.currentNote.title)) {
      setIsSaving(true);
      const timeoutId = setTimeout(() => {
        saveNote();
        setIsSaving(false);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [editContent, editTitle, editTags, saveNote, state.isEditing, state.currentNote, state.currentNote?.content, state.currentNote?.title]);

  const filteredNotes = state.notes.filter(note => 
    note.title.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(state.searchTerm.toLowerCase()))
  );

  const exportNote = useCallback(() => {
    if (!state.currentNote) return;

    const blob = new Blob([state.currentNote.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentNote.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.currentNote]);

  const importNote = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const newNote: Note = {
        id: Date.now().toString(),
        title: file.name.replace('.md', ''),
        content,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setState(prev => ({
        ...prev,
        notes: [newNote, ...prev.notes],
        currentNote: newNote,
        isEditing: false
      }));

      setEditTitle(newNote.title);
      setEditContent(newNote.content);
      setEditTags('');
      setToast({ type: 'success', message: 'Note imported' });
    };
    reader.readAsText(file);
  }, []);

  const copyNote = useCallback(async () => {
    if (!state.currentNote) return;

    try {
      await navigator.clipboard.writeText(state.currentNote.content);
      setCopiedNoteId(state.currentNote.id);
      setToast({ type: 'success', message: 'Note copied to clipboard!' });
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch (error) {
      console.error('Failed to copy note:', error);
      setToast({ type: 'error', message: 'Failed to copy note to clipboard.' });
    }
  }, [state.currentNote]);

  const insertMarkdown = useCallback((syntax: string) => {
    const textarea = document.querySelector('.editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);

    let newText = '';
    switch (syntax) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'header':
        newText = `## ${selectedText || 'Header'}`;
        break;
      case 'list':
        newText = `- ${selectedText || 'List item'}`;
        break;
      default:
        return;
    }

    const newContent = editContent.substring(0, start) + newText + editContent.substring(end);
    setEditContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + newText.length, start + newText.length);
    }, 0);
  }, [editContent]);

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className={`app ${state.isDarkMode ? 'dark' : 'light'}`}>
      <div className={`sidebar ${showMobileSidebar ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title-section">
            <h1>Markdown Notes</h1>
            {isSaving && <span className="saving-indicator">Saving...</span>}
          </div>
          <div className="header-actions">
            <button onClick={toggleTheme} className="icon-button" title="Toggle theme (Ctrl/Cmd + T)">
              {state.isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={createNote} className="icon-button" title="New note (Ctrl/Cmd + N)">
              <Plus size={20} />
            </button>
            <button 
              onClick={() => setShowMobileSidebar(false)} 
              className="icon-button mobile-close"
              title="Close sidebar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="search-bar">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={state.searchTerm}
            onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
        </div>

        <div className="notes-list">
          {filteredNotes.length === 0 && state.searchTerm ? (
            <div className="empty-search">
              <Search size={48} />
              <p>No notes found for "{state.searchTerm}"</p>
              <p className="subtitle">Try different keywords or clear your search</p>
              <button onClick={() => setState(prev => ({ ...prev, searchTerm: '' }))} className="clear-search">
                Clear search
              </button>
            </div>
          ) : filteredNotes.length === 0 && state.notes.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>Welcome to Markdown Notes!</h3>
              <p>Create your first note to get started with organizing your thoughts and ideas.</p>
              <button onClick={createNote} className="clear-search">
                <Plus size={16} style={{ marginRight: '8px' }} />
                Create First Note
              </button>
              <div className="onboarding-tips">
                <h4>Quick Tips:</h4>
                <ul>
                  <li>Use Ctrl/Cmd + N to create notes quickly</li>
                  <li>Add tags to organize your notes</li>
                  <li>Live preview shows your markdown as you type</li>
                  <li>Export notes as .md files anytime</li>
                </ul>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="empty-search">
              <Search size={48} />
              <p>No matching notes</p>
              <p className="subtitle">Your search didn't match any notes</p>
              <button onClick={() => setState(prev => ({ ...prev, searchTerm: '' }))} className="clear-search">
                Show all notes
              </button>
            </div>
          ) : (
            filteredNotes.map(note => (
            <div
              key={note.id}
              className={`note-item ${state.currentNote?.id === note.id ? 'active' : ''}`}
              onClick={() => selectNote(note)}
            >
              <div className="note-header">
                <FileText size={16} />
                <span className="note-title">{note.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(note.id);
                  }}
                  className="delete-button"
                  title="Delete note"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="note-preview">
                {note.content.substring(0, 100)}...
              </div>
              {note.tags.length > 0 && (
                <div className="note-tags">
                  {note.tags.map(tag => (
                    <span key={tag} className="tag">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="note-date" title={note.updatedAt.toLocaleString()}>
                {formatRelativeTime(note.updatedAt)}
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {showMobileSidebar && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowMobileSidebar(false)}
          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        />
      )}

      <button 
        onClick={() => setShowMobileSidebar(true)} 
        className="mobile-menu-button"
        title="Open sidebar"
      >
        ☰
      </button>
      <div className="main-content">
        {state.currentNote ? (
          <>
            <div className="editor-header">
              <div className="title-section">
                {state.isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="title-input"
                    placeholder="Note title..."
                  />
                ) : (
                  <h2>{state.currentNote.title}</h2>
                )}
                {state.isEditing && (
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="tags-input"
                    placeholder="Tags (comma separated): productivity, work, ideas..."
                  />
                )}
              </div>
              <div className="editor-actions">
                <button onClick={copyNote} className="icon-button" title="Copy note content">
                  {copiedNoteId === state.currentNote.id ? (
                    <Check size={20} className="success-icon" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
                <button onClick={exportNote} className="icon-button" title="Export as .md">
                  <Download size={20} />
                </button>
                <label className="icon-button" title="Import .md file">
                  <Upload size={20} />
                  <input
                    type="file"
                    accept=".md,.markdown,.txt"
                    onChange={importNote}
                    style={{ display: 'none' }}
                  />
                </label>
                <button
                  onClick={() => setState(prev => ({ ...prev, showPreview: !prev.showPreview }))}
                  className="icon-button"
                  title="Toggle preview (Ctrl/Cmd + P)"
                >
                  <Eye size={20} />
                </button>
                <button onClick={toggleEdit} className="icon-button" title={`${state.isEditing ? 'Save' : 'Edit'} (Ctrl/Cmd + E)`}>
                  <Edit3 size={20} />
                </button>
              </div>
            </div>

            {state.isEditing && (
              <div className="toolbar">
                <button onClick={() => insertMarkdown('bold')} title="Bold">
                  <strong>B</strong>
                </button>
                <button onClick={() => insertMarkdown('italic')} title="Italic">
                  <em>I</em>
                </button>
                <button onClick={() => insertMarkdown('code')} title="Code">
                  {'</>'}
                </button>
                <button onClick={() => insertMarkdown('link')} title="Link">
                  🔗
                </button>
                <button onClick={() => insertMarkdown('header')} title="Header">
                  H
                </button>
                <button onClick={() => insertMarkdown('list')} title="List">
                  •
                </button>
              </div>
            )}

            <div className={`editor-container ${state.showPreview ? 'split' : 'full'}`}>
              {state.isEditing && (
                <div className="editor-pane">
                  <textarea
                    className="editor-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Start writing your markdown..."
                  />
                </div>
              )}

              {state.showPreview && (
                <div className="preview-pane">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={state.isDarkMode ? tomorrow : prism}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {state.isEditing ? editContent : state.currentNote.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="welcome-screen">
            <FileText size={64} />
            <h2>Ready to Start Writing?</h2>
            <p>Select a note from the sidebar or create a new one to begin capturing your ideas in markdown format.</p>
            <button onClick={createNote} className="create-button">
              <Plus size={20} />
              Create New Note
            </button>
            <div style={{ marginTop: '32px', fontSize: '14px', opacity: '0.7' }}>
              <p>💡 Pro tip: Press <strong>Ctrl/Cmd + N</strong> to quickly create notes</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Note</h3>
            <p>Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteConfirm(null)} className="cancel-button">
                Cancel
              </button>
              <button onClick={() => deleteNote(showDeleteConfirm)} className="delete-confirm-button">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="keyboard-shortcuts" title="Click to see keyboard shortcuts">
        <div className="shortcuts-content">
          <div className="shortcuts-title">Shortcuts</div>
          <div className="shortcut-item">
            <span>New note</span>
            <span className="shortcut-key">Ctrl+N</span>
          </div>
          <div className="shortcut-item">
            <span>Save note</span>
            <span className="shortcut-key">Ctrl+S</span>
          </div>
          <div className="shortcut-item">
            <span>Toggle edit</span>
            <span className="shortcut-key">Ctrl+E</span>
          </div>
          <div className="shortcut-item">
            <span>Toggle preview</span>
            <span className="shortcut-key">Ctrl+P</span>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            {toast.type === 'success' && <Check size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <FileText size={16} />}
            <span>{toast.message}</span>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="toast-close"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;