import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { formatUrl, SkillRating } from './common';

export const SplitTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, colorShade, wide = false } = props;
    const mainSpan = wide ? 'col-span-2' : 'col-span-1';
    const sideSpan = 'col-span-1';
    const gridCols = wide ? 'grid-cols-3' : 'grid-cols-2';
    
    const textClass = `text-${themeColor}-${colorShade}`;
    const lightBgClass = `bg-${themeColor}-50`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const bgClass = `bg-${themeColor}-${colorShade}`;
    
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className={`font-bold uppercase tracking-widest text-sm mb-4 ${textClass}`}>{title}</h3>
    );
    
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" />
            <div>{data.experiences.map((e, i) => <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="flex justify-between font-bold text-md"><span>{e.role}</span><span className="text-sm font-normal text-slate-400">{e.date}</span></div><div className="text-sm italic mb-1 text-slate-500">{e.company}, {e.city}</div><p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p></div>)}</div>
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
        {data.customSections.map(section => (
            <section key={section.id} className="mb-6">
                <SectionHeader title={section.title} />
                <div>{section.items.map((item, i) => <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="flex justify-between font-bold text-md"><span>{item.title}</span><span className="text-sm font-normal text-slate-400">{item.date}</span></div><div className="text-sm italic mb-1 text-slate-500">{item.subtitle}</div><p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p></div>)}</div>
            </section>
        ))}
        </div>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><SectionHeader title="Compétences" /><div className="flex flex-wrap gap-2">{data.skills.map((s) => <div key={s.id} style={roundedStyle} className={`text-sm ${lightBgClass} ${textDarkClass} px-3 py-1 flex items-center gap-2`}>{s.name} {visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass}/>}</div>)}</div></section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><SectionHeader title="Formation" /><div>{data.education.map((e, i) => <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-md">{e.degree}</div><div className="text-sm text-slate-500">{e.school}, {e.city} | {e.date}</div>{e.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{e.description}</p>}</div>)}</div></section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><SectionHeader title="Loisirs" /><p className="text-sm text-slate-600">{data.hobbies.join(', ')}</p></section>
    );
    
    const shouldRenderSection = (section: string) => {
        switch(section) {
            case 'experiences': return data.experiences.length > 0;
            case 'education': return data.education.length > 0;
            case 'skills': return data.skills.length > 0;
            case 'hobbies': return visibility.hobbies && data.hobbies.length > 0;
            case 'customSections': return data.customSections.length > 0;
            default: return false;
        }
    };
    
    const mainComponents = { experiences: Experiences, customSections: CustomSections };
    const sidebarComponents = { skills: Skills, education: Education, hobbies: Hobbies };
    
    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);

    return (
        <div className={`h-[297mm] p-[15mm] bg-white font-sans flex flex-col`}>
            <header className="text-center mb-8">
                <h1 className={`text-5xl font-extrabold ${textDarkClass}`}>{data.personal.firstName} {data.personal.lastName}</h1>
                <p className="text-xl text-slate-500 mt-2">{data.personal.title}</p>
                {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mt-2">{data.personal.infos}</p>}
                <div className={`mt-4 pt-4 border-t ${borderClass} max-w-lg mx-auto flex justify-center gap-x-6 gap-y-1 text-sm text-slate-600 flex-wrap`}>
                    {data.personal.phone && <span>{data.personal.phone}</span>}
                    {data.personal.email && <span>{data.personal.email}</span>}
                    {data.personal.address && <span>{data.personal.address}</span>}
                    {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.linkedin}</a>}
                    {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.github}</a>}
                    {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.portfolio}</a>}
                </div>
            </header>
            <div className={`grid ${gridCols} gap-10 flex-1 border-t border-slate-100 pt-8`}>
                <div className={`${mainSpan} ${wide ? 'border-r border-slate-100 pr-10' : ''}`}>
                    {data.personal.summary && <section style={sectionStyle}><SectionHeader title="Profil" /><p className="text-sm text-slate-600">{data.personal.summary}</p></section>}
                    {mainOrder.map(key => {
                        const Section = mainComponents[key as keyof typeof mainComponents];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                    })}
                </div>
                <div className={sideSpan}>
                    {sidebarOrder.map(key => {
                        const Section = sidebarComponents[key as keyof typeof sidebarComponents];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            </div>
        </div>
    );
});