import { useState } from "react";
import { getAuthHeaders } from "../api";

const emptyProduct = {
  name: "",
  sku: "",
  category: "",
  quantity: "",
  price: "",
  reorderLevel: "5",
  initialStockNote: "",
};

function ProductForm({ onProductAdded }) {
  const [form, setForm] = useState(emptyProduct);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          price: Number(form.price),
          reorderLevel: Number(form.reorderLevel),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setForm(emptyProduct);
      setMessage("Product added successfully.");
      onProductAdded();
    } catch (error) {
      setMessage(error.message || "Could not add product.");
    }
  };

  return (
    <section className="add-product">
      <h2>Add Product</h2>

      <form onSubmit={handleSubmit}>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Product name"
          required
        />

        <input
          name="sku"
          value={form.sku}
          onChange={handleChange}
          placeholder="SKU"
          required
        />

        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Category"
          required
        />

        <input
          name="quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Quantity"
          required
        />

        <input
          name="reorderLevel"
          type="number"
          min="0"
          value={form.reorderLevel}
          onChange={handleChange}
          placeholder="Reorder level"
          required
        />

        <input
          name="price"
          type="number"
          min="0"
          value={form.price}
          onChange={handleChange}
          placeholder="Price"
          required
        />

        <input
          name="initialStockNote"
          value={form.initialStockNote}
          onChange={handleChange}
          placeholder="Initial stock note (optional)"
        />

        <button type="submit">Add Product</button>
      </form>

      {message && <p>{message}</p>}
    </section>
  );
}

export default ProductForm;
