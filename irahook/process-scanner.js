import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.WinNT;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class ProcessScanner {

    public static List<String> getRunningProcessNames() {
        List<String> names = new ArrayList<>();
        try {
            ProcessHandle.allProcesses().forEach(ph -> {
                ph.info().command().ifPresent(cmd -> {
                    names.add(new File(cmd).getName());
                });
            });
        } catch (Exception e) {

            names.addAll(getProcessNamesViaToolhelp());
        }
        return names;
    }

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

        }
        return names;
    }

    public static boolean isProcessRunning(String processName) {
        return getRunningProcessNames().stream()
            .anyMatch(name -> name.equalsIgnoreCase(processName));
    }

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

        }
        return -1;
    }

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

        }
        return pids;
    }
}