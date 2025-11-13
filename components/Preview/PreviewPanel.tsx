import React, { memo, useRef, useLayoutEffect } from 'react';
import { CVData, Template, ThemeColor, FontFamily, VisibilitySettings, FontSize, PhotoShape } from '../../types';

import { SidebarTemplate } from './templates/SidebarTemplate';
import { HeaderTemplate } from './templates/HeaderTemplate';
import { MinimalTemplate } from './templates/MinimalTemplate';
import { ElegantTemplate } from './templates/ElegantTemplate';
import { CreativeTemplate } from './templates/CreativeTemplate';
import { TimelineTemplate } from './templates/TimelineTemplate';
import { CorporateTemplate } from './templates/CorporateTemplate';
import { TechTemplate } from './templates/TechTemplate';
import { SplitTemplate } from './templates/SplitTemplate';
import { CompactTemplate } from './templates/CompactTemplate';
import { CenteredTemplate } from './templates/CenteredTemplate';
import { TopFocusTemplate } from './templates/TopFocusTemplate';
import { DarkModernTemplate } from './templates/DarkModernTemplate';
import { InfographicTemplate } from './templates/InfographicTemplate';
import { TwoToneTemplate } from './templates/TwoToneTemplate';
import { ModernoTemplate } from './templates/ModernoTemplate';

interface PreviewPanelProps {
    cvData: CVData;
    template: Template;
    themeColor: ThemeColor;
    fontFamily: FontFamily;
    fontSize: FontSize;
    visibility: VisibilitySettings;
    sectionSpacing: number;
    itemSpacing: number;
    lineHeight: number;
    borderRadius: number;
    useGradient: boolean;
    colorShade: number;
    photoShape: PhotoShape;
    className?: string;
}

const TemplateComponents: Record<Template, React.ComponentType<any>> = {
    sidebar: SidebarTemplate,
    'sidebar-right': (props) => <SidebarTemplate {...props} right />,
    header: HeaderTemplate,
    'header-photo': (props) => <HeaderTemplate {...props} withPhoto />,
    minimal: MinimalTemplate,
    'minimal-icons': (props) => <MinimalTemplate {...props} withIcons />,
    elegant: ElegantTemplate,
    creative: CreativeTemplate,
    timeline: TimelineTemplate,
    corporate: CorporateTemplate,
    tech: TechTemplate,
    split: SplitTemplate,
    'split-wide': (props) => <SplitTemplate {...props} wide />,
    compact: CompactTemplate,
    centered: CenteredTemplate,
    'top-focus': TopFocusTemplate,
    'dark-modern': DarkModernTemplate,
    infographic: InfographicTemplate,
    'two-tone': TwoToneTemplate,
    moderno: ModernoTemplate,
};

export const PreviewPanel: React.FC<PreviewPanelProps> = memo(({ 
    cvData, template, themeColor, fontFamily, fontSize, visibility, 
    sectionSpacing, itemSpacing, lineHeight, 
    borderRadius, useGradient, colorShade, photoShape,
    className 
}) => {
    
    const containerRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    
    const fontStyle = {
        fontFamily: fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'mono' ? 'monospace' : fontFamily === 'script' ? "'Dancing Script', cursive" : "'Segoe UI', Roboto, sans-serif",
        lineHeight: lineHeight,
    };
    
    const fontSizeScale = fontSize === 'sm' ? 0.94 : fontSize === 'lg' ? 1.06 : 1.0;

    useLayoutEffect(() => {
        if (!containerRef.current || !previewRef.current) return;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const containerWidth = entry.contentRect.width;
                const previewWidth = 210 * (96 / 25.4); // A4 width in pixels at 96 DPI

                if (containerWidth < previewWidth) {
                    const scale = containerWidth / previewWidth;
                    previewRef.current!.style.transform = `scale(${scale * 0.95})`; // 0.95 factor to add some padding
                } else {
                    previewRef.current!.style.transform = `scale(1.0)`;
                }
            }
        });

        observer.observe(containerRef.current);
        
        return () => {
            observer.disconnect();
        };
    }, []);

    const CurrentTemplateComponent = TemplateComponents[template];

    return (
        <div ref={containerRef} id="preview-container" className={`flex-1 bg-slate-200 overflow-y-auto py-4 sm:py-8 flex justify-center items-start print:p-0 print:bg-white ${className}`}>
            <div
                id="cv-preview-wrapper"
                 style={{ transform: `scale(${fontSizeScale})`, transformOrigin: 'top center' }}
                 className="transition-transform duration-200"
            >
                <div
                    ref={previewRef}
                    id="cv-preview"
                    className="bg-white shadow-2xl w-[210mm] h-[297mm] print:shadow-none overflow-hidden"
                    style={fontStyle}
                >
                    {CurrentTemplateComponent && <CurrentTemplateComponent 
                        data={cvData} 
                        themeColor={themeColor} 
                        visibility={visibility} 
                        sectionSpacing={sectionSpacing}
                        itemSpacing={itemSpacing}
                        borderRadius={borderRadius}
                        useGradient={useGradient}
                        colorShade={colorShade}
                        photoShape={photoShape}
                    />}
                </div>
            </div>
        </div>
    );
});