import React, { memo } from 'react';
// FIX: Added ThemeColor to the import list to resolve type error.
import { CVData, TemplateProps, ThemeColor } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl } from './common';
import { gradients } from '../../../constants';

interface SectionHeaderProps { 
    title: string; 
    themeColor: ThemeColor;
    colorShade: number;
    useGradient: boolean;
    icon: React.ReactNode 
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, themeColor, colorShade, useGradient, icon }) => {
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};

    return (
        <div className="flex items-center gap-4 mb-6">
            <div style={useGradient ? gradientStyle : {}} className={`${!useGradient ? bgClass : ''} p-3 rounded-full text-white`}>{icon}</div>
            <h3 className={`text-2xl font-bold uppercase tracking-wider ${textDarkClass}`}>{title}</h3>
        </div>
    );
};

export const InfographicTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, useGradient, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const textClass = `text-${themeColor}-${colorShade}`;
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    
    const Experiences = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" themeColor={themeColor} colorShade={colorShade} useGradient={useGradient} icon={<Icons.Briefcase className="h-6 w-6"/>} />
            <div>
                {data.experiences.map((e, i) => (
                    <div key={e.id} style={{ ...roundedStyle, ...(i < data.experiences.length - 1 ? itemStyle : undefined) }} className="bg-white p-4 shadow-sm break-inside-avoid-page">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-lg">{e.role}</h4>
                            <span style={{...roundedStyle, ...(useGradient ? gradientStyle : {})}} className={`text-xs font-bold text-white px-2 py-1 ${!useGradient ? bgClass : ''}`}>{e.date}</span>
                        </div>
                        <p className="text-sm italic text-slate-500 mb-2">{e.company}, {e.city}</p>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );

    const CustomSections = (p: {style: React.CSSProperties}) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                 <section key={section.id}>
                    <SectionHeader title={section.title} themeColor={themeColor} colorShade={colorShade} useGradient={useGradient} icon={<Icons.Plus className="h-6 w-6"/>} />
                    <div>
                        {section.items.map((item, i) => (
                            <div key={item.id} style={{ ...roundedStyle, ...(i < section.items.length - 1 ? itemStyle : undefined) }} className="bg-white p-4 shadow-sm break-inside-avoid-page">
                                <div className="flex justify-between items-baseline">
                                    <h4 className="font-bold text-lg">{item.title}</h4>
                                    <span style={{...roundedStyle, ...(useGradient ? gradientStyle : {})}} className={`text-xs font-bold text-white px-2 py-1 ${!useGradient ? bgClass : ''}`}>{item.date}</span>
                                </div>
                                <p className="text-sm italic text-slate-500 mb-2">{item.subtitle}</p>
                                <p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
    
    const Education = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Formation" themeColor={themeColor} colorShade={colorShade} useGradient={useGradient} icon={<Icons.GraduationCap className="h-6 w-6"/>} />
            <div>
                 {data.education.map((e, i) => (
                    <div key={e.id} style={{ ...roundedStyle, ...(i < data.education.length - 1 ? itemStyle : undefined) }} className="bg-white p-4 shadow-sm break-inside-avoid-page">
                        <div className="flex justify-between items-baseline">
                            <h4 className="font-bold text-md">{e.degree}</h4>
                            <span className="text-xs text-slate-400">{e.date}</span>
                        </div>
                        <p className="text-sm text-slate-500">{e.school}, {e.city}</p>
                        <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{e.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );

    const Skills = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Compétences" themeColor={themeColor} colorShade={colorShade} useGradient={useGradient} icon={<Icons.Settings className="h-6 w-6"/>} />
            <div className="space-y-3 bg-white p-4 shadow-sm" style={roundedStyle}>
                {data.skills.map((s) => (
                    <div key={s.id}>
                        <p className="text-sm font-medium text-slate-700 mb-1">{s.name}</p>
                        {visibility.showSkillLevels && (
                            <div className="w-full bg-slate-200 h-2.5" style={roundedStyle}>
                                <div style={{width: `${s.level * 20}%`, ...roundedStyle, ...(useGradient ? gradientStyle : {})}} className={`${!useGradient ? bgClass : ''} h-2.5`}></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
    
    const shouldRenderSection = (section: string) => {
        switch(section) {
            case 'experiences': return data.experiences.length > 0;
            case 'education': return data.education.length > 0;
            case 'skills': return data.skills.length > 0;
            case 'customSections': return data.customSections.length > 0;
            default: return false;
        }
    };
    
    const mainComponents = { experiences: Experiences, customSections: CustomSections };
    const sidebarComponents = { education: Education, skills: Skills };
    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);

    return (
        <div className="h-full min-h-[297mm] p-[12mm] bg-slate-50 font-sans">
            <header className="text-center mb-8">
                <h1 className="text-5xl font-black text-slate-800">{data.personal.firstName} {data.personal.lastName}</h1>
                <p className={`text-2xl font-light ${textClass} mt-2`}>{data.personal.title}</p>
                <div className="mt-6 pt-6 border-t border-slate-200 flex justify-center items-center gap-x-6 gap-y-2 text-sm text-slate-600 flex-wrap">
                    {data.personal.phone && <div className="flex items-center gap-2"><Icons.Phone className={`h-4 w-4 ${textClass}`} />{data.personal.phone}</div>}
                    {data.personal.email && <div className="flex items-center gap-2"><Icons.Mail className={`h-4 w-4 ${textClass}`} />{data.personal.email}</div>}
                    {data.personal.address && <div className="flex items-center gap-2"><Icons.MapPin className={`h-4 w-4 ${textClass}`} />{data.personal.address}</div>}
                    {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline"><Icons.Linkedin className={`h-4 w-4 ${textClass}`} />LinkedIn</a>}
                    {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline"><Icons.Github className={`h-4 w-4 ${textClass}`} />GitHub</a>}
                </div>
                 {visibility.infos && data.personal.infos && <p className="text-xs text-slate-500 mt-4">{data.personal.infos}</p>}
            </header>
            
            <main>
                {data.personal.summary && (
                    <section style={sectionStyle}>
                         <SectionHeader title="Profil" themeColor={themeColor} colorShade={colorShade} useGradient={useGradient} icon={<Icons.User className="h-6 w-6"/>} />
                         <p style={roundedStyle} className={`text-slate-600 bg-white p-6 shadow-sm border-l-4 ${borderClass}`}>{data.personal.summary}</p>
                    </section>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                        {mainOrder.map(key => {
                            const Section = mainComponents[key as keyof typeof mainComponents];
                            return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                        })}
                    </div>
                    <div>
                        {sidebarOrder.map(key => {
                            const Section = sidebarComponents[key as keyof typeof sidebarComponents];
                            return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
});