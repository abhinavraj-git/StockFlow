import { useState } from "react";
import { getAuthHeaders } from "../api";

function StockControls({ productId, onStockUpdated }) {
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `http://localhost:5050/api/products/${productId}/stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            type,
            quantity: Number(quantity),
            note,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setQuantity("");
      setNote("");
      setMessage("Stock updated.");
      onStockUpdated();
    } catch (error) {
      setMessage(error.message || "Could not update stock.");
    }
  };

  return (
    <form className="stock-controls" onSubmit={handleSubmit}>
      <select value={type} onChange={(event) => setType(event.target.value)}>
        <option value="IN">Stock In</option>
        <option value="OUT">Stock Out</option>
      </select>

      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        placeholder="Amount"
        required
      />

      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Note (optional)"
      />

      <button type="submit">Update</button>

      {message && <small>{message}</small>}
    </form>
  );
}

export default StockControls;
