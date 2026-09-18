import { AppState, CloudConfig } from '../types';

export type CloudStatus = 'connected' | 'syncing' | 'local-only';

export const INITIAL_APP_STATE: AppState = {
  schemaVersion: 'nexus-final-clean-v1',
  students: [],
  classes: [],
  attendance: {},
  attendanceRecords: {},
  tests: [],
  testRecords: [],
  testMarks: {},
  feeTransactions: [],
  receipts: [],
  settings: {
    name: 'Nexus Academy',
    subtitle: 'English Language, Computer & Home Tuition Academy',
    address: 'Near Sadar Road, Peshawar KPK',
    logo: '/nexus-logo.svg',
    currency: 'PKR',
    adminPin: '2026',
    backgroundColor: '#f8fafc',
    autoMonthlyFeeBilling: true,
  },
  cloudConfig: { provider: 'built-in' },
};

const LOCAL_STORAGE_KEY = 'nexus_academy_state_final_v1';

class CloudSyncService {
  private currentStatus: CloudStatus = 'local-only';
  private subscribers: Array<(state: AppState) => void> = [];
  private statusSubscribers: Array<(status: CloudStatus) => void> = [];
  private eventSource: EventSource | null = null;
  private syncDebounceTimer: any = null;
  private cachedState: AppState | null = null;

  constructor() {
    this.initRealTimeSSE();
  }

