using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredExtract {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    static extern void CredFree(IntPtr credential);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct CREDENTIAL {
        public int flags;
        public int type;
        public string targetName;
        public string comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME lastWritten;
        public int credentialBlobSize;
        public IntPtr credentialBlob;
        public int persist;
        public int attributeCount;
        public IntPtr attributes;
        public string targetAlias;
        public string userName;
    }

    public static void Main() {
        IntPtr credPtr;
        if (CredRead("LegacyGeneric:target=git:https://lmgraficarailway-wq@github.com", 1, 0, out credPtr)) {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] blob = new byte[cred.credentialBlobSize];
            Marshal.Copy(cred.credentialBlob, blob, 0, cred.credentialBlobSize);
            string password = Encoding.Unicode.GetString(blob);
            Console.WriteLine("TOKEN: " + password);
            CredFree(credPtr);
        } else {
            Console.WriteLine("Credencial nao encontrada.");
        }
    }
}
