// Contracts — Tier 3 v2 follow-up feature.
//
// Lists partnership/agreement PDFs stored in the `contracts` Supabase Storage
// bucket. Admin (Trace) can upload + delete. Both partners can view + download.
//
// Layout: left rail with contract list (similar to ScorecardRail), right pane
// renders the selected contract inline via <iframe> using a short-lived signed
// URL from Supabase Storage. Mobile collapses to a list-then-detail flow.
//
// Reference: docs/tier3-v2-redesign/RESEARCH.md follow-up.

import { useEffect, useState, useCallback } from 'react';
import { FileText, Upload, Trash2, Download, ExternalLink, X } from 'lucide-react';
import {
  fetchContracts,
  uploadContract,
  deleteContract,
  fetchContractSignedUrl,
} from '../lib/supabase.js';
import PageHeader from './PageHeader.jsx';
import Callout from './Callout.jsx';
import Toast from './Toast.jsx';

function getSessionRole() {
  try { return sessionStorage.getItem('cardinal-role'); } catch { return null; }
}

function humanFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function Contracts() {
  const sessionRole = getSessionRole();
  const isAdmin = sessionRole === 'admin';

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Selected contract for the right-pane viewer
  const [selectedId, setSelectedId] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);

  // Upload form state (admin only)
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Delete confirmation state (admin only)
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast for success notifications
  const [toast, setToast] = useState(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchContracts();
      setContracts(rows);
      // Auto-select the first contract for quick preview if none selected
      if (rows.length > 0 && !selectedId) {
        setSelectedId(rows[0].id);
      }
    } catch (err) {
      console.error(err);
      setLoadError('Could not load contracts. Please refresh.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  // When the selected contract changes, fetch a fresh signed URL for the viewer.
  useEffect(() => {
    if (!selectedId) {
      setViewerUrl(null);
      return;
    }
    const contract = contracts.find((c) => c.id === selectedId);
    if (!contract) {
      setViewerUrl(null);
      return;
    }
    let cancelled = false;
    setViewerLoading(true);
    setViewerError(null);
    fetchContractSignedUrl(contract.file_path)
      .then((url) => { if (!cancelled) setViewerUrl(url); })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setViewerError('Could not load the file. Please try again.');
      })
      .finally(() => { if (!cancelled) setViewerLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId, contracts]);

  const selectedContract = contracts.find((c) => c.id === selectedId) ?? null;

  function resetUploadForm() {
    setUploadFile(null);
    setUploadName('');
    setUploadDescription('');
    setUploadCategory('');
    setUploadError(null);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.');
      return;
    }
    setUploadFile(file);
    setUploadError(null);
    // Default the display name to the filename (without .pdf) if empty
    if (!uploadName) {
      const base = file.name.replace(/\.pdf$/i, '');
      setUploadName(base);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Pick a PDF file to upload.');
      return;
    }
    if (!uploadName.trim()) {
      setUploadError('Give the contract a name.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const row = await uploadContract({
        file: uploadFile,
        name: uploadName,
        description: uploadDescription,
        category: uploadCategory,
      });
      setContracts((prev) => [row, ...prev]);
      setSelectedId(row.id);
      setUploadOpen(false);
      resetUploadForm();
      setToast({ color: 'green', text: 'Contract uploaded.' });
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteContract(pendingDeleteId);
      setContracts((prev) => prev.filter((c) => c.id !== pendingDeleteId));
      if (selectedId === pendingDeleteId) setSelectedId(null);
      setPendingDeleteId(null);
      setToast({ color: 'green', text: 'Contract removed.' });
    } catch (err) {
      console.error(err);
      setToast({ color: 'red', text: err.message || 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="container">
        <div className="screen fade-in">
          <PageHeader
            eyebrow="Contracts"
            greeting={null}
          />

          <div className="contracts-header">
            <div>
              <h2 style={{ margin: 0 }}>Signed Agreements</h2>
              <p className="muted" style={{ marginTop: 4 }}>
                Partnership and operating agreements between Trace and the partners.
                {!isAdmin && ' View-only — contact Trace for changes.'}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setUploadOpen(true)}
              >
                <Upload size={16} strokeWidth={1.75} aria-hidden="true" />
                <span style={{ marginLeft: 'var(--space-2)' }}>Upload PDF</span>
              </button>
            )}
          </div>

          {loadError && (
            <Callout color="red">{loadError}</Callout>
          )}

          {loading ? (
            <p className="muted">Loading contracts{'…'}</p>
          ) : contracts.length === 0 ? (
            <Callout color="blue" title="No contracts yet.">
              {isAdmin
                ? 'Click "Upload PDF" above to add the first one.'
                : 'Trace hasn\'t uploaded any contracts yet.'}
            </Callout>
          ) : (
            <div className="contracts-layout">
              {/* Left rail — contract list */}
              <aside className="contracts-rail" aria-label="Contracts list">
                <ul className="contracts-rail__list">
                  {contracts.map((c) => {
                    const active = selectedId === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={`contracts-rail__item ${active ? 'contracts-rail__item--active' : ''}`}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <FileText size={18} strokeWidth={1.75} aria-hidden="true" />
                          <div className="contracts-rail__item-body">
                            <div className="contracts-rail__item-name">{c.name}</div>
                            <div className="contracts-rail__item-meta">
                              {formatUploadedAt(c.uploaded_at)}
                              {c.file_size_bytes ? ` · ${humanFileSize(c.file_size_bytes)}` : ''}
                            </div>
                            {c.category && (
                              <div className="contracts-rail__item-category">{c.category}</div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              {/* Right pane — viewer */}
              <div className="contracts-viewer">
                {!selectedContract ? (
                  <p className="muted" style={{ padding: 'var(--space-6)' }}>
                    Pick a contract on the left to view it.
                  </p>
                ) : (
                  <>
                    <div className="contracts-viewer__header">
                      <div>
                        <h3 style={{ margin: 0 }}>{selectedContract.name}</h3>
                        {selectedContract.description && (
                          <p className="muted" style={{ marginTop: 4 }}>
                            {selectedContract.description}
                          </p>
                        )}
                        <p className="muted" style={{ marginTop: 4, fontSize: 'var(--text-sm)' }}>
                          Uploaded {formatUploadedAt(selectedContract.uploaded_at)}
                          {selectedContract.file_size_bytes
                            ? ` · ${humanFileSize(selectedContract.file_size_bytes)}`
                            : ''}
                        </p>
                      </div>
                      <div className="contracts-viewer__actions">
                        {viewerUrl && (
                          <>
                            <a
                              href={viewerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost"
                              title="Open in new tab"
                            >
                              <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
                              <span style={{ marginLeft: 'var(--space-2)' }}>Open</span>
                            </a>
                            <a
                              href={viewerUrl}
                              download={selectedContract.name + '.pdf'}
                              className="btn btn-ghost"
                              title="Download"
                            >
                              <Download size={14} strokeWidth={1.75} aria-hidden="true" />
                              <span style={{ marginLeft: 'var(--space-2)' }}>Download</span>
                            </a>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setPendingDeleteId(selectedContract.id)}
                            style={{ color: 'var(--miss)' }}
                            title="Delete contract"
                          >
                            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                            <span style={{ marginLeft: 'var(--space-2)' }}>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {viewerLoading && <p className="muted">Loading PDF{'…'}</p>}
                    {viewerError && <Callout color="red">{viewerError}</Callout>}
                    {viewerUrl && !viewerError && (
                      <iframe
                        key={viewerUrl}
                        src={viewerUrl}
                        title={selectedContract.name}
                        className="contracts-viewer__iframe"
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Upload modal — admin only */}
          {uploadOpen && isAdmin && (
            <div
              className="contracts-modal-backdrop"
              onClick={() => { if (!uploading) { setUploadOpen(false); resetUploadForm(); } }}
            >
              <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="contracts-modal__header">
                  <h3 style={{ margin: 0 }}>Upload contract</h3>
                  <button
                    type="button"
                    className="contracts-modal__close"
                    onClick={() => { if (!uploading) { setUploadOpen(false); resetUploadForm(); } }}
                    aria-label="Close"
                  >
                    <X size={18} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
                <form onSubmit={handleUpload} className="contracts-modal__body">
                  <label className="contracts-modal__label">
                    PDF file
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                    {uploadFile && (
                      <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                        {uploadFile.name} · {humanFileSize(uploadFile.size)}
                      </span>
                    )}
                  </label>

                  <label className="contracts-modal__label">
                    Name
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="e.g. Partnership Operating Agreement"
                      disabled={uploading}
                      required
                    />
                  </label>

                  <label className="contracts-modal__label">
                    Category <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                    <input
                      type="text"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      placeholder="e.g. Partnership, NDA, Operating"
                      disabled={uploading}
                    />
                  </label>

                  <label className="contracts-modal__label">
                    Description <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                    <textarea
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={3}
                      placeholder="Short note about what this contract covers"
                      disabled={uploading}
                    />
                  </label>

                  {uploadError && <Callout color="red">{uploadError}</Callout>}

                  <div className="contracts-modal__footer">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setUploadOpen(false); resetUploadForm(); }}
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={uploading || !uploadFile || !uploadName.trim()}
                    >
                      {uploading ? 'Uploading…' : 'Upload'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete confirmation modal — admin only */}
          {pendingDeleteId && isAdmin && (
            <div className="contracts-modal-backdrop" onClick={() => { if (!deleting) setPendingDeleteId(null); }}>
              <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
                <div className="contracts-modal__header">
                  <h3 style={{ margin: 0 }}>Delete contract?</h3>
                </div>
                <div className="contracts-modal__body">
                  <p>
                    This permanently removes the file and its metadata. The partners
                    will no longer see this contract.
                  </p>
                  <div className="contracts-modal__footer">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setPendingDeleteId(null)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                      style={{ background: 'var(--miss)' }}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Toast
            open={!!toast}
            color={toast?.color || 'green'}
            onClose={() => setToast(null)}
          >
            {toast?.text}
          </Toast>
        </div>
      </div>
    </div>
  );
}
