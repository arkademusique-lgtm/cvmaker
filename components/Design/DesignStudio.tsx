import React, { useState, memo } from 'react';
import { Template, ThemeColor, FontFamily, PredefinedTheme, FontSize, PhotoShape } from '../../types';
import { templates, colors, fonts, predefinedThemes, colorKeys, templateKeys, fontKeys, totalCombinations, fontSizes, fontSizeKeys } from '../../constants';
import * as Icons from '../Icons';

export interface DesignProps {
    currentTemplate: Template;
    themeColor: ThemeColor;
    fontFamily: FontFamily;
    fontSize: FontSize;
    sectionSpacing: number;
    itemSpacing: number;
    lineHeight: number;
    borderRadius: number;
    useGradient: boolean;
    colorShade: number;
    photoShape: PhotoShape;
    setCurrentTemplate: (t: Template) => void;
    setThemeColor: (c: ThemeColor) => void;
    setFontFamily: (f: FontFamily) => void;
    setFontSize: (s: FontSize) => void;
    setSectionSpacing: (s: number) => void;
    setItemSpacing: (s: number) => void;
    setLineHeight: (l: number) => void;
    setBorderRadius: (r: number) => void;
    setUseGradient: (g: boolean) => void;
    setColorShade: (s: number) => void;
    setPhotoShape: (s: PhotoShape) => void;
}

interface DesignStudioProps extends DesignProps {
    onClose: () => void;
}

const ToggleSwitch: React.FC<{label: string, checked: boolean, onChange: (c: boolean) => void}> = ({ label, checked, onChange }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-xs text-slate-600">{label}</span>
        <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <div className="block w-10 h-5 rounded-full transition bg-slate-300 peer-checked:bg-indigo-500"></div>
            <div className="dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform peer-checked:transform peer-checked:translate-x-5"></div>
        </div>
    </label>
);