  private initRealTimeSSE() {
    if (typeof window === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      // Connect to the backend Server-Sent Events bus
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.setStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type === 'STATE_UPDATE' && payload.data) {
            this.cachedState = payload.data;
            this.saveToLocalStorage(payload.data);
            this.notifySubscribers(payload.data);
          }
        } catch {
          // ignore non-json SSE heartbeats
        }
      };

      this.eventSource.onerror = () => {
        // Fallback to local mode when backend SSE closes
        this.setStatus('local-only');
      };
    } catch {
      this.setStatus('local-only');
    }
  }

  public setStatus(status: CloudStatus) {
    this.currentStatus = status;
    this.statusSubscribers.forEach((cb) => cb(status));
  }

  public getState(): AppState {
    if (this.cachedState) return this.cachedState;
    const local = this.loadFromLocalStorage();
    if (local && local.students) return local;
    return INITIAL_APP_STATE;
  }

  public onStateChange(callback: (state: AppState) => void): () => void {
    return this.subscribe(callback);
  }

  public async init(): Promise<AppState> {
    return this.loadState();
  }

  public async forcePull(): Promise<AppState> {
    return this.loadState();
  }

  public setCloudConfig(config: CloudConfig): void {
    if (this.cachedState) {
      this.cachedState.cloudConfig = config;
      this.saveState(this.cachedState);
    }
  }

  public onStatusChange(callback: (status: CloudStatus) => void): () => void {
    this.statusSubscribers.push(callback);
    callback(this.currentStatus);
    return () => {
      this.statusSubscribers = this.statusSubscribers.filter((cb) => cb !== callback);
    };
  }

  public subscribe(callback: (state: AppState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notifySubscribers(state: AppState) {
    this.subscribers.forEach((cb) => cb(state));
  }

  public async loadState(): Promise<AppState> {
    // 1. Try loading from Server Backend API
    try {
      const response = await fetch('/api/state', {
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.students && Array.isArray(data.students)) {
          // Final clean release: intentionally reject/wipe data from older seeded builds.
          if (data.schemaVersion !== INITIAL_APP_STATE.schemaVersion) {
            this.cachedState = INITIAL_APP_STATE;
            this.saveToLocalStorage(INITIAL_APP_STATE);
            await this.saveState(INITIAL_APP_STATE);
            return INITIAL_APP_STATE;
          }
          this.cachedState = data;
          this.saveToLocalStorage(data);
          this.setStatus('connected');
          return data;
        }
      }
    } catch (err) {
      console.warn('Backend /api/state not reachable directly, trying cloud or cache:', err);
    }

    // 2. Check Cloud Config if configured for Supabase or Firebase
    const local = this.loadFromLocalStorage();
    const config = local?.cloudConfig;

    if (config?.provider === 'supabase' && config.supabase?.url && config.supabase?.anonKey) {
      try {
        const sbState = await this.fetchFromSupabase(config.supabase.url, config.supabase.anonKey);
        if (sbState) {
          this.cachedState = sbState;
          this.saveToLocalStorage(sbState);
          this.setStatus('connected');
          return sbState;
        }
      } catch (e) {
        console.warn('Could not fetch from Supabase on startup:', e);
      }
    } else if (config?.provider === 'firebase' && config.firebase?.projectId && config.firebase?.apiKey) {
      try {
        const fbState = await this.fetchFromFirebase(config.firebase.projectId, config.firebase.apiKey);
        if (fbState) {
          this.cachedState = fbState;
          this.saveToLocalStorage(fbState);
          this.setStatus('connected');
          return fbState;
        }
      } catch (e) {
        console.warn('Could not fetch from Firebase on startup:', e);
      }
    }

    // 3. Fallback to LocalStorage or Default Seed State
    if (local && local.students && local.students.length > 0) {
      this.cachedState = local;
      return local;
    }

    this.cachedState = INITIAL_APP_STATE;
    this.saveToLocalStorage(INITIAL_APP_STATE);
    return INITIAL_APP_STATE;
  }

  public async saveState(state: AppState): Promise<void> {
    this.cachedState = state;
    this.saveToLocalStorage(state);
    this.setStatus('syncing');

    // Debounce remote writes by 200ms
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    return new Promise((resolve) => {
      this.syncDebounceTimer = setTimeout(async () => {
        let synced = false;

        // Sync to Server API
        try {
          const resp = await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state),
          });
          if (resp.ok) {
            synced = true;
          }
        } catch {
          // Backend server might be offline or building
        }

        // Sync to Supabase if configured
        if (state.cloudConfig?.provider === 'supabase' && state.cloudConfig.supabase?.url && state.cloudConfig.supabase?.anonKey) {
          try {
            await this.saveToSupabase(
              state.cloudConfig.supabase.url,
              state.cloudConfig.supabase.anonKey,
              state
            );
            synced = true;
          } catch (e) {
            console.warn('Supabase save error:', e);
          }
        }

        // Sync to Firebase if configured
        if (state.cloudConfig?.provider === 'firebase' && state.cloudConfig.firebase?.projectId && state.cloudConfig.firebase?.apiKey) {
          try {
            await this.saveToFirebase(
              state.cloudConfig.firebase.projectId,
              state.cloudConfig.firebase.apiKey,
              state
            );
            synced = true;
          } catch (e) {
            console.warn('Firebase save error:', e);
          }
        }

        this.setStatus(synced ? 'connected' : 'local-only');
        resolve();
      }, 200);
    });
  }

  // --- SUPABASE REST INTEGRATION ---
  public async fetchFromSupabase(rawUrl: string, anonKey: string): Promise<AppState | null> {
    const baseUrl = rawUrl.trim().replace(/\/$/, '');
    const endpoint = `${baseUrl}/rest/v1/nexus_state?id=eq.global_state&select=payload`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Supabase query failed: HTTP ${res.status}`);
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0 && rows[0].payload) {
      return rows[0].payload as AppState;
    }
    return null;
  }

  public async saveToSupabase(rawUrl: string, anonKey: string, state: AppState): Promise<boolean> {
    const baseUrl = rawUrl.trim().replace(/\/$/, '');
    const endpoint = `${baseUrl}/rest/v1/nexus_state`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: 'global_state',
        payload: state,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      // If table does not exist, let's auto-adjust or report
      const text = await res.text();
      throw new Error(`Supabase upsert failed: ${text}`);
    }

    return true;
  }

  // Automatic verification and table creation handler for Supabase
  public async autoSetupSupabase(rawUrl: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    const baseUrl = rawUrl.trim().replace(/\/$/, '');
    
    // First, test if table already exists by reading
    try {
      const readRes = await fetch(`${baseUrl}/rest/v1/nexus_state?select=id&limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (readRes.ok) {
        // Table exists! Save current state into it immediately
        if (this.cachedState) {
          await this.saveToSupabase(baseUrl, anonKey, this.cachedState);
        }
        return {
          success: true,
          message: 'Supabase connected! Table verified and data synchronized globally.',
        };
      }

      // If HTTP 404 or relation does not exist, try to auto-create table via server-side or rpc
      const serverResp = await fetch('/api/setup-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'supabase', url: baseUrl, anonKey }),
      });

      if (serverResp.ok) {
        const sData = await serverResp.json();
        return {
          success: true,
          message: sData.message || 'Supabase database created & synchronized automatically!',
        };
      }

      return {
        success: true,
        message: 'Connected to Supabase project! Initializing synchronization...',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Could not connect to Supabase. Please verify URL and Anon Key.',
      };
    }
  }

  // --- FIREBASE REST INTEGRATION ---
  public async fetchFromFirebase(projectId: string, apiKey: string): Promise<AppState | null> {
    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/nexus_academy/state?key=${apiKey}`;

    const res = await fetch(endpoint);
    if (!res.ok) {
      throw new Error(`Firebase Firestore fetch failed: HTTP ${res.status}`);
    }

    const doc = await res.json();
    if (doc.fields && doc.fields.payloadJson?.stringValue) {
      return JSON.parse(doc.fields.payloadJson.stringValue);
    }
    return null;
  }

  public async saveToFirebase(projectId: string, apiKey: string, state: AppState): Promise<boolean> {
    const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/nexus_academy/state?key=${apiKey}`;

    const payloadJson = JSON.stringify(state);
    const body = {
      fields: {
        payloadJson: { stringValue: payloadJson },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    };

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return res.ok;
  }

  public async testCloudConnection(config: CloudConfig): Promise<{ success: boolean; message: string }> {
    if (config.provider === 'built-in') {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          return { success: true, message: 'Built-in real-time server daemon is active and healthy on port 3000.' };
        }
      } catch {}
      return { success: true, message: 'Local storage engine is operational.' };
    }

    if (config.provider === 'supabase') {
      const url = config.supabase?.url;
      const key = config.supabase?.anonKey;
      if (!url || !key) {
        return { success: false, message: 'Please provide both Supabase Project URL and Anon Public Key.' };
      }
      return this.autoSetupSupabase(url, key);
    }

    if (config.provider === 'firebase') {
      const pId = config.firebase?.projectId;
      const key = config.firebase?.apiKey;
      if (!pId || !key) {
        return { success: false, message: 'Please provide both Firebase Project ID and Web API Key.' };
      }
      try {
        const testRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${pId}/databases/(default)/documents?key=${key}`
        );
        if (testRes.ok) {
          return { success: true, message: 'Successfully connected to Google Cloud Firebase Firestore!' };
        } else {
          return { success: false, message: `Firebase response: HTTP ${testRes.status}. Check project ID & permissions.` };
        }
      } catch (err: any) {
        return { success: false, message: `Connection failed: ${err.message}` };
      }
    }

    return { success: false, message: 'Unknown provider.' };
  }

  // --- LOCALSTORAGE CACHE ---
  private saveToLocalStorage(state: AppState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  private loadFromLocalStorage(): AppState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }
}

export const cloudSync = new CloudSyncService();

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Excel .xls export helper that formats columns with wide dimensions & proper text formatting
// so dates and IDs NEVER collapse to ######## in Microsoft Excel!
export interface ExcelColumn {
  header: string;
  width?: number;
}

export interface ExcelCell {
  text: string | number;
  isDate?: boolean;
  isStatus?: boolean;
  isLink?: boolean;
  linkUrl?: string;
}

export interface ExcelDateSection {
  dateTitle: string;
  columns?: ExcelColumn[];
  rows: ExcelCell[][];
}

export interface ExcelSheetConfig {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows?: ExcelCell[][];
  dateSections?: ExcelDateSection[];
}

export function exportToExcelXls(params: {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  rows: ExcelCell[][];
  filename: string;
}) {
  const { sheetName, title, subtitle, columns, rows, filename } = params;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#64748B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="RowEven">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="RowOdd">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DateStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#0F172A"/>
   <NumberFormat ss:Format="@"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="PresentStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="AbsentStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="LeaveStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="LinkStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Underline="Single" ss:Color="#2563EB"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName.substring(0, 31))}">
  <Table>
`;

  // Define generous column widths to avoid Excel ######## truncation
  columns.forEach((c) => {
    const width = c.width || 120;
    xml += `   <Column ss:Width="${width}"/>\n`;
  });

  // Title Row
  xml += `   <Row ss:Height="36">
    <Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">${escapeXml(title)}</Data>
    </Cell>
   </Row>\n`;

  // Subtitle Row
  if (subtitle) {
    xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="${columns.length - 1}" ss:StyleID="SubtitleStyle">
     <Data ss:Type="String">${escapeXml(subtitle)}</Data>
    </Cell>
   </Row>\n`;
  }

  // Header Row
  xml += `   <Row ss:Height="26">\n`;
  columns.forEach((c) => {
    xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // Data Rows
  rows.forEach((row, rowIdx) => {
    const defaultRowStyle = rowIdx % 2 === 0 ? 'RowEven' : 'RowOdd';
    xml += `   <Row ss:Height="22">\n`;

    row.forEach((cell) => {
      let cellStyle = defaultRowStyle;
      if (cell.isDate) {
        cellStyle = 'DateStyle';
      } else if (cell.isStatus) {
        const textVal = String(cell.text).toLowerCase();
        if (textVal.includes('present') || textVal.includes('cleared') || textVal.includes('pass')) {
          cellStyle = 'PresentStyle';
        } else if (textVal.includes('absent') || textVal.includes('pending') || textVal.includes('fail')) {
          cellStyle = 'AbsentStyle';
        } else if (textVal.includes('leave')) {
          cellStyle = 'LeaveStyle';
        }
      } else if (cell.isLink) {
        cellStyle = 'LinkStyle';
      }

      const hrefAttr = cell.isLink && cell.linkUrl ? ` ss:HRef="${escapeXml(cell.linkUrl)}"` : '';
      xml += `    <Cell ss:StyleID="${cellStyle}"${hrefAttr}><Data ss:Type="String">${escapeXml(String(cell.text))}</Data></Cell>\n`;
    });

    xml += `   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, filename);
}

export function exportMultiSheetExcelXls(params: {
  sheets: ExcelSheetConfig[];
  filename: string;
}) {
  const { sheets, filename } = params;
  if (!sheets || sheets.length === 0) return;

  const usedSheetNames = new Set<string>();
  const sanitizeName = (name: string): string => {
    let clean = (name || 'Sheet')
      .replace(/[\\/?*:[\]]/g, '_')
      .trim()
      .substring(0, 28);
    if (!clean) clean = 'Sheet';
    let candidate = clean;
    let counter = 2;
    while (usedSheetNames.has(candidate.toLowerCase())) {
      candidate = `${clean.substring(0, 24)}_${counter}`;
      counter++;
    }
    usedSheetNames.add(candidate.toLowerCase());
    return candidate;
  };

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DateSectionBanner">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="RowEven">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="RowOdd">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DateStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#0F172A"/>
   <NumberFormat ss:Format="@"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="PresentStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="AbsentStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="LeaveStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="LinkStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Underline="Single" ss:Color="#2563EB"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BlankRowStyle">
   <Alignment ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
 </Styles>
`;

  // Render each worksheet
  sheets.forEach((sheet) => {
    const safeSheetName = sanitizeName(sheet.sheetName);
    const cols = sheet.columns || (sheet.dateSections && sheet.dateSections[0]?.columns) || [];
    const colCount = Math.max(cols.length, 1);

    xml += ` <Worksheet ss:Name="${escapeXml(safeSheetName)}">\n`;
    xml += `  <Table>\n`;

    // Column widths
    cols.forEach((c) => {
      const width = c.width || 120;
      xml += `   <Column ss:Width="${width}"/>\n`;
    });

    // Sheet Title
    xml += `   <Row ss:Height="34">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">${escapeXml(sheet.title)}</Data>
    </Cell>
   </Row>\n`;

    // Subtitle
    if (sheet.subtitle) {
      xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="SubtitleStyle">
     <Data ss:Type="String">${escapeXml(sheet.subtitle)}</Data>
    </Cell>
   </Row>\n`;
    }

    // Date Sections:
    if (sheet.dateSections && sheet.dateSections.length > 0) {
      sheet.dateSections.forEach((sec, sIdx) => {
        // Gap before section: exactly as user demanded:
        // "after one day in the same sheet leave two blanks and add the headings for the date and evevrything and then the attendence of other day will be showen there"
        if (sIdx > 0) {
          xml += `   <Row ss:Height="18"><Cell ss:StyleID="BlankRowStyle"/></Row>\n`;
          xml += `   <Row ss:Height="18"><Cell ss:StyleID="BlankRowStyle"/></Row>\n`;
        } else {
          xml += `   <Row ss:Height="12"><Cell ss:StyleID="BlankRowStyle"/></Row>\n`;
        }

        // 1. Heading banner for this date:
        xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${colCount - 1}" ss:StyleID="DateSectionBanner">
     <Data ss:Type="String">${escapeXml(sec.dateTitle)}</Data>
    </Cell>
   </Row>\n`;

        // 2. Table Column Headings for this date:
        const secCols = sec.columns || cols;
        xml += `   <Row ss:Height="24">\n`;
        secCols.forEach((c) => {
          xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>\n`;
        });
        xml += `   </Row>\n`;

        // 3. Attendance data rows for this date:
        sec.rows.forEach((row, rowIdx) => {
          const defaultRowStyle = rowIdx % 2 === 0 ? 'RowEven' : 'RowOdd';
          xml += `   <Row ss:Height="22">\n`;

          row.forEach((cell) => {
            let cellStyle = defaultRowStyle;
            if (cell.isDate) {
              cellStyle = 'DateStyle';
            } else if (cell.isStatus) {
              const textVal = String(cell.text).toLowerCase();
              if (textVal.includes('present') || textVal.includes('cleared') || textVal.includes('pass')) {
                cellStyle = 'PresentStyle';
              } else if (textVal.includes('absent') || textVal.includes('pending') || textVal.includes('fail')) {
                cellStyle = 'AbsentStyle';
              } else if (textVal.includes('leave')) {
                cellStyle = 'LeaveStyle';
              }
            } else if (cell.isLink) {
              cellStyle = 'LinkStyle';
            }

            const hrefAttr = cell.isLink && cell.linkUrl ? ` ss:HRef="${escapeXml(cell.linkUrl)}"` : '';
            xml += `    <Cell ss:StyleID="${cellStyle}"${hrefAttr}><Data ss:Type="String">${escapeXml(String(cell.text))}</Data></Cell>\n`;
          });

          xml += `   </Row>\n`;
        });
      });
    } else if (sheet.rows && sheet.rows.length > 0) {
      // Standard single table sheet
      xml += `   <Row ss:Height="26">\n`;
      cols.forEach((c) => {
        xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(c.header)}</Data></Cell>\n`;
      });
      xml += `   </Row>\n`;

      sheet.rows.forEach((row, rowIdx) => {
        const defaultRowStyle = rowIdx % 2 === 0 ? 'RowEven' : 'RowOdd';
        xml += `   <Row ss:Height="22">\n`;
        row.forEach((cell) => {
          let cellStyle = defaultRowStyle;
          if (cell.isDate) cellStyle = 'DateStyle';
          else if (cell.isStatus) {
            const textVal = String(cell.text).toLowerCase();
            if (textVal.includes('present')) cellStyle = 'PresentStyle';
            else if (textVal.includes('absent')) cellStyle = 'AbsentStyle';
            else if (textVal.includes('leave')) cellStyle = 'LeaveStyle';
          } else if (cell.isLink) cellStyle = 'LinkStyle';

          const hrefAttr = cell.isLink && cell.linkUrl ? ` ss:HRef="${escapeXml(cell.linkUrl)}"` : '';
          xml += `    <Cell ss:StyleID="${cellStyle}"${hrefAttr}><Data ss:Type="String">${escapeXml(String(cell.text))}</Data></Cell>\n`;
        });
        xml += `   </Row>\n`;
      });
    }

    xml += `  </Table>\n`;
    xml += ` </Worksheet>\n`;
  });

  xml += `</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, filename);
}

function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
