"use client";
import { useEffect, useState, createContext, useContext } from "react";

export type SettingsTab = "general" | "branding" | "security" | "email" | "integrations" | "maintenance";

// Global settings context to share loaded values and a unified save method across tabs
type SettingsData = {
  appName: string;
  defaultLocale: string;
  timeZone: string;
  primaryColor: string;
  darkMode: boolean;
  logoUrl: string | null;
  require2FA: boolean;
  sessionTimeout: number;
  allowDirectLogin: boolean;
  fromName: string | null;
  fromEmail: string | null;
  emailProvider: string;
  cloudinaryEnabled: boolean;
  cloudinaryFolder: string | null;
  webhookUrl: string | null;
  xenditSecretKey: string | null;
  xenditPublicKey: string | null;
  xenditWebhookToken: string | null;
  xenditEnvironment: string;
  maintenanceMode: boolean;
  announcement: string | null;
};

const SettingsContext = createContext<{
  data: SettingsData | null;
  saving: boolean;
  error: string;
  success: string;
  save: (patch: Partial<SettingsData>) => Promise<void>;
}>({ data: null, saving: false, error: "", success: "", save: async () => {} });

function useSettings() { return useContext(SettingsContext); }

export default function AdminSettingsPanel() {
  const [active, setActive] = useState<SettingsTab>("general");
    const [data, setData] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load initial settings from backend
  useEffect(() => {
    (async () => {
      try {
        setError("");
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const res = await fetch(`/api/admin/settings`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message || "Gagal memuat settings");
        // Normalize missing fields
        const loaded: SettingsData = {
          appName: body.appName ?? "The Lodge Family",
          defaultLocale: body.defaultLocale ?? "id-ID",
          timeZone: body.timeZone ?? "Asia/Jakarta",
          primaryColor: body.primaryColor ?? "#0F4D39",
          darkMode: Boolean(body.darkMode ?? true),
          logoUrl: body.logoUrl ?? null,
          require2FA: Boolean(body.require2FA ?? false),
          sessionTimeout: Number(body.sessionTimeout ?? 60),
          allowDirectLogin: Boolean(body.allowDirectLogin ?? true),
          fromName: body.fromName ?? null,
          fromEmail: body.fromEmail ?? null,
          emailProvider: body.emailProvider ?? "smtp",
          cloudinaryEnabled: Boolean(body.cloudinaryEnabled ?? false),
          cloudinaryFolder: body.cloudinaryFolder ?? null,
          webhookUrl: body.webhookUrl ?? null,
          maintenanceMode: Boolean(body.maintenanceMode ?? false),
          announcement: body.announcement ?? null,
        };
        setData(loaded);
      } catch (e: any) {
        setError(e?.message || "Terjadi kesalahan saat memuat settings");
      }
    })();
  }, []);

  const save = async (patch: Partial<SettingsData>) => {
    try {
      setSaving(true);
      setSuccess("");
      setError("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const payload = { ...(data || {}), ...patch } as SettingsData;
      const res = await fetch(`/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "Gagal menyimpan settings");
      setData(payload);
      setSuccess("Settings berhasil disimpan");
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan saat menyimpan settings");
    } finally {
      setSaving(false);
    }
  };

  const TabBtn = ({ id, label }: { id: SettingsTab; label: string }) => (
    <button
      onClick={() => setActive(id)}
      className={`px-3 py-2 rounded-md text-sm font-medium border ${
        active === id
          ? "bg-[#0F4D39] text-white border-[#0F4D39]"
          : "bg-white text-[#0F4D39] hover:bg-slate-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 border-slate-200 dark:border-gray-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <SettingsContext.Provider value={{ data, saving, error, success, save }}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <TabBtn id="general" label="General" />
          <TabBtn id="branding" label="Branding" />
          <TabBtn id="security" label="Security" />
          <TabBtn id="email" label="Email" />
          <TabBtn id="integrations" label="Integrations" />
          <TabBtn id="maintenance" label="Maintenance" />
        </div>

        {/* Status banners */}
        {error && <div className="px-3 py-2 rounded bg-red-100 text-red-700 text-sm">{error}</div>}
        {success && <div className="px-3 py-2 rounded bg-green-100 text-emerald-700 text-sm">{success}</div>}

        {active === "general" && <GeneralSettings />}
        {active === "branding" && <BrandingSettings />}
        {active === "security" && <SecuritySettings />}
        {active === "email" && <EmailSettings />}
        {active === "integrations" && <IntegrationsSettings />}
        {active === "maintenance" && <MaintenanceSettings />}
      </div>
    </SettingsContext.Provider>
  );
}

function Section({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-4">
      <div className="text-lg font-semibold mb-1">{title}</div>
      {description && <div className="text-xs text-slate-600 mb-3">{description}</div>}
    </div>
  );
}

function GeneralSettings() {
  const { data, save, saving } = useSettings();
  const [appName, setAppName] = useState("The Lodge Family");
  const [defaultLocale, setDefaultLocale] = useState("id-ID");
  const [timeZone, setTimeZone] = useState("Asia/Jakarta");
  useEffect(() => {
    if (data) {
      setAppName(data.appName);
      setDefaultLocale(data.defaultLocale);
      setTimeZone(data.timeZone);
    }
  }, [data]);
  return (
    <div className="space-y-3">
      <Section title="General" description="Pengaturan dasar aplikasi." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Nama Aplikasi</label>
          <input value={appName} onChange={(e) => setAppName(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Default Locale</label>
          <select value={defaultLocale} onChange={(e) => setDefaultLocale(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <option value="id-ID">Indonesia (id-ID)</option>
            <option value="en-US">English (en-US)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Time Zone</label>
          <input value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={saving} onClick={() => save({ appName, defaultLocale, timeZone })} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white disabled:opacity-60">Simpan</button>
      </div>
    </div>
  );
}

function BrandingSettings() {
  const { data, save, saving } = useSettings();
  const [primaryColor, setPrimaryColor] = useState("#0F4D39");
  const [darkMode, setDarkMode] = useState(true);
  const [logoUrl, setLogoUrl] = useState("/The Lodge Maribaya Logo.svg");
  useEffect(() => {
    if (data) {
      setPrimaryColor(data.primaryColor);
      setDarkMode(Boolean(data.darkMode));
      setLogoUrl(data.logoUrl ?? "/The Lodge Maribaya Logo.svg");
    }
  }, [data]);
  return (
    <div className="space-y-3">
      <Section title="Branding" description="Tema dan identitas visual." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Primary Color</label>
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-16 h-10" />
        </div>
        <div className="flex items-center gap-2">
          <input id="darkMode" type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
          <label htmlFor="darkMode" className="text-xs text-slate-600">Aktifkan Dark Mode</label>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Logo URL</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={saving} onClick={() => save({ primaryColor, darkMode, logoUrl })} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white disabled:opacity-60">Simpan</button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { data, save, saving } = useSettings();
  const [require2FA, setRequire2FA] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [allowDirectLogin, setAllowDirectLogin] = useState(true);
  useEffect(() => {
    if (data) {
      setRequire2FA(Boolean(data.require2FA));
      setSessionTimeout(Number(data.sessionTimeout));
      setAllowDirectLogin(Boolean(data.allowDirectLogin));
    }
  }, [data]);
  return (
    <div className="space-y-3">
      <Section title="Security" description="Keamanan akun dan akses." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <input id="require2FA" type="checkbox" checked={require2FA} onChange={(e) => setRequire2FA(e.target.checked)} />
          <label htmlFor="require2FA" className="text-xs text-slate-600">Wajib 2FA untuk admin</label>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Session Timeout (menit)</label>
          <input type="number" min={5} value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 60)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div className="flex items-center gap-2">
          <input id="allowDirectLogin" type="checkbox" checked={allowDirectLogin} onChange={(e) => setAllowDirectLogin(e.target.checked)} />
          <label htmlFor="allowDirectLogin" className="text-xs text-slate-600">Ijinkan login langsung (tanpa undangan)</label>
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={saving} onClick={() => save({ require2FA, sessionTimeout, allowDirectLogin })} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white disabled:opacity-60">Simpan</button>
      </div>
    </div>
  );
}

function EmailSettings() {
  const { data, save, saving } = useSettings();
  const [fromName, setFromName] = useState("The Lodge Family");
  const [fromEmail, setFromEmail] = useState("no-reply@thelodge.id");
  const [provider, setProvider] = useState("smtp");
  useEffect(() => {
    if (data) {
      setFromName(data.fromName ?? "The Lodge Family");
      setFromEmail(data.fromEmail ?? "no-reply@thelodge.id");
      setProvider(data.emailProvider ?? "smtp");
    }
  }, [data]);
  return (
    <div className="space-y-3">
      <Section title="Email" description="Pengaturan pengiriman email." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">From Name</label>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">From Email</label>
          <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <option value="smtp">SMTP</option>
            <option value="sendgrid">SendGrid</option>
            <option value="resend">Resend</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={saving} onClick={() => save({ fromName, fromEmail, emailProvider: provider })} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white disabled:opacity-60">Simpan</button>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  const { data, save, saving } = useSettings();
  const [cloudinaryEnabled, setCloudinaryEnabled] = useState(false);
  const [cloudinaryFolder, setCloudinaryFolder] = useState("thelodge/uploads");
  const [webhookUrl, setWebhookUrl] = useState("");
  
  // Xendit configuration state
  const [xenditSecretKey, setXenditSecretKey] = useState("");
  const [xenditPublicKey, setXenditPublicKey] = useState("");
  const [xenditWebhookToken, setXenditWebhookToken] = useState("");
  const [xenditEnvironment, setXenditEnvironment] = useState("test");
  
  // Xendit validation state
  const [xenditTesting, setXenditTesting] = useState(false);
  const [xenditTestResult, setXenditTestResult] = useState<{success: boolean, message: string} | null>(null);

  // Function to test Xendit API connection
  const testXenditConnection = async () => {
    if (!xenditSecretKey) {
      setXenditTestResult({success: false, message: "Secret key diperlukan untuk testing"});
      return;
    }

    setXenditTesting(true);
    setXenditTestResult(null);

    try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      
      const response = await fetch(`/api/admin/test-xendit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          secretKey: xenditSecretKey,
          environment: xenditEnvironment
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setXenditTestResult({success: true, message: "Koneksi Xendit berhasil! API key valid."});
      } else {
        setXenditTestResult({success: false, message: result.message || "Gagal menguji koneksi Xendit"});
      }
    } catch (error) {
      setXenditTestResult({success: false, message: "Error: Tidak dapat terhubung ke server"});
    } finally {
      setXenditTesting(false);
    }
  };

  useEffect(() => {
    // Prefill from backend if available
    if (data) {
      setCloudinaryEnabled(Boolean(data.cloudinaryEnabled));
      setCloudinaryFolder(data.cloudinaryFolder ?? "thelodge/uploads");
      setWebhookUrl(data.webhookUrl ?? "");
      
      // Prefill Xendit data
      setXenditSecretKey(data.xenditSecretKey ?? "");
      setXenditPublicKey(data.xenditPublicKey ?? "");
      setXenditWebhookToken(data.xenditWebhookToken ?? "");
      setXenditEnvironment(data.xenditEnvironment ?? "test");
    } else {
      // Fallback: detect cloudinary env on frontend
      try {
        const hasCloudinary = typeof window !== "undefined" && !!(process.env as any).NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        setCloudinaryEnabled(Boolean(hasCloudinary));
      } catch {}
    }
  }, [data]);

  return (
    <div className="space-y-6">
      <Section title="Integrations" description="Integrasi layanan pihak ketiga." />
      
      {/* Cloudinary Section */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Cloudinary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <input id="cloudinaryEnabled" type="checkbox" checked={cloudinaryEnabled} onChange={(e) => setCloudinaryEnabled(e.target.checked)} />
            <label htmlFor="cloudinaryEnabled" className="text-xs text-slate-600">Aktifkan Cloudinary</label>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Cloudinary Folder</label>
            <input value={cloudinaryFolder} onChange={(e) => setCloudinaryFolder(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Webhook URL</label>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
          </div>
        </div>
      </div>

      {/* Xendit Payment Gateway Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Xendit Payment Gateway</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Secret Key</label>
            <input 
              type="password" 
              value={xenditSecretKey} 
              onChange={(e) => setXenditSecretKey(e.target.value)} 
              placeholder="xnd_development_..." 
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" 
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Public Key</label>
            <input 
              type="text" 
              value={xenditPublicKey} 
              onChange={(e) => setXenditPublicKey(e.target.value)} 
              placeholder="xnd_public_development_..." 
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" 
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Webhook Token</label>
            <input 
              type="password" 
              value={xenditWebhookToken} 
              onChange={(e) => setXenditWebhookToken(e.target.value)} 
              placeholder="Webhook verification token" 
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" 
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Environment</label>
            <select 
              value={xenditEnvironment} 
              onChange={(e) => setXenditEnvironment(e.target.value)} 
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
          </div>
        </div>
        
        {/* Test Connection Section */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={testXenditConnection}
            disabled={xenditTesting || !xenditSecretKey}
            className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-60 hover:bg-blue-700"
          >
            {xenditTesting ? 'Testing...' : 'Test Koneksi API'}
          </button>
          
          {xenditTestResult && (
            <div className={`flex-1 p-2 rounded text-xs ${
              xenditTestResult.success 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
            }`}>
              <strong>{xenditTestResult.success ? '✓' : '✗'}</strong> {xenditTestResult.message}
            </div>
          )}
        </div>
        
        <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-800/30 rounded text-xs text-blue-800 dark:text-blue-200">
          <strong>Info:</strong> Konfigurasi ini akan digunakan untuk memproses pembayaran. Pastikan menggunakan environment "test" untuk development dan "live" untuk production.
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          disabled={saving} 
          onClick={() => save({ 
            cloudinaryEnabled, 
            cloudinaryFolder, 
            webhookUrl,
            xenditSecretKey,
            xenditPublicKey,
            xenditWebhookToken,
            xenditEnvironment
          })} 
          className="px-4 py-2 rounded-md bg-[#0F4D39] text-white disabled:opacity-60 hover:bg-[#0F4D39]/90"
        >
          {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
        </button>
      </div>
    </div>
  );
}

function MaintenanceSettings() {
  const { data, save, saving } = useSettings();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (data) {
      setMaintenanceMode(Boolean(data.maintenanceMode));
      setAnnouncement(data.announcement ?? "");
    }
  }, [data]);
  return (
    <div className="space-y-3">
      <Section title="Maintenance" description="Pemeliharaan sistem dan pengumuman." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <input id="maintenanceMode" type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
          <label htmlFor="maintenanceMode" className="text-xs text-slate-600">Aktifkan Maintenance Mode</label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">Pengumuman</label>
          <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} rows={3} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={saving} onClick={() => save({ maintenanceMode, announcement })} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white disabled:opacity-60">Simpan</button>
      </div>
    </div>
  );
}