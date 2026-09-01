import { useEffect, useState } from "react";
import api from "../api";
import { Link } from "react-router";

interface Product {
  id: number;
  name: string;
  description: string;
  quantity: number;
  category: number;
  category_name: string;
  category_path: string;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(count / 10));

  useEffect(() => {
    const msg = sessionStorage.getItem("import_success");
    if (msg) {
      setSuccess(msg);
      sessionStorage.removeItem("import_success");
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get<Paginated<Product> | Product[]>(`products/?page=${page}`)
      .then((res) => {
        if (cancelled) return;
        const data: any = res.data;
        // handle both paginated and non-paginated (if PAGE_SIZE not applied yet)
        if (Array.isArray(data)) {
          setProducts(data);
          setCount(data.length);
        } else {
          setProducts(data.results ?? []);
          setCount(data.count ?? 0);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.detail || "Failed to load catalog.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-eyebrow">Catalog • Library</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title">Your products</h1>
            <p className="page-desc">
              All imported products for your workspace. Pagination 10 per page. Data is private to your account.
            </p>
          </div>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 8 }}>
            Import more
          </Link>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      <div className="table-card">
        <div className="table-head">
          <div>
            <h3>Products</h3>
            <p>
              {count === 0 ? "No products yet" : `${count} total • page ${page} of ${totalPages} • 10 per page`}
            </p>
          </div>
          <div className="small muted" style={{ fontVariantNumeric: "tabular-nums" }}>{count} items</div>
        </div>

        {loading ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <div className="spinner dark" style={{ margin: "0 auto" }} />
            <p className="small muted" style={{ marginTop: 12 }}>
              Loading catalog…
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="dz-icon" style={{ margin: "0 auto" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M9 9h6M9 15h6" />
              </svg>
            </div>
            <h4>No products yet</h4>
            <p>Import an Excel file to see products here. Your data is scoped to your account.</p>
            <Link to="/" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
              Go to Import
            </Link>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Category path</th>
                    <th style={{ width: 110 }}>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-faint)", fontVariantNumeric: "tabular-nums" }}>#{p.id}</td>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td style={{ color: "var(--text-soft)", maxWidth: 300, whiteSpace: "normal" }}>{p.description || <span className="muted">—</span>}</td>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5, color: "var(--text-soft)", whiteSpace: "normal" }}>
                        {p.category_path || p.category_name || <span className="muted">—</span>}
                      </td>
                      <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-actions" style={{ justifyContent: "space-between" }}>
              <div className="small muted">
                Page {page} of {totalPages} • <strong style={{ color: "var(--text)" }}>{count}</strong> total
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Previous
                </button>
                <span className="small muted" style={{ minWidth: 72, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                  {page} / {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="small muted" style={{ marginTop: 12, textAlign: "center" }}>
        Showing 10 per page • newest last • scoped to your account only
      </p>
    </div>
  );
}
