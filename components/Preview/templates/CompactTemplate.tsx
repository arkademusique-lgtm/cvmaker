import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { SkillRating } from './common';

export const CompactTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const bgClass = `bg-${themeColor}-${colorShade}`;

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className={`font-bold text-sm uppercase ${textDarkClass} border-b ${borderClass} mb-2 pb-1`}>{title}</h3>
    );
    
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" />
            {data.experiences.map((e, i) => (
                <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                    <div className="font-bold">{e.role} <span className="font-normal text-slate-500">| {e.company}, {e.city}</span> <span className="float-right text-slate-400">{e.date}</span></div>
                    <p className="text-slate-600 whitespace-pre-line">{e.description}</p>
                </div>
            ))}
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                 <section key={section.id} className="mb-6">
                    <SectionHeader title={section.title} />
                    {section.items.map((item, i) => (
                        <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                            <div className="font-bold">{item.title} <span className="font-normal text-slate-500">| {item.subtitle}</span> <span className="float-right text-slate-400">{item.date}</span></div>
                            <p className="text-slate-600 whitespace-pre-line">{item.description}</p>
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
    
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Compétences" />
            <div className="flex flex-col gap-1">{data.skills.map(s => <div key={s.id} className="flex justify-between items-center"><span>{s.name}</span> {visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass}/>}</div>)}</div>
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Formation" />
            {data.education.map((e, i) => <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold">{e.degree}</div><div className="text-slate-500">{e.school}, {e.city} ({e.date})</div><p className="text-slate-600 whitespace-pre-line text-[10px] leading-tight mt-1">{e.description}</p></div>)}
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <SectionHeader title="Loisirs" />
            <ul className="list-disc pl-4 space-y-1">{data.hobbies.map((h, i) => <li key={i}>{h}</li>)}</ul>
        </section>
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
        <div className={`h-[297mm] p-[10mm] bg-white text-slate-800 font-sans text-xs leading-snug`}>
            <header className="flex justify-between items-center mb-4 pb-4 border-b border-slate-300">
                <div>
                    <h1 className="text-3xl font-bold">{data.personal.firstName} {data.personal.lastName}</h1>
                    <p className="text-md text-slate-600">{data.personal.title}</p>
                </div>
                <div className="text-right space-y-1 break-all">
                    {data.personal.email && <div>{data.personal.email}</div>}
                    {data.personal.phone && <div>{data.personal.phone}</div>}
                    {data.personal.address && <div>{data.personal.address}</div>}
                    {visibility.linkedin && data.personal.linkedin && <div>{data.personal.linkedin}</div>}
                    {visibility.github && data.personal.github && <div>{data.personal.github}</div>}
                    {visibility.portfolio && data.personal.portfolio && <div>{data.personal.portfolio}</div>}
                </div>
            </header>
            {data.personal.summary && <p className="mb-4 italic text-slate-600">{data.personal.summary}</p>}
            {visibility.infos && data.personal.infos && <p className="mb-4 text-slate-500">{data.personal.infos}</p>}
            <div className="grid grid-cols-12 gap-x-6">
                <div className="col-span-8">
                   {mainOrder.map(key => {
                        const Section = mainComponents[key as keyof typeof mainComponents];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                   })}
                </div>
                <div className="col-span-4">
                    {sidebarOrder.map(key => {
                        const Section = sidebarComponents[key as keyof typeof sidebarComponents];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            </div>
        </div>
    );
});