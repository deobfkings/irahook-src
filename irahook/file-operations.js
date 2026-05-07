import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

public class FileOperations {

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

    public static boolean isAccessible(File file) {
        if (!file.exists() || !file.isFile()) return false;
        try {

            new java.io.FileInputStream(file).close();
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    public static String getAppDataPath(String subPath) {
        return System.getenv("APPDATA") + "\\" + subPath;
    }

    public static String getLocalAppDataPath(String subPath) {
        return System.getenv("LOCALAPPDATA") + "\\" + subPath;
    }

    public static boolean mkdirs(File dir) {
        return dir.exists() || dir.mkdirs();
    }
}