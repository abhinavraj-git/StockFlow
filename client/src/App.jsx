import { useEffect, useState } from "react";
import "./App.css";
import ProductForm from "./components/ProductForm";
import StockControls from "./components/StockControls";
import TransactionHistory from "./components/TransactionHistory";
import EditProductForm from "./components/EditProductForm";
import AuthPage from "./components/AuthPage";
import { getAuthHeaders } from "./api";
import UserManagement from "./components/UserManagement";

const API_URL = "http://localhost:5050/api/products";

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

  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      setProducts(data);
    } catch (error) {
      console.error("Could not load products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return undefined;

    const loadTimer = window.setTimeout(() => {
      loadProducts();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [currentUser]);

  const totalUnits = products.reduce((total, product) => {
    return total + product.quantity;
  }, 0);

  const lowStockProducts = products.filter((product) => {
    return product.quantity <= product.reorderLevel;
  });

  const handleStockUpdated = () => {
    loadProducts();

    setTransactionRefresh((currentValue) => {
      return currentValue + 1;
    });
  };

  const categories = [
    ...new Set(products.map((product) => product.category)),
  ].sort();

  const filteredProducts = products.filter((product) => {
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query);

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    const matchesLowStock =
      !showLowStock || product.quantity <= product.reorderLevel;

    return matchesSearch && matchesCategory && matchesLowStock;
  });
  const handleDelete = async (productId) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this product?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5050/api/products/${productId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      loadProducts();
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

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const totalInventoryValue = products.reduce((total, product) => {
    return total + product.price * product.quantity;
  }, 0);

  const exportProducts = () => {
    const rows = [
      ["Name", "SKU", "Category", "Quantity", "Reorder Level", "Price"],

      ...filteredProducts.map((product) => [
        product.name,
        product.sku,
        product.category,
        product.quantity,
        product.reorderLevel,
        product.price,
      ]),
    ];

    const csvContent = rows
      .map((row) => {
        return row
          .map((value) => {
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
          })
          .join(",");
      })
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
  };

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <a className="brand" href="#dashboard" aria-label="StockFlow dashboard">
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
              {currentUser.name} <span className="profile-role">({currentUser.role})</span><span className="chevron">⌄</span>
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
          <h2>{products.length}</h2>
        </article>

        <article className="stat-card">
          <p>Total Units</p>
          <h2>{totalUnits}</h2>
        </article>

        <article className="stat-card low-stock-card">
          <p>Low Stock</p>
          <h2>{lowStockProducts.length}</h2>
        </article>
        <article className="stat-card">
          <p>Inventory Value</p>
          <h2>₹{totalInventoryValue.toLocaleString("en-IN")}</h2>
        </article>
      </section>

      {currentUser.role === "admin" && (
        <ProductForm onProductAdded={loadProducts} />
      )}

      <section className="product-section" id="products">
        <div className="section-heading">
          <h2>Products</h2>

          <div className="product-tools">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, SKU, or category"
            />
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
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
              onClick={() => setShowLowStock(!showLowStock)}
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
            <button onClick={loadProducts}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <p>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p>No products found.</p>
        ) : (
          <div className="product-list">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product._id}>
                <div className="product-card-heading">
                  <div>
                    <h3>{product.name}</h3>
                    <p className="product-sku">SKU · {product.sku}</p>
                  </div>
                  {product.quantity <= product.reorderLevel && <span className="low-stock-badge">Low stock</span>}
                </div>
                <dl className="product-details">
                  <div><dt>Category</dt><dd>{product.category}</dd></div>
                  <div><dt>In stock</dt><dd>{product.quantity} units</dd></div>
                  <div><dt>Reorder at</dt><dd>{product.reorderLevel} units</dd></div>
                  <div><dt>Unit price</dt><dd>₹{Number(product.price).toLocaleString("en-IN")}</dd></div>
                </dl>
                <div className="product-card-controls">
                  <p className="control-label">Adjust stock</p>
                  <StockControls productId={product._id} onStockUpdated={handleStockUpdated} />
                </div>
                {currentUser.role === "admin" && (
                  <div className="product-actions">
                    <button className="edit-button" onClick={() => setEditingProduct(product)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDelete(product._id)}>Delete</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <div id="activity"><TransactionHistory refreshKey={transactionRefresh} /></div>
      {currentUser.role === "admin" && (
        <div id="users"><UserManagement currentUser={currentUser} /></div>
      )}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={() => {
            loadProducts();
            setEditingProduct(null);
          }}
        />
      )}
      </main>
      <footer className="app-footer">
        <div className="footer-socials" aria-label="Social links">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">◎</a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
          <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">𝕏</a>
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
