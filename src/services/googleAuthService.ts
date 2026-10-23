import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getGoogleUser = (): User | null => {
  return cachedUser;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedUser = null;
};

export interface AppendAnnouncementParams {
  title: string;
  content: string;
  department: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl3?: string;
}

/**
 * Directly append an announcement row into Google Sheet using Google Sheets API v4
 */
export async function appendAnnouncementToGoogleSheet(
  item: AppendAnnouncementParams,
  token?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) {
    return {
      success: false,
      error: 'กรุณาเชื่อมต่อบัญชี Google (Sign in with Google) เพื่อบันทึกข้อมูลเข้า Google Sheet โดยตรง',
    };
  }

  const spreadsheetId = '1cfsHq0UnSl6cwUgX7DQXeyDbnwDvIb01Y3Xb01PgxyU';
  const targetGid = 1228686844;

  // 1. Resolve sheet tab name from spreadsheet metadata
  let sheetName = 'การตอบแบบฟอร์ม 1';
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const targetSheet = meta.sheets?.find(
        (s: any) => s.properties?.sheetId === targetGid
      );
      if (targetSheet?.properties?.title) {
        sheetName = targetSheet.properties.title;
      } else if (meta.sheets?.[0]?.properties?.title) {
        sheetName = meta.sheets[0].properties.title;
      }
    }
  } catch (err) {
    console.warn('Could not fetch sheet metadata, fallback to default name:', err);
  }

  const now = new Date();
  const timestampStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const rowValues = [
    timestampStr,
    item.title,
    item.content.replace(/\n/g, ' '),
    item.department,
    item.startDate || `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
    item.endDate || '',
    item.imageUrl || '',
    item.imageUrl2 || '',
    item.imageUrl3 || '',
  ];

  try {
    const encodedRange = encodeURIComponent(`'${sheetName}'!A:I`);
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `'${sheetName}'!A:I`,
          majorDimension: 'ROWS',
          values: [rowValues],
        }),
      }
    );

    if (appendRes.ok) {
      return {
        success: true,
        message: 'บันทึกและซิงค์ข้อมูลเข้าสู่ Google Sheet สำเร็จเรียบร้อยแล้ว 100%',
      };
    } else {
      const errJson = await appendRes.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${appendRes.status}`;
      return {
        success: false,
        error: `Google Sheets API Error: ${errMsg}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'ไม่สามารถเชื่อมต่อกับ Google Sheets API ได้',
    };
  }
}
