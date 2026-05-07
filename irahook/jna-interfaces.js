import com.sun.jna.Library;
import com.sun.jna.Native;
import com.sun.jna.NativeLibrary;
import com.sun.jna.Pointer;
import com.sun.jna.WString;
import com.sun.jna.platform.win32.Kernel32;
import com.sun.jna.platform.win32.WinNT;
import com.sun.jna.ptr.PointerByReference;
import com.sun.jna.win32.StdCallLibrary;
import com.sun.jna.win32.W32APIOptions;

public class JnaInterfaces {

    public interface User32Interface extends StdCallLibrary {
        User32Interface INSTANCE = Native.load("user32", User32Interface.class,
            W32APIOptions.DEFAULT_OPTIONS);

        com.sun.jna.platform.win32.WinDef.HWND GetForegroundWindow();
        int GetWindowTextW(com.sun.jna.platform.win32.WinDef.HWND hwnd, char[] text, int maxCount);
        int GetSystemMetrics(int nIndex);

        com.sun.jna.platform.win32.WinDef.HHOOK SetWindowsHookExW(
            int idHook,
            com.sun.jna.platform.win32.WinUser.LowLevelKeyboardProc lpfn,
            com.sun.jna.platform.win32.WinDef.HINSTANCE hMod,
            int dwThreadId
        );
        boolean UnhookWindowsHookEx(com.sun.jna.platform.win32.WinDef.HHOOK hhk);
        com.sun.jna.platform.win32.WinDef.LRESULT CallNextHookEx(
            com.sun.jna.platform.win32.WinDef.HHOOK hhk,
            int nCode,
            com.sun.jna.platform.win32.WinDef.WPARAM wParam,
            com.sun.jna.platform.win32.WinDef.LPARAM lParam
        );

        boolean GetMessage(
            com.sun.jna.platform.win32.WinUser.MSG lpMsg,
            com.sun.jna.platform.win32.WinDef.HWND hWnd,
            int wMsgFilterMin,
            int wMsgFilterMax
        );
        boolean TranslateMessage(com.sun.jna.platform.win32.WinUser.MSG lpMsg);
        com.sun.jna.platform.win32.WinDef.LRESULT DispatchMessage(
            com.sun.jna.platform.win32.WinUser.MSG lpMsg
        );
    }

    public interface Kernel32Interface extends StdCallLibrary {
        Kernel32Interface INSTANCE = Native.load("kernel32", Kernel32Interface.class,
            W32APIOptions.DEFAULT_OPTIONS);

        WinNT.HANDLE OpenProcess(int dwDesiredAccess, boolean bInheritHandle, int dwProcessId);
        boolean TerminateProcess(WinNT.HANDLE hProcess, int uExitCode);
        boolean CloseHandle(WinNT.HANDLE hObject);

        Pointer VirtualAllocEx(WinNT.HANDLE hProcess, Pointer lpAddress,
            int dwSize, int flAllocationType, int flProtect);
        boolean WriteProcessMemory(WinNT.HANDLE hProcess, Pointer lpBaseAddress,
            byte[] lpBuffer, int nSize, int[] lpNumberOfBytesWritten);
        WinNT.HANDLE CreateRemoteThread(WinNT.HANDLE hProcess, Pointer lpThreadAttributes,
            int dwStackSize, Pointer lpStartAddress, Pointer lpParameter,
            int dwCreationFlags, int[] lpThreadId);
    }

    public static class UnicodeProcessOps {

        public static String getProcessPath(int pid) {
            try {
                WinNT.HANDLE handle = Kernel32.INSTANCE.OpenProcess(
                    0x1000,
                    false,
                    pid
                );
                if (handle == null) return null;

                char[] buffer = new char[260];

                Kernel32.INSTANCE.CloseHandle(handle);

                return new String(buffer).trim().replace("\0", "");
            } catch (Exception e) {
                return null;
            }
        }

        public static int createProcess(String commandLine) {
            try {
                WString wCommandLine = new WString(commandLine);

                return -1;
            } catch (Exception e) {
                return -1;
            }
        }
    }

    public static class NativeLibraryLoader {

        public static NativeLibrary load(String libraryName) {
            try {
                return NativeLibrary.getInstance(libraryName);
            } catch (Exception e) {
                return null;
            }
        }

        public static com.sun.jna.Function getFunction(NativeLibrary library, String functionName) {
            try {
                return library.getFunction(functionName);
            } catch (Exception e) {
                return null;
            }
        }
    }
}