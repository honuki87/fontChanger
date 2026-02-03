import { SiteSettings, ApplyStylesMessage, ExtensionMessage } from '../types/storage';

const STYLE_ID = 'readable-font-fix';

// 현재 도메인 추출
function getCurrentDomain(): string {
    return window.location.hostname;
}

// CSS 생성
function generateCSS(settings: SiteSettings): string {
    const { fontFamily, styles } = settings;

    // 아이콘 폰트 보호를 위한 선택자
    const iconExclusions = [
        'i',
        '[class*="icon"]',
        '[class*="Icon"]',
        '[class*="fa-"]',
        '[class*="fa "]',
        '[class*="fas "]',
        '[class*="far "]',
        '[class*="fab "]',
        '[class*="material-icons"]',
        '[class*="glyphicon"]',
        '[class*="emoji"]',
        'svg',
        'svg *',
        'code',
        'pre',
        'kbd',
        '.mono',
        '[class*="monospace"]'
    ];

    const notSelectors = iconExclusions.map(s => `:not(${s})`).join('');
    const fontSizePercent = ((styles.fontSizeScale || 1) * 100).toFixed(0);

    // font-weight가 'inherit'이면 원래 사이트 굵기 유지
    const fontWeightCSS = styles.fontWeight === 'inherit'
        ? ''
        : `font-weight: ${styles.fontWeight} !important;`;

    // font-size는 html에만 적용 (중첩 방지)
    // 나머지 스타일은 모든 요소에 적용
    return `
    html {
      font-size: ${fontSizePercent}% !important;
    }
    *${notSelectors} {
      font-family: "${fontFamily}", sans-serif !important;
      line-height: ${styles.lineHeight} !important;
      letter-spacing: ${styles.letterSpacing} !important;
      word-spacing: ${styles.wordSpacing} !important;
      ${fontWeightCSS}
    }
  `;
}

// 스타일 태그 주입
function injectStyles(settings: SiteSettings): void {
    removeStyles(); // 기존 스타일 제거

    const styleElement = document.createElement('style');
    styleElement.id = STYLE_ID;
    styleElement.textContent = generateCSS(settings);

    // document.head가 없으면 documentElement에 추가
    const target = document.head || document.documentElement;
    target.appendChild(styleElement);
}

// 스타일 태그 제거
function removeStyles(): void {
    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) {
        existingStyle.remove();
    }
}

// 스토리지에서 현재 도메인 설정 로드 및 적용
async function loadAndApplySettings(): Promise<void> {
    const domain = getCurrentDomain();

    try {
        const result = await chrome.storage.sync.get({
            favoriteFonts: [],
            siteSettings: {}
        });

        const siteSettings = result.siteSettings[domain];

        if (siteSettings && siteSettings.isActive) {
            injectStyles(siteSettings);
        } else {
            removeStyles();
        }
    } catch (error) {
        console.error('[Readable] Failed to load settings:', error);
    }
}

// 메시지 리스너 (팝업에서 실시간 스타일 적용)
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.action === 'APPLY_STYLES') {
        const msg = message as ApplyStylesMessage;

        if (msg.settings) {
            injectStyles(msg.settings);
        } else {
            removeStyles();
        }

        sendResponse({ success: true });
    }

    return true; // 비동기 응답을 위해 true 반환
});

// SPA 대응: MutationObserver로 스타일 태그 유지
function setupMutationObserver(): void {
    let isApplied = !!document.getElementById(STYLE_ID);

    const observer = new MutationObserver((_mutations) => {
        // 스타일이 적용되어 있었는데 사라진 경우 재적용
        const styleExists = !!document.getElementById(STYLE_ID);

        if (isApplied && !styleExists) {
            // 스타일이 제거됨 - 재적용 시도
            loadAndApplySettings();
        }

        isApplied = !!document.getElementById(STYLE_ID);
    });

    // DOM 변화 감시 시작
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

// 스토리지 변경 감시 (다른 탭에서 설정 변경 시 반영)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.siteSettings) {
        loadAndApplySettings();
    }
});

// 초기화
function init(): void {
    // 페이지 로드 시 설정 적용
    loadAndApplySettings();

    // DOM이 준비되면 MutationObserver 설정
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMutationObserver);
    } else {
        setupMutationObserver();
    }
}

// 실행
init();
