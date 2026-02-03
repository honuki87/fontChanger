import {
    UserStorage,
    SiteSettings,
    StylePreset,
    DEFAULT_STORAGE,
    DEFAULT_SITE_STYLES
} from '../types/storage';

// 스토리지 전체 조회
export async function getStorage(): Promise<UserStorage> {
    const result = await chrome.storage.sync.get(DEFAULT_STORAGE);
    // presets 필드가 없는 경우 기본값 제공 (마이그레이션)
    return {
        ...DEFAULT_STORAGE,
        ...result,
        presets: result.presets || [],
    } as UserStorage;
}

// 스토리지 업데이트
export async function setStorage(data: Partial<UserStorage>): Promise<void> {
    await chrome.storage.sync.set(data);
}

// 즐겨찾기 폰트 추가
export async function addFavoriteFont(fontName: string): Promise<boolean> {
    const storage = await getStorage();
    const trimmedName = fontName.trim();

    if (!trimmedName || storage.favoriteFonts.includes(trimmedName)) {
        return false; // 중복 또는 빈 문자열
    }

    storage.favoriteFonts.push(trimmedName);
    await setStorage({ favoriteFonts: storage.favoriteFonts });
    return true;
}

// 즐겨찾기 폰트 삭제
export async function removeFavoriteFont(fontName: string): Promise<void> {
    const storage = await getStorage();
    storage.favoriteFonts = storage.favoriteFonts.filter(f => f !== fontName);
    await setStorage({ favoriteFonts: storage.favoriteFonts });
}

// 사이트 설정 조회
export async function getSiteSettings(domain: string): Promise<SiteSettings | null> {
    const storage = await getStorage();
    return storage.siteSettings[domain] || null;
}

// 사이트 등록/업데이트
export async function setSiteSettings(
    domain: string,
    settings: SiteSettings
): Promise<void> {
    const storage = await getStorage();
    storage.siteSettings[domain] = settings;
    await setStorage({ siteSettings: storage.siteSettings });
}

// 사이트 삭제
export async function removeSite(domain: string): Promise<void> {
    const storage = await getStorage();
    delete storage.siteSettings[domain];
    await setStorage({ siteSettings: storage.siteSettings });
}

// 새 사이트 기본 설정 생성
export function createDefaultSiteSettings(fontFamily: string): SiteSettings {
    return {
        isActive: true,
        fontFamily,
        styles: { ...DEFAULT_SITE_STYLES },
    };
}

// URL에서 도메인 추출
export function extractDomain(url: string): string | null {
    try {
        const urlObj = new URL(url);
        // chrome://, edge:// 등 브라우저 내부 페이지 제외
        if (urlObj.protocol === 'chrome:' ||
            urlObj.protocol === 'edge:' ||
            urlObj.protocol === 'about:' ||
            urlObj.protocol === 'chrome-extension:') {
            return null;
        }
        return urlObj.hostname;
    } catch {
        return null;
    }
}

// 고유 ID 생성
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 프리셋 추가
export async function addPreset(
    name: string,
    fontFamily: string,
    styles: SiteSettings['styles']
): Promise<StylePreset> {
    const storage = await getStorage();
    const newPreset: StylePreset = {
        id: generateId(),
        name: name.trim(),
        fontFamily,
        styles: { ...styles },
    };
    storage.presets.push(newPreset);
    await setStorage({ presets: storage.presets });
    return newPreset;
}

// 프리셋 삭제
export async function removePreset(presetId: string): Promise<void> {
    const storage = await getStorage();
    storage.presets = storage.presets.filter(p => p.id !== presetId);
    await setStorage({ presets: storage.presets });
}

// 프리셋 수정
export async function updatePreset(
    presetId: string,
    name: string,
    fontFamily: string,
    styles: SiteSettings['styles']
): Promise<void> {
    const storage = await getStorage();
    const index = storage.presets.findIndex(p => p.id === presetId);
    if (index !== -1) {
        storage.presets[index] = {
            ...storage.presets[index],
            name: name.trim(),
            fontFamily,
            styles: { ...styles },
        };
        await setStorage({ presets: storage.presets });
    }
}
