export const getAuthHeaders = () => {
  const token = localStorage.getItem("stockflow_token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};