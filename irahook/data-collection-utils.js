import java.util.ArrayList;
import java.util.List;

public class DataCollectionUtils {

    public static class DataCollector {

        private final List<String> collectedData;

        public DataCollector() {
            this.collectedData = new ArrayList<>();
        }

        public void add(String data) {
            if (data != null && !data.isEmpty()) {
                collectedData.add(data);
            }
        }

        public void addAll(List<String> items) {
            if (items != null) {
                collectedData.addAll(items);
            }
        }

        public List<String> getAll() {
            return java.util.Collections.unmodifiableList(collectedData);
        }

        public int size() {
            return collectedData.size();
        }

        public boolean isEmpty() {
            return collectedData.isEmpty();
        }

        public String format(String separator) {
            return String.join(separator, collectedData);
        }

        public void clear() {
            collectedData.clear();
        }
    }

    public static final String ZELIX_CONSTANTS_NOTE =
        "Zelix-generated encrypted constants - cannot be statically deobfuscated";
}