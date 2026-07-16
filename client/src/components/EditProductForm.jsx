import { useState } from "react";
import { getAuthHeaders } from "../api";

function EditProductForm({ product, onClose, onProductUpdated }) {
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    reorderLevel: product.reorderLevel,
    description: product.description || "",
  });

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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products/${product._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            ...form,
            price: Number(form.price),
            reorderLevel: Number(form.reorderLevel),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      onProductUpdated();
    } catch (error) {
      alert(error.message || "Could not update product.");
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="edit-modal">
        <h2>Edit Product</h2>

        <form className="edit-form" onSubmit={handleSubmit}>
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
            name="price"
            type="number"
            min="0"
            value={form.price}
            onChange={handleChange}
            placeholder="Price"
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

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Description (optional)"
          />

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit">Save Changes</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default EditProductForm;
