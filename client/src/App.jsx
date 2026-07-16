import { useCallback, useEffect, useState } from "react";
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
    const savedUser = localStorage.getItem("stockflow_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
            <span className="brand-mark">S</span>
            <span>StockFlow</span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#dashboard">Dashboard</a>
            <a href="#products">Products</a>
            <a href="#activity">Activity</a>
            {currentUser.role === "admin" && <a href="#users">Users</a>}
          </nav>
          <div className="profile-menu">
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-expanded={isProfileOpen}
            >
              {currentUser.name}{" "}
              <span className="profile-role">({currentUser.role})</span>
              <span className="chevron">⌄</span>
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <p>{currentUser.name}</p>
                <span>{currentUser.role}</span>
                <button onClick={handleLogout}>Logout</button>
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
            <p className="loading-message">Loading products...</p>
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
