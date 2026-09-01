import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import api from "../api";

interface PreviewRow {
  row_index: number;
  name: string;
  description: string;
  category_path: string;
  quantity: number | null;
  errors: string[];
}

type EditableField = "name" | "description" | "category_path" | "quantity";

function computeErrors(row: PreviewRow): string[] {
  const errs: string[] = [];
  const name = (row.name ?? "").trim();
  if (!name || name.toLowerCase() === "nan") errs.push("Missing product name.");
  const cp = (row.category_path ?? "").trim();
  if (!cp || cp.toLowerCase() === "nan") errs.push("Missing category path");
  const q = row.quantity;
  if (q === null || q === undefined) {
    errs.push("Invalid quantity");
  } else if (typeof q === "number") {
    if (!Number.isFinite(q) || !Number.isInteger(q)) errs.push("Invalid quantity");
    else if (q < 0) errs.push("Quantity cannot be negative.");
  } else {
    errs.push("Invalid quantity");
  }
  return errs;
}

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // inline editing
  const [editing, setEditing] = useState<{ row: number; field: EditableField } | null>(null);
  const [draft, setDraft] = useState("");

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.length - validCount;

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setResult({ type: "error", text: "Please upload a .xlsx or .xls file." });
      return;
    }
    setFile(f);
    setRows([]);
    setSelected(new Set());
    setResult(null);
    setEditing(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0] || null;
    if (f) handleFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setRows([]);
    setSelected(new Set());
    setResult(null);
    setEditing(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handlePreview = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setResult(null);
    setEditing(null);
    api
      .post("upload-preview/", formData)
      .then((res) => {
        const fetched: PreviewRow[] = res.data.rows;
        setRows(fetched);
        const validIndexes = fetched.filter((r) => r.errors.length === 0).map((r) => r.row_index);
        setSelected(new Set(validIndexes));
        if (validIndexes.length === 0 && fetched.length > 0) {
          setResult({ type: "error", text: `${fetched.length} rows parsed — all have errors. Click any cell to fix inline.` });
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.response?.data?.detail || JSON.stringify(err.response?.data) || "Failed to preview file";
        setResult({ type: "error", text: String(msg) });
      })
      .finally(() => setLoading(false));
  };

  const toggleRow = (index: number) => {
    const row = rows.find((r) => r.row_index === index);
    if (!row || row.errors.length > 0) return;
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const toggleAll = () => {
    const valid = rows.filter((r) => r.errors.length === 0).map((r) => r.row_index);
    if (selected.size === valid.length) setSelected(new Set());
    else setSelected(new Set(valid));
  };

  const handleCommit = () => {
    const rowsToCommit = rows.filter((r) => selected.has(r.row_index));
    if (rowsToCommit.length === 0) {
      setResult({ type: "error", text: "No rows selected for import." });
      return;
    }
    setCommitting(true);
    setResult(null);
    api
      .post("upload-commit/", { selected_rows: rowsToCommit })
      .then((res) => {
        const c = res.data.created.length;
        // store success hint for catalog page
        sessionStorage.setItem("import_success", `Successfully imported ${c} product${c === 1 ? "" : "s"}.`);
        navigate("/catalog");
      })
      .catch((err) => {
        const data = err.response?.data;
        const msg = data?.error ? `${data.error}${data.row_errors ? ` — ${data.row_errors.length} row(s) invalid.` : ""}` : JSON.stringify(data);
        setResult({ type: "error", text: msg || "Import failed." });
      })
      .finally(() => setCommitting(false));
  };

  // inline edit helpers
  const startEdit = (row_index: number, field: EditableField, current: string | number | null) => {
    setEditing({ row: row_index, field });
    if (field === "quantity") setDraft(current === null || current === undefined ? "" : String(current));
    else setDraft((current as string) ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  const saveEdit = () => {
    if (!editing) return;
    const { row: rid, field } = editing;
    const raw = draft;
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.row_index !== rid) return r;
        const copy: PreviewRow = { ...r };
        if (field === "quantity") {
          const trimmed = raw.trim();
          if (trimmed === "") copy.quantity = null;
          else {
            const n = Number(trimmed);
            if (Number.isFinite(n)) copy.quantity = n;
            else copy.quantity = null;
          }
        } else if (field === "name") copy.name = raw;
        else if (field === "description") copy.description = raw;
        else if (field === "category_path") copy.category_path = raw;
        copy.errors = computeErrors(copy);
        return copy;
      });
      // update selection only for edited row, preserve others
      const edited = next.find((r) => r.row_index === rid);
      if (edited) {
        setSelected((prevSel) => {
          const ns = new Set(prevSel);
          if (edited.errors.length === 0) ns.add(rid);
          else ns.delete(rid);
          return ns;
        });
      }
      return next;
    });
    setEditing(null);
    setDraft("");
  };

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-eyebrow">Catalog • Import</div>
        <h1 className="page-title">Import products</h1>
        <p className="page-desc">
          Upload an Excel file with <strong>name</strong>, <strong>category</strong>, <strong>description</strong> and <strong>quantity</strong>. Preview, fix any row inline, then import the clean rows. Table only — edits happen right here.
        </p>
      </div>

      {/* Upload Card */}
      <div className="card card-pad" style={{ padding: 20 }}>
        <div
          className={`dropzone ${dragOver ? "is-dragover" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current?.click()}
          style={{ cursor: file ? "default" : "pointer" }}
        >
          <div className="dz-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <polyline points="9 15 12 12 15 15" />
            </svg>
          </div>

          {!file ? (
            <>
              <div>
                <div className="dz-title">Drop your Excel file here</div>
                <div className="dz-sub">
                  or <strong>browse</strong> • supports .xlsx, .xls • max 5MB
                </div>
              </div>
              <div className="dz-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  Browse files
                </button>
                <span className="small muted" style={{ alignSelf: "center" }}>
                  or drag & drop
                </span>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="dz-title" style={{ fontSize: 14 }}>
                  Ready to preview
                </div>
                <div className="dz-sub">We’ll validate rows and highlight issues. Click any cell to fix.</div>
              </div>
              <div className="file-pill">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--success)", display: "inline-block" }} />
                  <b>{file.name}</b>
                  <span className="small muted">· {(file.size / 1024).toFixed(1)} KB</span>
                </span>
                <button type="button" onClick={clearFile} aria-label="Remove file">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </>
          )}

          <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="file-input-hidden" />
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap" }}>
          <div className="small muted">
            Expected columns: <span style={{ color: "var(--text)", fontWeight: 500 }}>name</span>,{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>category</span> <span className="muted">(| separated)</span>,{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>description</span>,{" "}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>quantity</span>
          </div>
          <button onClick={handlePreview} disabled={!file || loading} className="btn btn-primary" style={{ minWidth: 132 }}>
            {loading ? (
              <>
                <span className="spinner" /> Parsing…
              </>
            ) : (
              "Preview file"
            )}
          </button>
        </div>

        {result && (
          <div className={`alert ${result.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginTop: 16 }}>
            <span style={{ marginTop: 1 }}>
              {result.type === "success" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </span>
            <span>{result.text}</span>
          </div>
        )}
      </div>

      {/* Preview Table — editable */}
      {rows.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="stats">
            <div className="stat">
              <div className="stat-label">Total rows</div>
              <div className="stat-value">{rows.length}</div>
              <div className="stat-hint">From your spreadsheet</div>
            </div>
            <div className="stat">
              <div className="stat-label">Ready to import</div>
              <div className="stat-value" style={{ color: "var(--success)" }}>{validCount}</div>
              <div className="stat-hint">{validCount === 0 ? "Fix errors inline" : `${validCount} selected`}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Needs attention</div>
              <div className="stat-value" style={{ color: errorCount ? "var(--danger)" : "var(--text-faint)" }}>{errorCount}</div>
              <div className="stat-hint">{errorCount ? "Click cell to edit" : "No issues"}</div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-head">
              <div>
                <h3>Preview — click any cell to edit</h3>
                <p>
                  {rows.length} rows • {selected.size} selected • edits validate instantly
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-soft)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="checkbox-wrap"
                    checked={validCount > 0 && selected.size === validCount}
                    onChange={toggleAll}
                    disabled={validCount === 0}
                  />
                  {selected.size === validCount ? "Deselect all" : "Select all valid"}
                </label>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        className="checkbox-wrap"
                        checked={validCount > 0 && selected.size === validCount}
                        onChange={toggleAll}
                        disabled={validCount === 0}
                      />
                    </th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Category path</th>
                    <th>Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isError = row.errors.length > 0;
                    const checked = selected.has(row.row_index);
                    const isEditingName = editing?.row === row.row_index && editing.field === "name";
                    const isEditingDesc = editing?.row === row.row_index && editing.field === "description";
                    const isEditingCat = editing?.row === row.row_index && editing.field === "category_path";
                    const isEditingQty = editing?.row === row.row_index && editing.field === "quantity";
                    return (
                      <tr key={row.row_index} className={isError ? "row-error" : ""}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            className="checkbox-wrap"
                            checked={checked}
                            disabled={isError}
                            onChange={() => toggleRow(row.row_index)}
                          />
                        </td>

                        {/* Name */}
                        <td style={{ padding: 6 }}>
                          {isEditingName ? (
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="input"
                              style={{ height: 34, fontSize: 13.5, padding: "0 10px" }}
                              placeholder="Product name"
                            />
                          ) : (
                            <div
                              onClick={() => startEdit(row.row_index, "name", row.name)}
                              style={{
                                fontWeight: 500,
                                cursor: "text",
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid transparent",
                                minHeight: 28,
                                display: "flex",
                                alignItems: "center",
                              }}
                              className="editable"
                              title="Click to edit"
                            >
                              {row.name || <span className="muted">— empty</span>}
                            </div>
                          )}
                        </td>

                        {/* Description */}
                        <td style={{ padding: 6 }}>
                          {isEditingDesc ? (
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="input"
                              style={{ height: 34, fontSize: 13.5, padding: "0 10px" }}
                              placeholder="Optional"
                            />
                          ) : (
                            <div
                              onClick={() => startEdit(row.row_index, "description", row.description)}
                              style={{
                                color: "var(--text-soft)",
                                cursor: "text",
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid transparent",
                                minHeight: 28,
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Click to edit"
                            >
                              {row.description || <span className="muted">—</span>}
                            </div>
                          )}
                        </td>

                        {/* Category path */}
                        <td style={{ padding: 6 }}>
                          {isEditingCat ? (
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="input"
                              style={{ height: 34, fontFamily: "ui-monospace, monospace", fontSize: 12.5, padding: "0 10px" }}
                              placeholder="e.g. Men Wear | Top | T-shirt"
                            />
                          ) : (
                            <div
                              onClick={() => startEdit(row.row_index, "category_path", row.category_path)}
                              style={{
                                fontFamily: "ui-monospace, monospace",
                                fontSize: 12.5,
                                color: row.category_path ? "var(--text-soft)" : "var(--text-faint)",
                                cursor: "text",
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid transparent",
                                minHeight: 28,
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Click to edit — use | to nest"
                            >
                              {row.category_path || <span className="muted">— empty</span>}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td style={{ padding: 6 }}>
                          {isEditingQty ? (
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEdit();
                                if (e.key === "Escape") cancelEdit();
                              }}
                              className="input"
                              style={{ height: 34, fontSize: 13.5, padding: "0 10px", fontVariantNumeric: "tabular-nums" }}
                              placeholder="0"
                              inputMode="numeric"
                            />
                          ) : (
                            <div
                              onClick={() => startEdit(row.row_index, "quantity", row.quantity)}
                              style={{
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 500,
                                cursor: "text",
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid transparent",
                                minHeight: 28,
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Click to edit"
                            >
                              {row.quantity ?? <span className="muted">—</span>}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "6px 12px" }}>
                          {isError ? (
                            <span className="badge badge-error" title={row.errors.join(", ")}>
                              {row.errors[0]}
                            </span>
                          ) : (
                            <span className="badge badge-ok">Valid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-actions">
              <div className="selection-meta">
                <strong>{selected.size}</strong> of <strong>{validCount}</strong> valid selected
                <span className="muted" style={{ marginLeft: 8 }}>• click cell to fix errors</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn btn-secondary" onClick={clearFile} disabled={committing}>
                  Clear
                </button>
                <button onClick={handleCommit} disabled={committing || selected.size === 0} className="btn btn-primary">
                  {committing ? (
                    <>
                      <span className="spinner" /> Importing…
                    </>
                  ) : (
                    `Import ${selected.size} ${selected.size === 1 ? "product" : "products"}`
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="small muted" style={{ marginTop: 12, textAlign: "center" }}>
            Edits are in-memory only — original Excel unchanged. Press <strong>Enter</strong> to save, <strong>Esc</strong> to cancel. Import is atomic.
          </p>
        </div>
      )}
    </div>
  );
}
