import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // send the httpOnly cookie with every request
});

// Turn any failed request into a plain Error with the server's message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      "Cannot reach the server. Is the backend running?";
    return Promise.reject(new Error(message));
  },
);

export default api;
