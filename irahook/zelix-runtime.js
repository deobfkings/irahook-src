import java.util.ArrayList;
import java.util.Vector;
import java.util.concurrent.ConcurrentHashMap;

interface ZelixNode {
    void addChild(ZelixNode child);
    int[] getTable();
    long computeKey(long seed);
    void setKey(long key);
    boolean compareTo(ZelixNode other);
}

class ZelixNodeImpl implements ZelixNode {
    private static boolean initialized;
    private static ZelixNodeImpl root;

    private ConcurrentHashMap<ZelixNode, ZelixNode> parentMap = new ConcurrentHashMap<>();
    private ZelixNode nextChild;
    private int[] table;
    private long key;

    public ZelixNodeImpl() {

        this.table = new int[64];

        ZelixRuntime.register(this);
    }

    static void setInitialized(boolean value) {
        initialized = value;
    }

    static ZelixNode link(ZelixNode node1, ZelixNode node2) {
        return root.linkInternal(node1, node2);
    }

    private ZelixNode linkInternal(ZelixNode node1, ZelixNode node2) {
        ZelixNode existing = (ZelixNode) parentMap.get(node1);
        if (existing == null) existing = this;
        parentMap.put(node2, node1);
        return existing;
    }

    @Override
    public void addChild(ZelixNode child) {
        if (this != child) {
            if (nextChild == null) nextChild = child;
            else nextChild.addChild(child);
        }
    }

    @Override
    public long computeKey(long seed) {
        ZelixNode node = ZelixRuntime.getNode(seed);
        long result = node.computeKey(seed);
        int[] nodeTable = node.getTable();
        System.arraycopy(this.table, 0, nodeTable, 0, 64);
        if (nextChild != null) nextChild.computeKey(seed);
        return result;
    }

    @Override
    public int[] getTable() {
        return ZelixRuntime.globalTable;
    }

    @Override
    public boolean compareTo(ZelixNode other) {
        if (this == other) return true;
        if (other instanceof ZelixNodeImpl) {
            return System.identityHashCode(this) - System.identityHashCode(other) <= 0;
        }
        return false;
    }

    @Override
    public void setKey(long key) {
        this.key = key;
    }

    static { root = new ZelixNodeImpl(); }
}

class ZelixRuntime implements ZelixNode {
    private long seed;
    private int[] table;
    private ZelixNode child;
    private long derivedKey;
    private long[] keySchedule;

    private static long[] globalKeySchedule;
    static int[] globalTable;
    private static ArrayList<ZelixNode> nodeList = new ArrayList<>();
    private static Vector<Object> classRegistry = new Vector<>();
    private static int nodeCount;
    private static Object sharedObject;
    private static int tableSize;
    private static int tableModulo;
    private static int nodeIndex;

    public static ZelixNode a(long seed1, long seed2, Object clazz) {
        ZelixNodeImpl.setInitialized(seed1 > 0L);
        ZelixNode node1 = getOrCreate(seed1);
        ZelixNode node2 = getOrCreate(seed2);
        ZelixNode result = ZelixNodeImpl.link(node1, node2);
        if (clazz != null) classRegistry.add(clazz);
        return result;
    }

    static ZelixNode getNode(long seed) {
        int index = (int) computeIndex(seed, tableSize, 63, globalTable, globalKeySchedule);
        if (index < nodeCount) {
            return nodeList.get(index);
        }
        if (nodeList.size() % tableModulo == 0) {
            globalTable = globalTable.clone();
        }
        ZelixRuntime node = new ZelixRuntime(seed);
        nodeList.add(node);
        return node;
    }

    private static ZelixNode getOrCreate(long seed) {
        return new ZelixRuntime(seed);
    }

    static void register(ZelixNodeImpl node) {
        nodeCount = nodeList.size();
        resetTable();
        node.activate();
    }

    static void unregister(ZelixNodeImpl node) {
        resetTable();

        globalTable = new int[64];

        node.deactivate();
    }

    private ZelixRuntime(long seed) {
        this.seed = seed;
        this.table = globalTable;
        this.keySchedule = globalKeySchedule;
    }

    @Override
    public long computeKey(long xorKey) {
        long tableIndex = this.computeIndex(8, 55);
        this.seed = this.seed ^ (xorKey ^ this.derivedKey);
        if (this.child != null) this.child.computeKey(xorKey);
        return tableIndex;
    }

    @Override
    public void setKey(long key) {
        this.derivedKey = key;
    }

    @Override
    public void addChild(ZelixNode child) {
        if (this != child) {
            if (this.child == null) this.child = child;
            else this.child.addChild(child);
        }
    }

    @Override
    public int[] getTable() {
        return this.table;
    }

    @Override
    public boolean compareTo(ZelixNode other) {
        if (this == other) return true;
        if (other instanceof ZelixRuntime) {
            return this.computeIndex(56, 63) - ((ZelixRuntime) other).computeIndex(56, 63) <= 0L;
        }
        return true;
    }

    @Override
    public int hashCode() {
        return (int) this.computeIndex(8);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj instanceof ZelixRuntime) {
            return this.computeIndex(56) == ((ZelixRuntime) obj).computeIndex(56);
        }
        return false;
    }

    private long computeIndex(int a, int b) { return 0;  }
    private long computeIndex(int a) { return 0; }
    private static long computeIndex(long seed, int a, int b, int[] table, long[] schedule) { return 0; }
    private static void resetTable() {}
}