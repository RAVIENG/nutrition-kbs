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
    let active = true;
    Promise.allSettled([api.get("/users/profile"), api.get("/users/options")])
      .then(([profileResult, optionsResult]) => {
        if (!active) return;
        const profileLoaded = profileResult.status === "fulfilled";
        const optionsLoaded = optionsResult.status === "fulfilled";
        const failures = [profileResult, optionsResult]
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason.userMessage || result.reason.message);
        setState({
          profile: profileLoaded ? profileResult.value.data.profile : null,
          options: optionsLoaded ? optionsResult.value.data.options : null,
          loading: false,
          error: failures.join(" "),
        });
      });
    return () => { active = false; };
  }, []);

  return state;
}
