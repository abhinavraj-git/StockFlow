import { useEffect, useState } from "react";
import { getAuthHeaders } from "../api";

function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("http://localhost:5050/api/users", {
          headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message);
        }

        setUsers(data);
      } catch (error) {
        console.error("Could not load users:", error);
      }
    };

    loadUsers();
  }, []);

  const updateRole = async (userId, role) => {
    try {
      const response = await fetch(
        `http://localhost:5050/api/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ role }),
        }
      );

      const updatedUser = await response.json();

      if (!response.ok) {
        throw new Error(updatedUser.message);
      }

      setUsers((currentUsers) => {
        return currentUsers.map((user) => {
          return user._id === updatedUser._id ? updatedUser : user;
        });
      });
    } catch (error) {
      alert(error.message || "Could not update role.");
    }
  };

  return (
    <section className="users-section">
      <h2>Users</h2>

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <article className="user-item" key={user._id}>
              <div>
                <strong>{user.name}</strong>
                <p>{user.email}</p>
              </div>

              {user._id === currentUser.id ? (
                <span className={`role-badge ${user.role}`}>
                  {user.role}
                </span>
              ) : (
                <select
                  className="role-select"
                  value={user.role}
                  onChange={(event) => updateRole(user._id, event.target.value)}
                >
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserManagement;