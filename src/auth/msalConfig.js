// AfricaGuard — Azure AD B2C MSAL configuration

const tenant = import.meta.env.VITE_B2C_TENANT || "africaguard";
const policy = import.meta.env.VITE_B2C_POLICY || "B2C_1_signin";

export const useB2CAuth = import.meta.env.VITE_USE_B2C_AUTH === "true";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_B2C_CLIENT_ID || "",
    authority: `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${policy}`,
    knownAuthorities: [`${tenant}.b2clogin.com`],
    redirectUri: import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};

export function getRoleFromToken(account) {
  const claims = account?.idTokenClaims || {};
  const groups = claims.groups || claims.roles || [];
  if (groups.includes("AfricaGuard_Security")) return "security";
  if (groups.includes("AfricaGuard_Sales")) return "sales";
  return "viewer";
}

export function accountToUser(account) {
  const claims = account?.idTokenClaims || {};
  return {
    email: claims.emails?.[0] || account?.username || "",
    display_name: claims.name || account?.name || "AfricaGuard User",
    role: getRoleFromToken(account),
  };
}
