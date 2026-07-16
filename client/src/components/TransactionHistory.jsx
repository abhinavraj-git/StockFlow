import { useEffect, useState } from "react";
import { getAuthHeaders } from "../api";

function TransactionHistory({ refreshKey }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const response = await fetch("http://localhost:5050/api/transactions", {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Could not load transactions:", error);
      }
    };

    loadTransactions();
  }, [refreshKey]);

  return (
    <section className="history-section">
      <h2>Recent Stock Activity</h2>

      {transactions.length === 0 ? (
        <p>No stock activity yet.</p>
      ) : (
        <div className="transaction-list">
          {transactions.map((transaction) => (
            <article className="transaction-item" key={transaction._id}>
              <div>
                <strong>
                  {transaction.product?.name || "Deleted product"}
                </strong>
                <p>{transaction.product?.sku}</p>
                {transaction.note && (
                  <p className="transaction-note">{transaction.note}</p>
                )}
                <p>By: {transaction.performedBy?.name || "Unknown user"}</p>
              </div>

              <div>
                <span className={transaction.type === "IN" ? "in" : "out"}>
                  {transaction.type === "IN" ? "+" : "-"}
                  {transaction.quantity}
                </span>
                <p>{new Date(transaction.createdAt).toLocaleString("en-IN")}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default TransactionHistory;
