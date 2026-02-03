// 사이트별 스타일 설정
export interface SiteStyles {
    lineHeight: number;        // 예: 1.6
    letterSpacing: string;     // 예: "0.5px"
    wordSpacing: string;       // 예: "1px"
    fontWeight: string;        // 예: "400"
    fontSizeScale: number;     // 예: 1 (100%), 1.2 (120%)
}

// 특정 사이트에 대한 설정
export interface SiteSettings {
    isActive: boolean;         // 활성화 여부
    fontFamily: string;        // favoriteFonts 중 하나
    styles: SiteStyles;
}

// 스타일 프리셋
export interface StylePreset {
    id: string;                // 고유 ID
    name: string;              // 프리셋 이름
    fontFamily: string;        // 폰트
    styles: SiteStyles;        // 스타일 설정
}

// 전체 스토리지 구조
export interface UserStorage {
    // 사용자가 등록한 폰트 이름 목록
    favoriteFonts: string[];

    // 사이트별 설정 (Key: 도메인)
    siteSettings: {
        [domain: string]: SiteSettings;
    };

    // 스타일 프리셋 목록
    presets: StylePreset[];
}

// 기본값
export const DEFAULT_SITE_STYLES: SiteStyles = {
    lineHeight: 1.6,
    letterSpacing: "0px",
    wordSpacing: "0px",
    fontWeight: "inherit",
    fontSizeScale: 1,
};

export const DEFAULT_STORAGE: UserStorage = {
    favoriteFonts: [],
    siteSettings: {},
    presets: [],
};

// 메시지 타입
export interface ApplyStylesMessage {
    action: "APPLY_STYLES";
    domain: string;
    settings: SiteSettings | null;
}

export type ExtensionMessage = ApplyStylesMessage;
