public class Logger {

    private static boolean enabled = false;

    public static void setEnabled(boolean enabled) {
        Logger.enabled = enabled;
    }

    public static void info(String message) {
        if (enabled) System.out.println("[INFO] " + message);
    }

    public static void error(String message) {
        if (enabled) System.err.println("[ERROR] " + message);
    }

    public static void debug(String message) {
        if (enabled) System.out.println("[DEBUG] " + message);
    }
}