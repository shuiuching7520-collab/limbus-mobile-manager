import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Home, Settings, Info, Map, Download, Loader2, Folder } from "lucide-react";
import JSZip from "jszip";
import { open } from "@tauri-apps/plugin-dialog";
import { writeFile, mkdir } from "@tauri-apps/plugin-fs";

function DownloadSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gamePath, setGamePath] = useState("");
  const [progressText, setProgressText] = useState("");

  async function selectFolder() {
    try {
      const folder = await open({
        directory: true,
        multiple: false
      });

      if (folder && typeof folder === "string") {
        setGamePath(folder);
      }
    } catch (err) {
      console.error("選擇資料夾失敗:", err);
      alert("選擇資料夾失敗");
    }
  }

  function stripTopLevelFolder(path: string) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length <= 1) return "";
    return parts.slice(1).join("/");
  }

  async function ensureFolder(folderPath: string) {
    try {
      await mkdir(folderPath, { recursive: true });
    } catch (err) {
      console.warn("建立資料夾略過:", folderPath, err);
    }
  }

  async function downloadLocalization() {
    try {
      if (!gamePath) {
        alert("請先選擇遊戲資料夾");
        return;
      }
      if (status === "loading") return;

      setStatus("loading");
      setProgressText("開始下載翻譯...");

      const url = "https://github.com/kimght/LimbusLocalization/archive/refs/heads/main.zip";
      const response = await fetch(url);

      if (!response.ok) throw new Error(`下載失敗：HTTP ${response.status}`);

      setProgressText("下載完成，正在解壓縮...");
      const blob = await response.blob();
      const zip = await JSZip.loadAsync(blob);
      const fileEntries = Object.keys(zip.files).filter((name) => !zip.files[name].dir);

      let installedCount = 0;
      for (let i = 0; i < fileEntries.length; i++) {
        const name = fileEntries[i];
        const file = zip.files[name];
        const relativePath = stripTopLevelFolder(name);
        if (!relativePath) continue;

        setProgressText(`安裝中... (${i + 1}/${fileEntries.length})`);
        const pathParts = relativePath.split("/");
        const fileName = pathParts.pop();
        if (!fileName) continue;

        if (pathParts.length > 0) {
          const folderPath = `${gamePath}/${pathParts.join("/")}`;
          await ensureFolder(folderPath);
        }

        const fileData = await file.async("uint8array");
        const fullPath = `${gamePath}/${relativePath}`;
        await writeFile(fullPath, fileData);
        installedCount++;
      }

      setProgressText(`安裝完成，共 ${installedCount} 個檔案`);
      setStatus("success");
      alert(`翻譯安裝完成！共安裝 ${installedCount} 個檔案`);
    } catch (err) {
      console.error("安裝失敗:", err);
      setStatus("error");
      setProgressText("安裝失敗");
      alert("翻譯安裝失敗");
    }
  }

  return (
    <div style={styles.card}>
      <h3 style={{ color: "#e8bd5c", marginBottom: 10 }}>翻譯安裝</h3>
      <button style={styles.button} onClick={selectFolder} disabled={status === "loading"}>
        <Folder size={18} /> 選擇遊戲資料夾
      </button>
      {gamePath && <p style={styles.pathText}>已選擇：<br />{gamePath}</p>}
      <button
        style={{...styles.button, marginTop: 10, opacity: status === "loading" ? 0.8 : 1}}
        onClick={downloadLocalization}
        disabled={status === "loading"}
      >
        {status === "loading" ? <><Loader2 size={18} /> 安裝中</> : <><Download size={18} /> 下載並安裝翻譯</>}
      </button>
      {progressText && <p style={{ fontSize: 12, marginTop: 10, color: "#d6c39a" }}>{progressText}</p>}
    </div>
  );
}

const HomePage = () => (
  <div style={styles.page}>
    <h1 style={styles.title}>管理中心</h1>
    <p style={{ color: "#d6c39a", fontSize: 14 }}>歡迎使用 Limbus 翻譯管理工具</p>
  </div>
);

const LocalizationPage = () => (
  <div style={styles.page}>
    <h1 style={styles.title}>翻譯管理</h1>
    <DownloadSection />
  </div>
);

const SettingsPage = () => (
  <div style={styles.page}>
    <h1 style={styles.title}>設定</h1>
    <p style={{ color: "#d6c39a", fontSize: 14 }}>開發中...</p>
  </div>
);

const AboutPage = () => (
  <div style={styles.page}>
    <h1 style={styles.title}>關於</h1>
    <p style={{ color: "#d6c39a" }}>Limbus Localization Mobile</p>
  </div>
);

function NavItem({ to, icon, label }: any) {
  return (
    <NavLink to={to} style={({ isActive }) => ({ ...styles.navLink, color: isActive ? "#fbf8eb" : "#cf8d23" })}>
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.container}>
        <div style={styles.content}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/localizations" element={<LocalizationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </div>
        <nav style={styles.navbar}>
          <NavItem to="/" icon={<Home size={24} />} label="首頁" />
          <NavItem to="/localizations" icon={<Map size={24} />} label="翻譯" />
          <NavItem to="/settings" icon={<Settings size={24} />} label="設定" />
          <NavItem to="/about" icon={<Info size={24} />} label="關於" />
        </nav>
      </div>
    </BrowserRouter>
  );
}

const styles: any = {
  container: { display: "flex", flexDirection: "column", height: "100vh", background: "#231c20", color: "#fbf8eb" },
  content: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  page: { padding: 20 },
  title: { fontSize: 22, color: "#cf8d23", marginBottom: 20 },
  card: { background: "#1a1518", padding: 16, borderRadius: 10, border: "1px solid #3a2b1f" },
  button: { width: "100%", padding: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#cf8d23", border: "none", color: "#fff", borderRadius: 8 },
  pathText: { fontSize: 12, marginTop: 10, color: "#d6c39a", wordBreak: "break-all" },
  navbar: { position: "fixed", bottom: 0, width: "100%", height: 70, display: "flex", justifyContent: "space-around", alignItems: "center", background: "#120d10", borderTop: "1px solid #2b1f16" },
  navLink: { display: "flex", flexDirection: "column", alignItems: "center", textDecoration: "none", gap: 4 }
};
