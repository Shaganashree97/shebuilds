const API_BASE_URL = "http://localhost:8000/api";

class AuthService {
  constructor() {
    this.token = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  async makeRequest(url, options = {}) {
    const fullUrl = `${API_BASE_URL}${url}`;
    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      defaultHeaders["Authorization"] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(fullUrl, config);

      if (response.status === 401 && this.refreshToken) {
        // Token expired, try to refresh
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request with new token
          config.headers["Authorization"] = `Bearer ${this.token}`;
          return await fetch(fullUrl, config);
        }
      }

      return response;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: this.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.access;
        localStorage.setItem("accessToken", data.access);
        return true;
      } else {
        // Refresh token is invalid, logout user
        this.logout();
        return false;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout();
      return false;
    }
  }

  async register(userData) {
    try {
      const response = await this.makeRequest("/auth/register/", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.access;
        this.refreshToken = data.refresh;
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("user", JSON.stringify(data.user));
        return { success: true, user: data.user, message: data.message };
      } else {
        return { success: false, errors: data };
      }
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, errors: { general: "Network error occurred" } };
    }
  }

  async login(email, password) {
    try {
      const response = await this.makeRequest("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        this.token = data.access;
        this.refreshToken = data.refresh;
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        localStorage.setItem("user", JSON.stringify(data.user));
        return { success: true, user: data.user, message: data.message };
      } else {
        return { success: false, errors: data };
      }
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, errors: { general: "Network error occurred" } };
    }
  }

  async logout() {
    try {
      if (this.refreshToken) {
        await this.makeRequest("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh: this.refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear local storage regardless of API call success
      this.token = null;
      this.refreshToken = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
    }
  }

  async getProfile() {
    try {
      const response = await this.makeRequest("/auth/profile/");

      if (response.ok) {
        const user = await response.json();
        localStorage.setItem("user", JSON.stringify(user));
        return { success: true, user };
      } else {
        return { success: false, errors: "Failed to fetch profile" };
      }
    } catch (error) {
      console.error("Get profile failed:", error);
      return { success: false, errors: "Network error occurred" };
    }
  }

  isAuthenticated() {
    return !!this.token;
  }

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken() {
    return this.token;
  }

  // Utility method for making authenticated API calls from other components
  async makeAuthenticatedRequest(endpoint, options = {}) {
    return this.makeRequest(endpoint, options);
  }
}

export default new AuthService();
