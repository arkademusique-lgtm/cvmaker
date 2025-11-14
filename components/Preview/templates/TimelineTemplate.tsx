import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { formatUrl, SkillRating } from './common';
import { gradients } from '../../../constants';

export const TimelineTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, useGradient, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textClass = `text-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    
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

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
        {data.experiences.map((exp, i) => (
            <div key={exp.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="relative break-inside-avoid-page">
                <div style={useGradient ? gradientStyle : {}} className={`absolute -left-[39px] top-1 w-5 h-5 rounded-full border-4 border-white ${!useGradient ? bgClass : ''} shadow-sm`}></div>
                <span style={roundedStyle} className={`inline-block px-2 py-1 text-xs font-bold bg-slate-100 text-slate-500 mb-2`}>{exp.date}</span>
                <h4 className="text-xl font-bold text-slate-800">{exp.role}</h4>
                <div className={`text-sm font-bold uppercase mb-2 ${textClass}`}>{exp.company}, {exp.city}</div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{exp.description}</p>
            </div>
        ))}
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                <section key={section.id} className="mb-6">
                    <h3 className="text-xl font-bold uppercase mb-4 text-slate-600 text-center">{section.title}</h3>
                    {section.items.map((item, i) => (
                        <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="relative break-inside-avoid-page">
                            <div style={useGradient ? gradientStyle : {}} className={`absolute -left-[39px] top-1 w-5 h-5 rounded-full border-4 border-white ${!useGradient ? bgClass : ''} shadow-sm`}></div>
                            <span style={roundedStyle} className={`inline-block px-2 py-1 text-xs font-bold bg-slate-100 text-slate-500 mb-2`}>{item.date}</span>
                            <h4 className="text-xl font-bold text-slate-800">{item.title}</h4>
                            <div className={`text-sm font-bold uppercase mb-2 ${textClass}`}>{item.subtitle}</div>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.description}</p>
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><h3 className={`font-bold uppercase text-sm mb-4 pb-1 border-b ${borderClass} ${textDarkClass}`}>Compétences</h3>{data.skills.map((s) => <div key={s.id} className="text-sm mb-2 text-slate-600 flex justify-between items-center"><span>{s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass} />}</div>)}</section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><h3 className={`font-bold uppercase text-sm mb-4 pb-1 border-b ${borderClass} ${textDarkClass}`}>Formation</h3>{data.education.map((e, i) => (<div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-sm">{e.degree}</div><div className="text-xs text-slate-400">{e.school}, {e.city}</div><div className="text-xs text-slate-400">{e.date}</div>{e.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{e.description}</p>}</div>))}</section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><h3 className={`font-bold uppercase text-sm mb-4 pb-1 border-b ${borderClass} ${textDarkClass}`}>Loisirs</h3>{data.hobbies.map((h, i) => <div key={i} className="text-sm mb-1 text-slate-600">{h}</div>)}</section>
    );

    const mainComponents = { experiences: Experiences, customSections: CustomSections };
    const sidebarComponents = { skills: Skills, education: Education, hobbies: Hobbies };

    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);

    return (
        <div className={`h-[297mm] p-[15mm] bg-white`}>
            <header className="flex flex-col items-center border-b-2 border-slate-100 pb-8 mb-8">
                <h1 className="text-4xl font-bold uppercase tracking-widest mb-2 text-slate-900">{data.personal.firstName} {data.personal.lastName}</h1>
                <div style={{...roundedStyle, ...(useGradient ? gradientStyle : {})}} className={`px-4 py-1 ${!useGradient ? bgClass : ''} text-white font-bold text-sm mb-4`}>{data.personal.title}</div>
                {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mb-4">{data.personal.infos}</p>}
                <div className="flex gap-x-6 gap-y-1 text-xs font-bold text-slate-400 uppercase flex-wrap justify-center">
                    {data.personal.phone && <span>{data.personal.phone}</span>}
                    {data.personal.email && <span>{data.personal.email}</span>}
                    {data.personal.address && <span>{data.personal.address}</span>}
                    {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">{data.personal.linkedin}</a>}
                    {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">{data.personal.github}</a>}
                    {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:text-slate-600">{data.personal.portfolio}</a>}
                </div>
                {data.personal.summary && <p className="text-sm text-center text-slate-600 mt-6 max-w-2xl">{data.personal.summary}</p>}
            </header>
            <div className="grid grid-cols-3 gap-10">
                <div className="col-span-1 text-right">
                    {sidebarOrder.map(key => {
                        const SectionComponent = sidebarComponents[key as keyof typeof sidebarComponents];
                        return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                    })}
                </div>
                <div className="col-span-2 border-l-2 border-slate-200 pl-8 relative">
                    {mainOrder.map(key => {
                        const SectionComponent = mainComponents[key as keyof typeof mainComponents];
                        return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            </div>
        </div>
    );
});