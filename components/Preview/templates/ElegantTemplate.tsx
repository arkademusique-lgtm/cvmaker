import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { SkillRating } from './common';

export const ElegantTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const textClass = `text-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const bgClass = `bg-${themeColor}-${colorShade}`;

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className={`text-center text-lg font-bold uppercase tracking-widest mb-6 ${textDarkClass}`}>Expérience Professionnelle</h3>
            <div>
                {data.experiences.map((exp, i) => (
                    <div key={exp.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="relative pl-4 border-l-2 border-slate-100 break-inside-avoid-page">
                        <div className="flex justify-between items-baseline mb-1"><h4 className="text-lg font-serif font-bold">{exp.role}</h4><span className="text-sm italic text-slate-400">{exp.date}</span></div>
                        <div className={`text-sm uppercase tracking-wide mb-2 ${textClass}`}>{exp.company}, {exp.city}</div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{exp.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><h3 className={`text-center text-sm font-bold uppercase tracking-widest mb-4 ${textDarkClass}`}>Formation</h3>{data.education.map((edu, i) => (<div key={edu.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="text-center break-inside-avoid-page"><div className="font-bold text-sm">{edu.degree}</div><div className="text-xs text-slate-500 italic">{edu.school}, {edu.city} — {edu.date}</div>{edu.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{edu.description}</p>}</div>))}</section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}><h3 className={`text-center text-sm font-bold uppercase tracking-widest mb-4 ${textDarkClass}`}>Compétences</h3><div className="flex flex-wrap justify-center gap-x-4 gap-y-2">{data.skills.map((skill) => (<div key={skill.id} style={roundedStyle} className={`border ${borderClass} px-3 py-1 text-xs ${textClass} flex items-center gap-2`}><span>{skill.name}</span> {visibility.showSkillLevels && <SkillRating level={skill.level} colorClass={bgClass}/>} </div>))}</div></section>
    );
    
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style} className="mt-8 pt-8 border-t border-slate-100">
            <h3 className={`text-center text-sm font-bold uppercase tracking-widest mb-4 ${textDarkClass}`}>Loisirs</h3>
            <p className="text-center text-sm text-slate-600">{data.hobbies.join(', ')}</p>
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
        {data.customSections.map(section => (
             <section key={section.id} className="mb-6">
                 <h3 className={`text-center text-lg font-bold uppercase tracking-widest mb-6 ${textDarkClass}`}>{section.title}</h3>
                 {section.items.map((item, i) => (
                    <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="relative pl-4 border-l-2 border-slate-100 break-inside-avoid-page">
                        <div className="flex justify-between items-baseline mb-1"><h4 className="text-lg font-serif font-bold">{item.title}</h4><span className="text-sm italic text-slate-400">{item.date}</span></div>
                        <div className={`text-sm uppercase tracking-wide mb-2 ${textClass}`}>{item.subtitle}</div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{item.description}</p>
                    </div>
                ))}
            </section>
        ))}
        </div>
    );

    const shouldRenderSection = (section: string) => {
        switch (section) {
            case 'experiences': return data.experiences.length > 0;
            case 'education': return data.education.length > 0;
            case 'skills': return data.skills.length > 0;
            case 'hobbies': return visibility.hobbies && data.hobbies.length > 0;
            case 'customSections': return data.customSections.length > 0;
            default: return false;
        }
    };
    
    const mainSections = { experiences: Experiences, customSections: CustomSections };
    const footerSections = { education: Education, skills: Skills, hobbies: Hobbies };

    const mainOrder = data.sectionOrder.filter(key => key in mainSections);
    const footerOrder = data.sectionOrder.filter(key => key in footerSections);

    return (
        <div className={`h-[297mm] p-[15mm] bg-white text-slate-800`}>
            <div className="text-center" style={sectionStyle}>
                <h1 className={`text-5xl font-serif mb-2 ${textDarkClass}`}>{data.personal.firstName} {data.personal.lastName}</h1>
                <p className="text-xl italic text-slate-500 mb-4">{data.personal.title}</p>
                {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500">{data.personal.infos}</p>}
                <div className="flex justify-center gap-x-4 gap-y-1 text-sm uppercase tracking-widest text-slate-400 border-t border-b border-slate-100 py-2 mx-auto max-w-3xl flex-wrap mt-4">
                    {data.personal.phone && <span>{data.personal.phone}</span>}
                    {data.personal.email && <span>{data.personal.email}</span>}
                    {data.personal.address && <span>{data.personal.address}</span>}
                    {visibility.linkedin && data.personal.linkedin && <span>{data.personal.linkedin}</span>}
                    {visibility.github && data.personal.github && <span>{data.personal.github}</span>}
                    {visibility.portfolio && data.personal.portfolio && <span>{data.personal.portfolio}</span>}
                </div>
            </div>
            {data.personal.summary && <div style={sectionStyle} className="text-center max-w-2xl mx-auto text-slate-600 leading-relaxed">{data.personal.summary}</div>}
            
            {mainOrder.map(key => {
                const Section = mainSections[key as keyof typeof mainSections];
                return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
            })}
            
            {(footerOrder.some(key => shouldRenderSection(key))) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-100">
                    {footerOrder.map(key => {
                        if (key === 'hobbies') return null; // Hobbies rendered separately
                        const Section = footerSections[key as keyof typeof footerSections];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            )}

            {shouldRenderSection('hobbies') && <Hobbies style={{}} />}
        </div>
    );
});