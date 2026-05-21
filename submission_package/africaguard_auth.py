"""
Authentication — AfricaGuard
AUTH_MODE=session  → Flask sessions (local / academic demo)
AUTH_MODE=b2c      → Azure AD B2C JWT Bearer tokens
"""
import os
from functools import wraps

from flask import jsonify, request, session

AUTH_MODE = os.getenv("AUTH_MODE", "session").lower()
B2C_TENANT = os.getenv("AZURE_B2C_TENANT", "africaguard")
B2C_POLICY = os.getenv("AZURE_B2C_POLICY", "B2C_1_signin")
VERIFY_B2C_SIGNATURE = os.getenv("VERIFY_B2C_SIGNATURE", "false").lower() == "true"

_jwks_cache = None


def _b2c_jwks_url():
    return (
        f"https://{B2C_TENANT}.b2clogin.com/{B2C_TENANT}.onmicrosoft.com/"
        f"{B2C_POLICY}/discovery/v2.0/keys"
    )


def _role_from_payload(payload: dict) -> str:
    groups = payload.get("groups") or payload.get("roles") or []
    if "AfricaGuard_Security" in groups:
        return "security"
    if "AfricaGuard_Sales" in groups:
        return "sales"
    return payload.get("extension_role", "viewer")


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if AUTH_MODE == "b2c":
            try:
                import jwt
            except ImportError:
                return jsonify({"error": "PyJWT required for B2C auth — pip install PyJWT"}), 500

            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Unauthorized — Bearer token required"}), 401
            token = auth_header.split(" ", 1)[1]
            try:
                options = {"verify_signature": VERIFY_B2C_SIGNATURE}
                if not VERIFY_B2C_SIGNATURE:
                    options["verify_aud"] = False
                payload = jwt.decode(token, options=options, algorithms=["RS256"])
                request.user = payload
                request.role = _role_from_payload(payload)
                request.user_id = payload.get("emails", [payload.get("sub", "b2c-user")])[0]
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except Exception as exc:
                return jsonify({"error": f"Invalid token: {exc}"}), 401
        else:
            if not session.get("user_id"):
                return jsonify({"error": "Authentication required"}), 401
            request.user_id = session["user_id"]
            request.role = session.get("role", "viewer")
            request.user = {"email": session["user_id"]}
        return f(*args, **kwargs)

    return decorated
