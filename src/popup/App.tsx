import { useState, useEffect } from 'react';
import {
    getStorage,
    getSiteSettings,
    setSiteSettings,
    createDefaultSiteSettings,
    extractDomain
} from '../utils/storage';
import { SiteSettings, UserStorage, ApplyStylesMessage, StylePreset } from '../types/storage';

function App() {
    const [domain, setDomain] = useState<string | null>(null);
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [storage, setStorageState] = useState<UserStorage>({ favoriteFonts: [], siteSettings: {}, presets: [] });
    const [isInvalidPage, setIsInvalidPage] = useState(false);

    useEffect(() => {
        initPopup();
    }, []);

    async function initPopup() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url) {
            setIsInvalidPage(true);
            return;
        }

        const extractedDomain = extractDomain(tab.url);
        if (!extractedDomain) {
            setIsInvalidPage(true);
            return;
        }

        setDomain(extractedDomain);

        const storageData = await getStorage();
        setStorageState(storageData);

        const siteSettings = await getSiteSettings(extractedDomain);
        setSettings(siteSettings);
    }

    async function handleRegisterSite() {
        if (!domain || storage.favoriteFonts.length === 0) return;

        const defaultSettings = createDefaultSiteSettings(storage.favoriteFonts[0]);
        await setSiteSettings(domain, defaultSettings);
        setSettings(defaultSettings);
        applyStyles(defaultSettings);
    }

    async function handleToggleActive() {
        if (!domain || !settings) return;

        const newSettings = { ...settings, isActive: !settings.isActive };
        await setSiteSettings(domain, newSettings);
        setSettings(newSettings);
        applyStyles(newSettings);
    }

    async function handleFontChange(fontFamily: string) {
        if (!domain || !settings) return;

        const newSettings = { ...settings, fontFamily };
        await setSiteSettings(domain, newSettings);
        setSettings(newSettings);
        applyStyles(newSettings);
    }

    async function handleStyleChange(key: keyof SiteSettings['styles'], value: string | number) {
        if (!domain || !settings) return;

        const newSettings = {
            ...settings,
            styles: { ...settings.styles, [key]: value }
        };
        await setSiteSettings(domain, newSettings);
        setSettings(newSettings);
        applyStyles(newSettings);
    }

    async function handleApplyPreset(preset: StylePreset) {
        if (!domain || !settings) return;

        const newSettings = {
            ...settings,
            fontFamily: preset.fontFamily,
            styles: { ...preset.styles }
        };
        await setSiteSettings(domain, newSettings);
        setSettings(newSettings);
        applyStyles(newSettings);
    }

    function applyStyles(newSettings: SiteSettings) {
        if (!domain) return;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                const message: ApplyStylesMessage = {
                    action: "APPLY_STYLES",
                    domain,
                    settings: newSettings.isActive ? newSettings : null
                };
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }

    // 유효하지 않은 페이지
    if (isInvalidPage) {
        return (
            <div className="w-80 p-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="text-center py-6">
                    <div className="text-3xl mb-3 opacity-50">🚫</div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        이 페이지에서는<br />사용할 수 없습니다.
                    </p>
                </div>
            </div>
        );
    }

    // 로딩 중
    if (!domain) {
        return (
            <div className="w-80 p-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="text-center py-8">
                    <div className="text-xl opacity-50">로딩 중...</div>
                </div>
            </div>
        );
    }

    // 폰트 미등록
    if (storage.favoriteFonts.length === 0) {
        return (
            <div className="w-80 p-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="text-center py-6">
                    <div className="text-3xl mb-3 opacity-50">📝</div>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        먼저 설정 페이지에서<br />폰트를 등록해주세요.
                    </p>
                    <button
                        onClick={() => chrome.runtime.openOptionsPage()}
                        className="btn-primary"
                    >
                        설정 열기
                    </button>
                </div>
            </div>
        );
    }

    // 사이트 미등록
    if (!settings) {
        return (
            <div className="w-80 p-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>현재 사이트</div>
                    <div className="font-mono text-sm truncate">{domain}</div>
                </div>

                <div className="text-center py-4">
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        이 사이트에 폰트를 적용하시겠습니까?
                    </p>
                    <button onClick={handleRegisterSite} className="btn-primary w-full">
                        폰트 적용하기
                    </button>
                </div>
            </div>
        );
    }

    // 등록된 사이트 - 스타일 편집 UI
    return (
        <div className="w-80 p-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex-1 min-w-0">
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>현재 사이트</div>
                    <div className="font-mono text-sm truncate">{domain}</div>
                </div>

                {/* 토글 스위치 */}
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={settings.isActive}
                        onChange={handleToggleActive}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>

            {settings.isActive && (
                <div className="space-y-4">
                    {/* 프리셋 선택 */}
                    {storage.presets.length > 0 && (
                        <div>
                            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                프리셋 적용
                            </label>
                            <select
                                onChange={(e) => {
                                    const preset = storage.presets.find(p => p.id === e.target.value);
                                    if (preset) handleApplyPreset(preset);
                                }}
                                className="input-field"
                                defaultValue=""
                            >
                                <option value="" disabled>프리셋 선택...</option>
                                {storage.presets.map((preset: StylePreset) => (
                                    <option key={preset.id} value={preset.id}>
                                        {preset.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 폰트 선택 */}
                    <div>
                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                            폰트
                        </label>
                        <select
                            value={settings.fontFamily}
                            onChange={(e) => handleFontChange(e.target.value)}
                            className="input-field"
                        >
                            {storage.favoriteFonts.map((font) => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Font Size Scale */}
                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>폰트 크기</span>
                            <span>{((settings.styles.fontSizeScale || 1) * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.8"
                            max="1.6"
                            step="0.05"
                            value={settings.styles.fontSizeScale || 1}
                            onChange={(e) => handleStyleChange('fontSizeScale', parseFloat(e.target.value))}
                            className="slider-track w-full"
                        />
                    </div>

                    {/* Line Height */}
                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>행간</span>
                            <span>{settings.styles.lineHeight}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.1"
                            value={settings.styles.lineHeight}
                            onChange={(e) => handleStyleChange('lineHeight', parseFloat(e.target.value))}
                            className="slider-track w-full"
                        />
                    </div>

                    {/* Letter Spacing */}
                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>자간</span>
                            <span>{settings.styles.letterSpacing}</span>
                        </div>
                        <input
                            type="range"
                            min="-2"
                            max="10"
                            step="0.5"
                            value={parseFloat(settings.styles.letterSpacing)}
                            onChange={(e) => handleStyleChange('letterSpacing', `${e.target.value}px`)}
                            className="slider-track w-full"
                        />
                    </div>

                    {/* Word Spacing */}
                    <div>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>단어 간격</span>
                            <span>{settings.styles.wordSpacing}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            step="1"
                            value={parseFloat(settings.styles.wordSpacing)}
                            onChange={(e) => handleStyleChange('wordSpacing', `${e.target.value}px`)}
                            className="slider-track w-full"
                        />
                    </div>

                    {/* Font Weight */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>굵기 조절</span>
                            <label className="toggle-switch" style={{ transform: 'scale(0.8)' }}>
                                <input
                                    type="checkbox"
                                    checked={settings.styles.fontWeight !== 'inherit'}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            handleStyleChange('fontWeight', '400');
                                        } else {
                                            handleStyleChange('fontWeight', 'inherit');
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                        {settings.styles.fontWeight !== 'inherit' && (
                            <>
                                <div className="flex justify-between text-xs mb-1">
                                    <span style={{ color: 'var(--text-secondary)' }}></span>
                                    <span>{settings.styles.fontWeight}</span>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="900"
                                    step="100"
                                    value={parseInt(settings.styles.fontWeight) || 400}
                                    onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                                    className="slider-track w-full"
                                />
                            </>
                        )}
                        {settings.styles.fontWeight === 'inherit' && (
                            <div className="text-xs py-1" style={{ color: 'var(--text-secondary)' }}>
                                원본 유지
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 설정 페이지 링크 */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className="text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    ⚙️ 전체 설정
                </button>
            </div>
        </div>
    );
}

export default App;
