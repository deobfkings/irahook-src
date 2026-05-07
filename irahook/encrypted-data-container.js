public class EncryptedDataContainer {

    private final String name;

    private final byte[] data;

    private static final byte[] staticKey;

    public EncryptedDataContainer(String name, byte[] data) {
        this.name = name;
        this.data = data;
    }

    public String getName() {
        return name;
    }

    public byte[] getData() {
        return data;
    }

    public String getDataAsString() {
        try {
            return new String(data, "UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    public int getLength() {
        return data != null ? data.length : 0;
    }

    @Override
    public String toString() {
        return "EncryptedDataContainer{name='" + name + "', size=" + getLength() + "}";
    }

    static {
        staticKey = new byte[0];
    }
}