export const DesignStudio: React.FC<DesignStudioProps> = memo(({ 
    currentTemplate, themeColor, fontFamily, fontSize, sectionSpacing, itemSpacing, lineHeight,
    borderRadius, useGradient, colorShade, photoShape,
    setCurrentTemplate, setThemeColor, setFontFamily, setFontSize, setSectionSpacing, setItemSpacing, setLineHeight, 
    setBorderRadius, setUseGradient, setColorShade, setPhotoShape,
    onClose 
}) => {
    const [designTab, setDesignTab] = useState('gallery');
    
    const applyPredefinedTheme = (theme: PredefinedTheme) => {
        setCurrentTemplate(theme.t);
        setThemeColor(theme.c);
        setFontFamily(theme.f);
    };

    const randomizeDesign = () => {
        const randomTemplate = templateKeys[Math.floor(Math.random() * templateKeys.length)];
        const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
        const randomFont = fontKeys[Math.floor(Math.random() * fontKeys.length)];
        const randomFontSize = fontSizeKeys[Math.floor(Math.random() * fontSizeKeys.length)];
        
        setCurrentTemplate(randomTemplate);
        setThemeColor(randomColor);
        setFontFamily(randomFont);
        setFontSize(randomFontSize);
        
        setSectionSpacing(Math.floor(Math.random() * (16 - 4 + 1)) + 4); // Range 4-16
        setItemSpacing(Math.floor(Math.random() * (10 - 2 + 1)) + 2); // Range 2-10
        setLineHeight(Number((Math.random() * (1.8 - 1.3) + 1.3).toFixed(2))); // Range 1.3-1.8
        setBorderRadius(Math.floor(Math.random() * 25)); // 0-24px
        setUseGradient(Math.random() > 0.6);
        const shades = [400, 500, 600, 700, 800];
        setColorShade(shades[Math.floor(Math.random() * shades.length)]);
        setPhotoShape(Math.random() > 0.5 ? 'round' : 'square');


        setDesignTab('manual');
    };
    
    return (
        <div className="bg-white text-slate-800 rounded-xl p-0 mb-2 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[70vh] border border-slate-200 shadow-lg">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="font-bold text-lg flex items-center gap-2"><Icons.Palette className="h-5 w-5 text-indigo-500" /> Studio de Design</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><Icons.X className="h-5 w-5 text-slate-500 hover:text-slate-900" /></button>
            </div>

            <div className="flex bg-slate-100 p-1">
                <button onClick={() => setDesignTab('gallery')} className={`flex-1 p-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors ${designTab === 'gallery' ? 'bg-indigo-500 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
                    <Icons.Library className="h-4 w-4" /> Galerie (250+)
                </button>
                <button onClick={() => setDesignTab('manual')} className={`flex-1 p-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors ${designTab === 'manual' ? 'bg-indigo-500 text-white shadow' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
                    <Icons.SlidersHorizontal className="h-4 w-4" /> Manuel
                </button>
            </div>

            {designTab === 'gallery' && (
                <div className="p-4 overflow-y-auto">
                    <p className="text-xs text-slate-500 mb-3 text-center">Cliquez sur un style pour l'appliquer. Plus de {predefinedThemes.length} combinaisons disponibles !</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {predefinedThemes.map((theme, idx) => (
                            <button
                                key={idx}
                                onClick={() => applyPredefinedTheme(theme)}
                                title={theme.name}
                                className={`p-2 rounded border text-xs text-left transition ${currentTemplate === theme.t && themeColor === theme.c && fontFamily === theme.f ? `bg-${theme.c}-500 border-${theme.c}-500 text-white font-bold ring-2 ring-${theme.c}-300` : 'border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full bg-${theme.c}-500 flex-shrink-0`}></div>
                                    <span className="font-semibold truncate">{theme.name}</span>
                                </div>
                                <div className={`text-xs opacity-70 ml-5 truncate ${fonts.find(f => f.id === theme.f)?.className}`}>
                                    {templates.find(t => t.id === theme.t)?.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {designTab === 'manual' && (
                <div className="p-4 overflow-y-auto space-y-6">
                     <div className="bg-indigo-50 rounded p-3 text-center border border-indigo-100">
                        <p className="text-lg font-bold text-indigo-600">Plus de {totalCombinations} combinaisons !</p>
                        <p className="text-xs text-indigo-800 mb-3">Cliquez pour trouver un style unique :</p>
                        <button onClick={randomizeDesign} className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded font-medium transition shadow-sm">
                            <Icons.Shuffle className="h-4 w-4" /> Mélanger le style
                        </button>
                    </div>
                    
                    <div>
                        <h4 className="text-sm uppercase text-slate-500 font-bold mb-3 tracking-wider">Structure ({templates.length} Modèles)</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {templates.map(t => (
                                <button key={t.id} onClick={() => setCurrentTemplate(t.id)} title={t.label} className={`p-2 rounded border text-xs flex flex-col items-center justify-center gap-1 transition ${currentTemplate === t.id ? `bg-${themeColor}-500 border-${themeColor}-500 text-white font-bold` : 'border-slate-300 hover:bg-slate-100 hover:border-indigo-400 text-slate-600'}`}>
                                    <t.icon className={`h-5 w-5 ${t.rotate ? 'rotate-90' : ''} ${t.mirror ? '-scale-x-100' : ''}`} />
                                    <span className="text-center">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm uppercase text-slate-500 font-bold mb-3 tracking-wider">Nuancier ({colorKeys.length} Couleurs)</h4>
                        <div className="flex flex-wrap gap-3">
                            {colorKeys.map(c => (
                                <button key={c} onClick={() => setThemeColor(c)} className={`w-8 h-8 rounded-full border-2 transition hover:scale-110 ${themeColor === c ? 'border-white ring-2 ring-offset-2 ring-offset-white ring-indigo-500' : 'border-transparent'} bg-${c}-${colorShade}`} title={colors[c].name} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm uppercase text-slate-500 font-bold mb-3 tracking-wider">Typographie</h4>
                        <div className="bg-slate-100 p-3 rounded space-y-4">
                            <div>
                                <label className="text-xs text-slate-600 block mb-2">Police</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {fonts.map(f => (
                                       <button key={f.id} onClick={() => setFontFamily(f.id)} className={`flex-1 py-2 px-2 rounded text-sm transition-colors ${f.className} ${fontFamily === f.id ? `bg-${themeColor}-500 text-white shadow` : 'bg-white hover:bg-slate-200 text-slate-700'}`}>{f.label}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 block mb-2">Taille</label>
                                <div className="grid grid-cols-3 gap-2">
                                     {fontSizes.map(f => (
                                       <button key={f.id} onClick={() => setFontSize(f.id)} className={`flex-1 py-2 px-2 rounded text-sm transition-colors ${fontSize === f.id ? `bg-${themeColor}-500 text-white shadow` : 'bg-white hover:bg-slate-200 text-slate-700'}`}>{f.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm uppercase text-slate-500 font-bold mb-3 tracking-wider">Espacement</h4>
                        <div className="space-y-4 bg-slate-100 p-3 rounded">
                            <div className="grid grid-cols-3 items-center">
                                <label htmlFor="sectionSpacing" className="text-xs text-slate-600 col-span-1">Sections</label>
                                <input id="sectionSpacing" type="range" min="4" max="16" value={sectionSpacing} onChange={(e) => setSectionSpacing(Number(e.target.value))} className="w-full col-span-2 cursor-pointer" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label htmlFor="itemSpacing" className="text-xs text-slate-600 col-span-1">Éléments</label>
                                <input id="itemSpacing" type="range" min="2" max="10" value={itemSpacing} onChange={(e) => setItemSpacing(Number(e.target.value))} className="w-full col-span-2 cursor-pointer" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label htmlFor="lineHeight" className="text-xs text-slate-600 col-span-1">Hauteur Ligne</label>
                                <input id="lineHeight" type="range" min="1.3" max="1.8" step="0.05" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} className="w-full col-span-2 cursor-pointer" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm uppercase text-slate-500 font-bold mb-3 tracking-wider">Personnalisation Avancée</h4>
                         <div className="space-y-4 bg-slate-100 p-3 rounded">
                            <div className="grid grid-cols-3 items-center">
                                <label htmlFor="colorShade" className="text-xs text-slate-600 col-span-1">Nuance Couleur</label>
                                <input id="colorShade" type="range" min="400" max="800" step="100" value={colorShade} onChange={(e) => setColorShade(Number(e.target.value))} className="w-full col-span-2 cursor-pointer" />
                            </div>
                             <div className="grid grid-cols-3 items-center">
                                <label htmlFor="borderRadius" className="text-xs text-slate-600 col-span-1">Arrondi</label>
                                <input id="borderRadius" type="range" min="0" max="24" value={borderRadius} onChange={(e) => setBorderRadius(Number(e.target.value))} className="w-full col-span-2 cursor-pointer" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-600 block mb-2">Forme de la Photo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setPhotoShape('round')} className={`flex-1 py-2 px-2 rounded text-sm transition-colors ${photoShape === 'round' ? `bg-${themeColor}-500 text-white shadow` : 'bg-white hover:bg-slate-200 text-slate-700'}`}>Ronde</button>
                                    <button onClick={() => setPhotoShape('square')} className={`flex-1 py-2 px-2 rounded text-sm transition-colors ${photoShape === 'square' ? `bg-${themeColor}-500 text-white shadow` : 'bg-white hover:bg-slate-200 text-slate-700'}`}>Carrée</button>
                                </div>
                            </div>
                            <ToggleSwitch label="Effet dégradé" checked={useGradient} onChange={setUseGradient} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});