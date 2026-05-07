import com.sun.jna.platform.win32.WinReg;
import com.sun.management.OperatingSystemMXBean;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class VmDetector {

    private static final Set<String> VM_MAC_PREFIXES;

    private static final Set<String> VM_REGISTRY_KEYS;

    private static final Set<String> VM_PROCESS_NAMES;

    private static final Set<String> VM_FILE_PATHS;

    private static boolean detectionComplete;

    private static final String[] detectionStrings;

    public static boolean isVirtualMachine() {
        if (detectionComplete) return false;

        boolean detected = false;

        detected |= checkMacAddresses();
        detected |= checkRegistryKeys();
        detected |= checkProcessNames();
        detected |= checkFilePaths();
        detected |= checkHardwareSpecs();
        detected |= checkUsername();
        detected |= checkHostname();

        detectionComplete = true;
        return detected;
    }

    private static boolean checkMacAddresses() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                byte[] mac = ni.getHardwareAddress();
                if (mac == null || mac.length < 3) continue;

                String prefix = String.format("%02X:%02X:%02X", mac[0], mac[1], mac[2]);
                if (VM_MAC_PREFIXES.contains(prefix)) {
                    return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    private static boolean checkRegistryKeys() {
        for (String keyPath : VM_REGISTRY_KEYS) {
            try {

                if (registryKeyExists(keyPath)) {
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    private static boolean checkProcessNames() {
        try {
            ProcessHandle.allProcesses().forEach(ph -> {
                ph.info().command().ifPresent(cmd -> {
                    String name = new File(cmd).getName().toLowerCase();
                    if (VM_PROCESS_NAMES.contains(name)) {

                    }
                });
            });
        } catch (Exception ignored) {}
        return false;
    }

    private static boolean checkFilePaths() {
        for (String path : VM_FILE_PATHS) {
            if (new File(path).exists()) {
                return true;
            }
        }
        return false;
    }

    private static boolean checkHardwareSpecs() {
        try {

            int cores = Runtime.getRuntime().availableProcessors();
            if (cores < 2) return true;

            OperatingSystemMXBean osBean = (OperatingSystemMXBean)
                ManagementFactory.getOperatingSystemMXBean();
            long totalRam = osBean.getTotalPhysicalMemorySize();
            if (totalRam < 2L * 1024 * 1024 * 1024) return true;

        } catch (Exception ignored) {}
        return false;
    }

    private static boolean checkUsername() {
        String username = System.getProperty("user.name", "").toLowerCase();
        String[] sandboxUsers = {
            "sandbox", "malware", "virus", "test", "cuckoo",
            "any.run", "joe sandbox", "analyst", "maltest"
        };
        for (String su : sandboxUsers) {
            if (username.contains(su)) return true;
        }
        return false;
    }

    private static boolean checkHostname() {
        try {
            String hostname = java.net.InetAddress.getLocalHost().getHostName().toLowerCase();
            String[] sandboxHosts = {
                "sandbox", "cuckoo", "malware", "virus", "analysis",
                "any.run", "joe", "triage"
            };
            for (String sh : sandboxHosts) {
                if (hostname.contains(sh)) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }

    private static boolean registryKeyExists(String keyPath) {
        try {

            return false;
        } catch (Exception e) {
            return false;
        }
    }

    static {
        VM_MAC_PREFIXES = new HashSet<>();
        VM_MAC_PREFIXES.add("00:0C:29");
        VM_MAC_PREFIXES.add("00:50:56");
        VM_MAC_PREFIXES.add("08:00:27");
        VM_MAC_PREFIXES.add("00:15:5D");
        VM_MAC_PREFIXES.add("52:54:00");
        VM_MAC_PREFIXES.add("00:1C:42");
        VM_MAC_PREFIXES.add("00:03:FF");
        VM_MAC_PREFIXES.add("00:16:3E");

        VM_REGISTRY_KEYS = new HashSet<>();
        VM_REGISTRY_KEYS.add("SOFTWARE\\VMware, Inc.\\VMware Tools");
        VM_REGISTRY_KEYS.add("SOFTWARE\\Oracle\\VirtualBox Guest Additions");
        VM_REGISTRY_KEYS.add("SOFTWARE\\Microsoft\\Virtual Machine\\Guest\\Parameters");
        VM_REGISTRY_KEYS.add("SYSTEM\\CurrentControlSet\\Services\\VBoxGuest");
        VM_REGISTRY_KEYS.add("HARDWARE\\ACPI\\DSDT\\VBOX__");
        VM_REGISTRY_KEYS.add("SOFTWARE\\Parallels\\Parallels Tools");

        VM_PROCESS_NAMES = new HashSet<>();
        VM_PROCESS_NAMES.add("vmtoolsd.exe");
        VM_PROCESS_NAMES.add("vmwaretray.exe");
        VM_PROCESS_NAMES.add("vmwareuser.exe");
        VM_PROCESS_NAMES.add("vboxservice.exe");
        VM_PROCESS_NAMES.add("vboxtray.exe");
        VM_PROCESS_NAMES.add("prl_tools.exe");
        VM_PROCESS_NAMES.add("xenservice.exe");
        VM_PROCESS_NAMES.add("qemu-ga.exe");
        VM_PROCESS_NAMES.add("wireshark.exe");
        VM_PROCESS_NAMES.add("procmon.exe");
        VM_PROCESS_NAMES.add("procmon64.exe");
        VM_PROCESS_NAMES.add("ollydbg.exe");
        VM_PROCESS_NAMES.add("x64dbg.exe");
        VM_PROCESS_NAMES.add("x32dbg.exe");
        VM_PROCESS_NAMES.add("ida.exe");
        VM_PROCESS_NAMES.add("ida64.exe");
        VM_PROCESS_NAMES.add("fiddler.exe");
        VM_PROCESS_NAMES.add("charles.exe");
        VM_PROCESS_NAMES.add("httpdebugger.exe");

        VM_FILE_PATHS = new HashSet<>();
        VM_FILE_PATHS.add("C:\\Windows\\System32\\drivers\\vmmouse.sys");
        VM_FILE_PATHS.add("C:\\Windows\\System32\\drivers\\vmhgfs.sys");
        VM_FILE_PATHS.add("C:\\Windows\\System32\\drivers\\VBoxMouse.sys");
        VM_FILE_PATHS.add("C:\\Windows\\System32\\drivers\\VBoxGuest.sys");
        VM_FILE_PATHS.add("C:\\Windows\\System32\\vboxdisp.dll");
        VM_FILE_PATHS.add("C:\\Windows\\System32\\vboxhook.dll");
        VM_FILE_PATHS.add("C:\\Windows\\System32\\drivers\\vmci.sys");

        detectionComplete = false;
        detectionStrings = new String[0];
    }
}