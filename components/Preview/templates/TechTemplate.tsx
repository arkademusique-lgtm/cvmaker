import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { SkillRating } from './common';

export const TechTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const textClass = `text-${themeColor}-${colorShade}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const bgClass = `bg-${themeColor}-${colorShade}`;
    
    const SectionHeader = ({ title }: { title: string }) => (
        <h3 style={roundedStyle} className="text-lg font-bold bg-slate-900 text-white inline-block px-2 py-1 mb-4">{title}</h3>
    );
    
    const Experiences = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="EXPERIENCE_LOG" />
            {data.experiences.map((exp, i) => (
                <div key={exp.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="pl-4 border-l-2 border-dashed border-slate-300 break-inside-avoid-page">
                    <div className="font-bold text-lg">{exp.role}</div>
                    <div className={`text-xs font-bold ${textDarkClass} mb-2`}>@{exp.company}, {exp.city} [{exp.date}]</div>
                    <p className="text-sm whitespace-pre-line">{exp.description}</p>
                </div>
            ))}
        </section>
    );

    const Education = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="EDUCATION" />
            {data.education.map((e, i) => (
                <div key={e.id} style={{...roundedStyle, ...(i < data.education.length - 1 ? itemStyle : undefined)}} className="text-sm border border-slate-200 p-2 break-inside-avoid-page">
                    <div className="font-bold">{e.degree}</div>
                    <div className="text-xs opacity-70">{e.school}, {e.city}</div>
                    <div className="text-xs opacity-70">[{e.date}]</div>
                    {e.description && <p className="text-xs mt-1 whitespace-pre-line">{e.description}</p>}
                </div>
            ))}
        </section>
    );

    const Skills = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="SKILL_SET" />
            <ul className="space-y-2 text-sm">{data.skills.map((s) => <li key={s.id} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className={`${textClass}`}>[x]</span> {s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass} />}</li>)}</ul>
        </section>
    );

    const Hobbies = (p: {style: React.CSSProperties}) => (
         <section style={p.style}>
            <SectionHeader title="HOBBY_LIST" />
            <ul className="space-y-2 text-sm">{data.hobbies.map((h, i) => <li key={i} className="flex items-center gap-2"><span className={`${textClass}`}>-</span> {h}</li>)}</ul>
        </section>
    );

    const CustomSections = (p: {style: React.CSSProperties}) => (
        <div style={p.style}>
        {data.customSections.map(section => (
            <section key={section.id} className="mb-6">
                <SectionHeader title={section.title.toUpperCase().replace(' ', '_')} />
                {section.items.map((item, i) => (
                    <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="pl-4 border-l-2 border-dashed border-slate-300 break-inside-avoid-page">
                        <div className="font-bold text-lg">{item.title}</div>
                        <div className={`text-xs font-bold ${textDarkClass} mb-2`}>{item.subtitle} [{item.date}]</div>
                        <p className="text-sm whitespace-pre-line">{item.description}</p>
                    </div>
                ))}
            </section>
        ))}
        </div>
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
        <div className={`h-full min-h-[297mm] p-[10mm] bg-slate-50 text-slate-900 font-mono`}>
            <div style={roundedStyle} className="border-2 border-slate-900 h-full p-6 bg-white shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                <header className="mb-8 border-b-2 border-slate-900 pb-6">
                    <h1 className="text-4xl font-bold mb-2">{`> ${data.personal.firstName}_${data.personal.lastName}`}</h1>
                    <p className={`text-xl font-bold ${textClass}`}>{`// ${data.personal.title}`}</p>
                    <div className="mt-4 flex gap-4 text-xs flex-wrap">
                        {data.personal.email && <span style={roundedStyle} className="bg-slate-100 px-2 py-1 border border-slate-300">MAIL: {data.personal.email}</span>}
                        {data.personal.phone && <span style={roundedStyle} className="bg-slate-100 px-2 py-1 border border-slate-300">TEL: {data.personal.phone}</span>}
                        {data.personal.address && <span style={roundedStyle} className="bg-slate-100 px-2 py-1 border border-slate-300">ADR: {data.personal.address}</span>}
                        {visibility.linkedin && data.personal.linkedin && <span style={roundedStyle} className="bg-slate-100 px-2 py-1 border border-slate-300">LINKEDIN: {data.personal.linkedin}</span>}
                        {visibility.github && data.personal.github && <span style={roundedStyle} className="bg-slate-100 px-2 py-1 border border-slate-300">GITHUB: {data.personal.github}</span>}
                        {visibility.portfolio && data.personal.portfolio && <span style={roundedStyle} className="bg-slate-100 px-2 py-1 border border-slate-300">PORTFOLIO: {data.personal.portfolio}</span>}
                    </div>
                </header>
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-8">
                        {data.personal.summary && (
                             <div className="pl-4 border-l-2 border-dashed border-slate-300" style={sectionStyle}>
                                <SectionHeader title="SUMMARY_BLOC" />
                                <p className="text-sm">{data.personal.summary}</p>
                                {visibility.infos && data.personal.infos && <p className="text-xs mt-2 text-slate-500">INFO: {data.personal.infos}</p>}
                            </div>
                        )}
                        {mainOrder.map(key => {
                            const SectionComponent = mainComponents[key as keyof typeof mainComponents];
                            return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                        })}
                    </div>
                    <div className="col-span-4">
                       {sidebarOrder.map(key => {
                            const SectionComponent = sidebarComponents[key as keyof typeof sidebarComponents];
                            return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});