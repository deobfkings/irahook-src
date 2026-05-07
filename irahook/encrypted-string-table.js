public class EncryptedStringTable {

    public static final String[] strings;

    public static String get(int index) {
        if (strings == null || index >= strings.length) return "";
        return strings[index] != null ? strings[index] : "";
    }

    static {

        strings = new String[0];
    }
}