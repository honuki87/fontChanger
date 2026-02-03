import { useState, useEffect } from 'react';
import {
    getStorage,
    addFavoriteFont,
    removeFavoriteFont,
    removeSite,
    setSiteSettings,
    addPreset,
    removePreset,
    updatePreset
} from '../utils/storage';
import { UserStorage, StylePreset, SiteStyles, DEFAULT_SITE_STYLES } from '../types/storage';

// Local Font Access API 타입
interface FontData {
    family: string;
    fullName: string;
    postscriptName: string;
    style: string;
}

declare global {
    interface Window {
        queryLocalFonts?: () => Promise<FontData[]>;
    }
}

function App() {
    const [storage, setStorageState] = useState<UserStorage>({
        favoriteFonts: [],
        siteSettings: {},
        presets: [],
    });

    // 폰트 관련 상태
    const [systemFonts, setSystemFonts] = useState<string[]>([]);
    const [selectedFont, setSelectedFont] = useState('');
    const [manualFontInput, setManualFontInput] = useState('');
    const [useManualInput, setUseManualInput] = useState(false);
    const [fontAccessStatus, setFontAccessStatus] = useState<'loading' | 'granted' | 'denied' | 'unsupported'>('loading');

    // 프리셋 관련 상태
    const [presetName, setPresetName] = useState('');
    const [presetStyles, setPresetStyles] = useState<SiteStyles>({ ...DEFAULT_SITE_STYLES });
    const [presetFont, setPresetFont] = useState('');
    const [editingPreset, setEditingPreset] = useState<StylePreset | null>(null);

    const [message, setMessage] = useState('');

    useEffect(() => {
        loadStorage();
        loadSystemFonts();
    }, []);

    useEffect(() => {
        if (storage.favoriteFonts.length > 0 && !presetFont) {
            setPresetFont(storage.favoriteFonts[0]);
        }
    }, [storage.favoriteFonts]);

    async function loadStorage() {
        const data = await getStorage();
        setStorageState(data);
    }

    async function loadSystemFonts() {
        if (!window.queryLocalFonts) {
            setFontAccessStatus('unsupported');
            setUseManualInput(true);
            return;
        }

        try {
            const fonts = await window.queryLocalFonts();
            const uniqueFamilies = [...new Set(fonts.map(f => f.family))].sort();
            setSystemFonts(uniqueFamilies);
            setFontAccessStatus('granted');
            if (uniqueFamilies.length > 0) {
                setSelectedFont(uniqueFamilies[0]);
            }
        } catch (error) {
            console.log('Font access denied:', error);
            setFontAccessStatus('denied');
            setUseManualInput(true);
        }
    }

    async function requestFontAccess() {
        if (!window.queryLocalFonts) {
            showMessage('이 브라우저는 폰트 접근 API를 지원하지 않습니다.');
            return;
        }
        await loadSystemFonts();
    }

    async function handleAddFont() {
        const fontToAdd = useManualInput ? manualFontInput.trim() : selectedFont;

        if (!fontToAdd) {
            showMessage('폰트를 선택하거나 입력해주세요.', 'error');
            return;
        }

        const success = await addFavoriteFont(fontToAdd);
        if (success) {
            showMessage(`"${fontToAdd}" 폰트가 추가되었습니다.`);
            setManualFontInput('');
            loadStorage();
        } else {
            showMessage('이미 등록된 폰트입니다.', 'error');
        }
    }

    async function handleRemoveFont(font: string) {
        await removeFavoriteFont(font);
        loadStorage();
    }

    async function handleRemoveSite(domain: string) {
        await removeSite(domain);
        loadStorage();
    }

    function handleEditPreset(preset: StylePreset) {
        setEditingPreset(preset);
        setPresetName(preset.name);
        setPresetFont(preset.fontFamily);
        setPresetStyles({ ...preset.styles });
    }

    function handleCancelEdit() {
        setEditingPreset(null);
        setPresetName('');
        setPresetStyles({ ...DEFAULT_SITE_STYLES });
        if (storage.favoriteFonts.length > 0) {
            setPresetFont(storage.favoriteFonts[0]);
        }
    }

    async function handleSavePreset() {
        if (!presetName.trim()) {
            showMessage('프리셋 이름을 입력해주세요.', 'error');
            return;
        }

        if (!presetFont) {
            showMessage('폰트를 선택해주세요.', 'error');
            return;
        }

        if (editingPreset) {
            // 기존 프리셋 수정
            await updatePreset(editingPreset.id, presetName, presetFont, presetStyles);
            showMessage('프리셋이 수정되었습니다.');
            setEditingPreset(null);
        } else {
            // 새 프리셋 추가
            await addPreset(presetName, presetFont, presetStyles);
            showMessage('프리셋이 저장되었습니다.');
        }

        setPresetName('');
        setPresetStyles({ ...DEFAULT_SITE_STYLES });
        loadStorage();
    }

    async function handleRemovePreset(presetId: string) {
        await removePreset(presetId);
        if (editingPreset?.id === presetId) {
            handleCancelEdit();
        }
        loadStorage();
    }

    function showMessage(msg: string, _type: 'success' | 'error' = 'success') {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    }

    const siteList = Object.entries(storage.siteSettings);

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-3xl mx-auto">
                {/* 헤더 */}
                <header className="mb-8">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Readable 설정
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        폰트와 스타일 프리셋을 관리합니다.
                    </p>
                </header>

                {/* 메시지 */}
                {message && <div className="message mb-4">{message}</div>}

                {/* 폰트 등록 섹션 */}
                <section className="card mb-6">
                    <h2 className="text-lg font-medium mb-4">폰트 등록</h2>

                    {/* 폰트 접근 상태 */}
                    {fontAccessStatus === 'denied' && (
                        <div className="mb-4 p-3 rounded-lg text-sm" style={{
                            backgroundColor: 'rgba(255, 200, 100, 0.1)',
                            border: '1px solid rgba(255, 200, 100, 0.3)',
                            color: '#f0c040'
                        }}>
                            폰트 접근 권한이 필요합니다.
                            <button onClick={requestFontAccess} className="ml-2 underline">
                                권한 요청
                            </button>
                        </div>
                    )}

                    {/* 입력 방식 토글 */}
                    {systemFonts.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 text-sm">
                            <button
                                onClick={() => setUseManualInput(false)}
                                className="px-3 py-1 rounded transition-colors"
                                style={{
                                    backgroundColor: !useManualInput ? 'var(--accent-muted)' : 'transparent',
                                    color: !useManualInput ? 'var(--accent)' : 'var(--text-secondary)'
                                }}
                            >
                                시스템 폰트 선택
                            </button>
                            <button
                                onClick={() => setUseManualInput(true)}
                                className="px-3 py-1 rounded transition-colors"
                                style={{
                                    backgroundColor: useManualInput ? 'var(--accent-muted)' : 'transparent',
                                    color: useManualInput ? 'var(--accent)' : 'var(--text-secondary)'
                                }}
                            >
                                직접 입력
                            </button>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {useManualInput || systemFonts.length === 0 ? (
                            <input
                                type="text"
                                value={manualFontInput}
                                onChange={(e) => setManualFontInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddFont()}
                                placeholder="폰트 이름 입력 (예: Pretendard)"
                                className="input-field flex-1"
                            />
                        ) : (
                            <select
                                value={selectedFont}
                                onChange={(e) => setSelectedFont(e.target.value)}
                                className="input-field flex-1"
                            >
                                {systemFonts.map((font) => (
                                    <option key={font} value={font} style={{ fontFamily: font }}>
                                        {font}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button onClick={handleAddFont} className="btn-primary">
                            추가
                        </button>
                    </div>

                    {/* 등록된 폰트 목록 */}
                    {storage.favoriteFonts.length > 0 && (
                        <div className="mt-4">
                            <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                                등록된 폰트 ({storage.favoriteFonts.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {storage.favoriteFonts.map((font) => (
                                    <span key={font} className="tag">
                                        <span style={{ fontFamily: font }}>{font}</span>
                                        <button onClick={() => handleRemoveFont(font)} className="tag-remove">✕</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* 프리셋 섹션 */}
                <section className="card mb-6">
                    <h2 className="text-lg font-medium mb-4">
                        스타일 프리셋
                        {editingPreset && (
                            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--accent)' }}>
                                (수정 중: {editingPreset.name})
                            </span>
                        )}
                    </h2>

                    {storage.favoriteFonts.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                            먼저 폰트를 등록해주세요.
                        </p>
                    ) : (
                        <>
                            {/* 프리셋 에디터 */}
                            <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                            프리셋 이름
                                        </label>
                                        <input
                                            type="text"
                                            value={presetName}
                                            onChange={(e) => setPresetName(e.target.value)}
                                            placeholder="예: 네이버 읽기용"
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                            폰트
                                        </label>
                                        <select
                                            value={presetFont}
                                            onChange={(e) => setPresetFont(e.target.value)}
                                            className="input-field"
                                        >
                                            {storage.favoriteFonts.map((font) => (
                                                <option key={font} value={font}>{font}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* 스타일 슬라이더들 */}
                                <div className="space-y-4">
                                    {/* 폰트 크기 비율 */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span style={{ color: 'var(--text-secondary)' }}>폰트 크기</span>
                                            <span>{(presetStyles.fontSizeScale * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.8"
                                            max="1.6"
                                            step="0.05"
                                            value={presetStyles.fontSizeScale}
                                            onChange={(e) => setPresetStyles({
                                                ...presetStyles,
                                                fontSizeScale: parseFloat(e.target.value)
                                            })}
                                            className="slider-track w-full"
                                        />
                                    </div>

                                    {/* 행간 */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span style={{ color: 'var(--text-secondary)' }}>행간</span>
                                            <span>{presetStyles.lineHeight}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="3"
                                            step="0.1"
                                            value={presetStyles.lineHeight}
                                            onChange={(e) => setPresetStyles({
                                                ...presetStyles,
                                                lineHeight: parseFloat(e.target.value)
                                            })}
                                            className="slider-track w-full"
                                        />
                                    </div>

                                    {/* 자간 */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span style={{ color: 'var(--text-secondary)' }}>자간</span>
                                            <span>{presetStyles.letterSpacing}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="-2"
                                            max="10"
                                            step="0.5"
                                            value={parseFloat(presetStyles.letterSpacing)}
                                            onChange={(e) => setPresetStyles({
                                                ...presetStyles,
                                                letterSpacing: `${e.target.value}px`
                                            })}
                                            className="slider-track w-full"
                                        />
                                    </div>

                                    {/* 단어 간격 */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span style={{ color: 'var(--text-secondary)' }}>단어 간격</span>
                                            <span>{presetStyles.wordSpacing}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="20"
                                            step="1"
                                            value={parseFloat(presetStyles.wordSpacing)}
                                            onChange={(e) => setPresetStyles({
                                                ...presetStyles,
                                                wordSpacing: `${e.target.value}px`
                                            })}
                                            className="slider-track w-full"
                                        />
                                    </div>

                                    {/* 굵기 */}
                                    <div>
                                        <div className="flex justify-between items-center text-xs mb-1.5">
                                            <span style={{ color: 'var(--text-secondary)' }}>굵기 조절</span>
                                            <label className="toggle-switch" style={{ transform: 'scale(0.8)' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={presetStyles.fontWeight !== 'inherit'}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setPresetStyles({ ...presetStyles, fontWeight: '400' });
                                                        } else {
                                                            setPresetStyles({ ...presetStyles, fontWeight: 'inherit' });
                                                        }
                                                    }}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                        {presetStyles.fontWeight !== 'inherit' && (
                                            <>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span></span>
                                                    <span>{presetStyles.fontWeight}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="100"
                                                    max="900"
                                                    step="100"
                                                    value={parseInt(presetStyles.fontWeight) || 400}
                                                    onChange={(e) => setPresetStyles({
                                                        ...presetStyles,
                                                        fontWeight: e.target.value
                                                    })}
                                                    className="slider-track w-full"
                                                />
                                            </>
                                        )}
                                        {presetStyles.fontWeight === 'inherit' && (
                                            <div className="text-xs py-1" style={{ color: 'var(--text-secondary)' }}>
                                                원본 유지
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleSavePreset}
                                        className="btn-primary flex-1"
                                        disabled={!presetName.trim()}
                                    >
                                        {editingPreset ? '수정 저장' : '프리셋 저장'}
                                    </button>
                                    {editingPreset && (
                                        <button
                                            onClick={handleCancelEdit}
                                            className="btn-secondary"
                                        >
                                            취소
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 저장된 프리셋 목록 */}
                            {storage.presets.length > 0 && (
                                <div>
                                    <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                                        저장된 프리셋 ({storage.presets.length})
                                    </div>
                                    <div className="space-y-2">
                                        {storage.presets.map((preset: StylePreset) => (
                                            <div
                                                key={preset.id}
                                                className="flex items-center justify-between p-3 rounded-lg"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: editingPreset?.id === preset.id ? '1px solid var(--accent)' : '1px solid transparent'
                                                }}
                                            >
                                                <div>
                                                    <div className="font-medium text-sm">{preset.name}</div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        {preset.fontFamily} · 크기 {((preset.styles.fontSizeScale || 1) * 100).toFixed(0)}% · 행간 {preset.styles.lineHeight}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEditPreset(preset)}
                                                        className="text-sm px-3 py-1 rounded hover:bg-white/5"
                                                        style={{ color: 'var(--accent)' }}
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemovePreset(preset.id)}
                                                        className="text-sm px-3 py-1 rounded hover:bg-white/5"
                                                        style={{ color: 'var(--text-secondary)' }}
                                                    >
                                                        삭제
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* 등록된 사이트 섹션 */}
                <section className="card">
                    <h2 className="text-lg font-medium mb-4">등록된 사이트</h2>

                    {siteList.length === 0 ? (
                        <p className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>
                            등록된 사이트가 없습니다.<br />
                            웹사이트에서 팝업을 통해 등록하세요.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {siteList.map(([domain, settings]) => (
                                <div
                                    key={domain}
                                    className="flex items-center gap-3 p-3 rounded-lg"
                                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-mono text-sm truncate">{domain}</div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {settings.fontFamily} · {settings.isActive ? '활성' : '비활성'}
                                        </div>
                                    </div>
                                    {storage.presets.length > 0 && (
                                        <select
                                            className="input-field text-sm py-1"
                                            style={{ width: 'auto', minWidth: '100px' }}
                                            defaultValue=""
                                            onChange={async (e) => {
                                                const preset = storage.presets.find(p => p.id === e.target.value);
                                                if (preset) {
                                                    await setSiteSettings(domain, {
                                                        ...settings,
                                                        fontFamily: preset.fontFamily,
                                                        styles: { ...preset.styles }
                                                    });
                                                    loadStorage();
                                                    showMessage(`"${preset.name}" 프리셋이 적용되었습니다.`);
                                                }
                                            }}
                                        >
                                            <option value="" disabled>프리셋...</option>
                                            {storage.presets.map((preset) => (
                                                <option key={preset.id} value={preset.id}>
                                                    {preset.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    <button
                                        onClick={() => handleRemoveSite(domain)}
                                        className="text-sm px-3 py-1 rounded hover:bg-white/5"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default App;
