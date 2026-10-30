import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import ProductForm from "./components/ProductForm";
import StockControls from "./components/StockControls";
import TransactionHistory from "./components/TransactionHistory";
import EditProductForm from "./components/EditProductForm";
import AuthPage from "./components/AuthPage";
import { getAuthHeaders } from "./api";
import UserManagement from "./components/UserManagement";

const API_URL = `${import.meta.env.VITE_API_URL}/api/products`;
const PRODUCTS_PER_PAGE = 8;

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("stockflow_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("stockflow_user");
      localStorage.removeItem("stockflow_token");
      return null;
    }
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PRODUCTS_PER_PAGE,
    totalProducts: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalUnits: 0,
    lowStockCount: 0,
    inventoryValue: 0,
  });

  const buildProductParams = useCallback(
    (pageNumber = currentPage, limit = PRODUCTS_PER_PAGE) => {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: String(limit),
      });

      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (showLowStock) params.set("lowStock", "true");

      return params;
    },
    [currentPage, searchTerm, selectedCategory, showLowStock],
  );

  const loadProducts = useCallback(
    async (pageNumber = currentPage) => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}?${buildProductParams(pageNumber)}`,
          {
            headers: getAuthHeaders(),
          },
        );
        const data = await response.json();

        if (!response.ok)
          throw new Error(data.message || "Could not load products.");

        setProducts(data.products || []);
        setPagination(data.pagination);
        setSummary(data.summary);
        setCategories(data.categories || []);
      } catch (error) {
        console.error("Could not load products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    [buildProductParams, currentPage],
  );

  useEffect(() => {
    if (!currentUser) return undefined;

    const loadTimer = window.setTimeout(
      () => {
        loadProducts(currentPage);
      },
      searchTerm ? 300 : 0,
    );

    return () => window.clearTimeout(loadTimer);
  }, [currentUser, currentPage, searchTerm, loadProducts]);

  const resetToFirstPage = (callback) => {
    callback();
    setCurrentPage(1);
  };

  const handleStockUpdated = () => {
    loadProducts(currentPage);
    setTransactionRefresh((currentValue) => currentValue + 1);
  };

  const handleProductAdded = () => {
    setCurrentPage(1);
    loadProducts(1);
    setTransactionRefresh((currentValue) => currentValue + 1);
  };

  const handleDelete = async (productId) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this product?",
    );
    if (!shouldDelete) return;

    try {
      const response = await fetch(`${API_URL}/${productId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      if (products.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        loadProducts(currentPage);
      }
      setTransactionRefresh((currentValue) => currentValue + 1);
    } catch (error) {
      alert(error.message || "Could not delete product.");
    }
  };

  const handleLogin = (session) => {
    localStorage.setItem("stockflow_token", session.token);
    localStorage.setItem("stockflow_user", JSON.stringify(session.user));
    setCurrentUser(session.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("stockflow_token");
    localStorage.removeItem("stockflow_user");
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!isProfileOpen) return;

    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const exportProducts = async () => {
    try {
      const response = await fetch(
        `${API_URL}?${buildProductParams(1, 1000)}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Could not export products.");

      const rows = [
        ["Name", "SKU", "Category", "Quantity", "Reorder Level", "Price"],
        ...data.products.map((product) => [
          product.name,
          product.sku,
          product.category,
          product.quantity,
          product.reorderLevel,
          product.price,
        ]),
      ];
      const csvContent = rows
        .map((row) =>
          row
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\r\n");
      const file = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "stockflow-products.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || "Could not export products.");
    }
  };

  const visiblePages = Array.from(
    { length: Math.min(3, pagination.totalPages) },
    (_, index) => {
      const start = Math.min(
        Math.max(currentPage - 1, 1),
        Math.max(pagination.totalPages - 2, 1),
      );
      return start + index;
    },
  );

  if (!currentUser) return <AuthPage onLogin={handleLogin} />;

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <a
            className="brand"
            href="#dashboard"
            aria-label="StockFlow dashboard"
          >
            <div className="brand-logo-wrap" aria-hidden="true">
              <svg
                className="brand-logo-icon"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="sf-grad"
                    x1="0"
                    y1="0"
                    x2="32"
                    y2="32"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                </defs>
                <rect width="32" height="32" rx="9" fill="url(#sf-grad)" />
                {/* 3D Isometric Inventory Box with dynamic flow */}
                <path
                  d="M16 6.5L25 11.2L16 15.9L7 11.2L16 6.5Z"
                  fill="#ffffff"
                  fillOpacity="0.95"
                />
                <path
                  d="M7 11.2L16 15.9V25.2L7 20.5V11.2Z"
                  fill="#bfdbfe"
                  fillOpacity="0.9"
                />
                <path
                  d="M16 15.9L25 11.2V20.5L16 25.2V15.9Z"
                  fill="#93c5fd"
                />
                <path
                  d="M16 15.9V24.8"
                  stroke="#1d4ed8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 9L16 6.8L20 9"
                  stroke="#2563eb"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="brand-text">
              Stock<span className="brand-accent">Flow</span>
            </span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#dashboard">Dashboard</a>
            <a href="#products">Products</a>
            <a href="#activity">Activity</a>
            {currentUser.role === "admin" && <a href="#users">Users</a>}
          </nav>
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              type="button"
              className={`profile-trigger ${isProfileOpen ? "is-active" : ""}`}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              aria-label="User account menu"
            >
              <div className="profile-avatar" aria-hidden="true">
                <svg
                  className="person-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="profile-meta">
                <span className="profile-name">{currentUser.name}</span>
                <span
                  className={`profile-badge role-${currentUser.role?.toLowerCase()}`}
                >
                  {currentUser.role}
                </span>
              </div>
              <svg
                className={`profile-chevron ${isProfileOpen ? "open" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown" role="menu">
                <div className="dropdown-user-header">
                  <div className="dropdown-avatar" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="dropdown-meta">
                    <p className="dropdown-name">{currentUser.name}</p>
                    {currentUser.email && (
                      <p className="dropdown-email">{currentUser.email}</p>
                    )}
                    <span
                      className={`dropdown-role-pill role-${currentUser.role?.toLowerCase()}`}
                    >
                      <span className="role-dot" aria-hidden="true" />
                      {currentUser.role === "admin"
                        ? "Administrator"
                        : "Staff Member"}
                    </span>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-logout-btn"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="page" id="dashboard">
        <section className="dashboard-intro">
          <p className="label">INVENTORY MANAGEMENT</p>
          <h1>Dashboard</h1>
          <p>Keep track of your products and stock levels.</p>
        </section>

        <section className="stats">
          <article className="stat-card">
            <p>Total Products</p>
            <h2>{summary.totalProducts}</h2>
          </article>
          <article className="stat-card">
            <p>Total Units</p>
            <h2>{summary.totalUnits}</h2>
          </article>
          <article className="stat-card low-stock-card">
            <p>Low Stock</p>
            <h2>{summary.lowStockCount}</h2>
          </article>
          <article className="stat-card">
            <p>Inventory Value</p>
            <h2>₹{Number(summary.inventoryValue).toLocaleString("en-IN")}</h2>
          </article>
        </section>

        {currentUser.role === "admin" && (
          <ProductForm onProductAdded={handleProductAdded} />
        )}

        <section className="product-section" id="products">
          <div className="section-heading">
            <div>
              <h2>Products</h2>
              <p className="section-subtitle">
                {pagination.totalProducts} matching product
                {pagination.totalProducts === 1 ? "" : "s"}
              </p>
            </div>
            <div className="product-tools">
              <input
                value={searchTerm}
                onChange={(event) =>
                  resetToFirstPage(() => setSearchTerm(event.target.value))
                }
                placeholder="Search name, SKU, or category"
              />
              <select
                value={selectedCategory}
                onChange={(event) =>
                  resetToFirstPage(() =>
                    setSelectedCategory(event.target.value),
                  )
                }
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={
                  showLowStock ? "filter-button active" : "filter-button"
                }
                onClick={() =>
                  resetToFirstPage(() => setShowLowStock(!showLowStock))
                }
              >
                Low Stock Only
              </button>
              <button
                type="button"
                className="export-button"
                onClick={exportProducts}
              >
                Export CSV
              </button>
              <button type="button" onClick={() => loadProducts(currentPage)}>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="products-loading-state" aria-live="polite">
              <div className="loading-badge">
                <span className="spinner-circle" aria-hidden="true"></span>
                <span>Loading products...</span>
              </div>
              <div className="product-list">
                {Array.from({ length: 4 }).map((_, index) => (
                  <article className="product-card skeleton-card" key={index}>
                    <div className="product-card-heading">
                      <div style={{ flex: 1 }}>
                        <div className="skeleton-line skeleton-title"></div>
                        <div className="skeleton-line skeleton-sku"></div>
                      </div>
                      <div className="skeleton-line skeleton-badge"></div>
                    </div>
                    <div className="skeleton-details">
                      <div className="skeleton-detail-item">
                        <div className="skeleton-line skeleton-label"></div>
                        <div className="skeleton-line skeleton-value"></div>
                      </div>
                      <div className="skeleton-detail-item">
                        <div className="skeleton-line skeleton-label"></div>
                        <div className="skeleton-line skeleton-value"></div>
                      </div>
                      <div className="skeleton-detail-item">
                        <div className="skeleton-line skeleton-label"></div>
                        <div className="skeleton-line skeleton-value"></div>
                      </div>
                      <div className="skeleton-detail-item">
                        <div className="skeleton-line skeleton-label"></div>
                        <div className="skeleton-line skeleton-value"></div>
                      </div>
                    </div>
                    <div className="skeleton-controls">
                      <div className="skeleton-line skeleton-control-label"></div>
                      <div className="skeleton-line skeleton-control-input"></div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : products.length === 0 ? (
            <p className="empty-message">
              No products found for these filters.
            </p>
          ) : (
            <div className="product-list">
              {products.map((product) => (
                <article className="product-card" key={product._id}>
                  <div className="product-card-heading">
                    <div>
                      <h3>{product.name}</h3>
                      <p className="product-sku">SKU · {product.sku}</p>
                    </div>
                    {product.quantity <= product.reorderLevel && (
                      <span className="low-stock-badge">Low stock</span>
                    )}
                  </div>
                  <dl className="product-details">
                    <div>
                      <dt>Category</dt>
                      <dd>{product.category}</dd>
                    </div>
                    <div>
                      <dt>In stock</dt>
                      <dd>{product.quantity} units</dd>
                    </div>
                    <div>
                      <dt>Reorder at</dt>
                      <dd>{product.reorderLevel} units</dd>
                    </div>
                    <div>
                      <dt>Unit price</dt>
                      <dd>₹{Number(product.price).toLocaleString("en-IN")}</dd>
                    </div>
                  </dl>
                  <div className="product-card-controls">
                    <p className="control-label">Adjust stock</p>
                    <StockControls
                      productId={product._id}
                      onStockUpdated={handleStockUpdated}
                    />
                  </div>
                  {currentUser.role === "admin" && (
                    <div className="product-actions">
                      <button
                        className="edit-button"
                        onClick={() => setEditingProduct(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(product._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="pagination" aria-label="Product pagination">
              <p>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.totalProducts,
                )}{" "}
                of {pagination.totalProducts}
              </p>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-button"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => setCurrentPage((page) => page - 1)}
                >
                  Previous
                </button>
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={
                      page === pagination.page
                        ? "pagination-button current-page"
                        : "pagination-button"
                    }
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="pagination-button"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setCurrentPage((page) => page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        <div id="activity">
          <TransactionHistory refreshKey={transactionRefresh} />
        </div>
        {currentUser.role === "admin" && (
          <div id="users">
            <UserManagement currentUser={currentUser} />
          </div>
        )}
        {editingProduct && (
          <EditProductForm
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onProductUpdated={() => {
              loadProducts(currentPage);
              setEditingProduct(null);
            }}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-socials" aria-label="Social links">
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
          >
            f
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
          >
            ◎
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
          >
            in
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noreferrer"
            aria-label="X"
          >
            𝕏
          </a>
        </div>
        <p>© {new Date().getFullYear()} StockFlow</p>
        <div className="footer-links">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </footer>
    </>
  );
}

export default App;
