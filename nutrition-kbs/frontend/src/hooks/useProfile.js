import { useEffect, useState } from "react";
import api from "../services/api";

// Loads the saved profile and the option lists once, for any page that needs them
export default function useProfile() {
  const [state, setState] = useState({
    profile: null,
    options: null,
    loading: true,
    error: "",
  });

  useEffect(() => {
    Promise.all([api.get("/users/profile"), api.get("/users/options")])
      .then(([profRes, optRes]) =>
        setState({
          profile: profRes.data.profile,
          options: optRes.data.options,
          loading: false,
          error: "",
        }),
      )
      .catch((err) =>
        setState({
          profile: null,
          options: null,
          loading: false,
          error: err.message,
        }),
      );
  }, []);

  return state;
}
