import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl, SkillRating } from './common';

export const MinimalTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, withIcons = false } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const colorClass = `bg-${themeColor}-500`;

    const shouldRenderSection = (section: keyof typeof mainComponents | keyof typeof sidebarComponents) => {
        switch (section) {
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
            <h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.Briefcase className="h-3 w-3" />}Expériences</h3>
            {data.experiences.map((e, i) => <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><h4 className="font-bold">{e.role}</h4><div className="text-xs text-slate-400 uppercase mb-2">{e.company}, {e.city} | {e.date}</div><p className="text-sm text-slate-700 whitespace-pre-line">{e.description}</p></div>)}
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.GraduationCap className="h-3 w-3" />}Formation</h3>
            {data.education.map((e, i) => <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="text-sm break-inside-avoid-page"><div className="flex justify-between"><span className="font-bold">{e.degree}</span><span className="text-slate-500">{e.date}</span></div><div className="text-xs text-slate-500">{e.school}, {e.city}</div></div>)}
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                <section key={section.id} className="mb-6">
                    <h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.Plus className="h-3 w-3" />}{section.title}</h3>
                    {section.items.map((item, i) => <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><h4 className="font-bold">{item.title}</h4><div className="text-xs text-slate-400 uppercase mb-2">{item.subtitle} | {item.date}</div><p className="text-sm text-slate-700 whitespace-pre-line">{item.description}</p></div>)}
                </section>
            ))}
        </div>
    );
    
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.Settings className="h-3 w-3" />}Compétences</h3>
            <div className="flex flex-col gap-2">{data.skills.map((s) => <div key={s.id} className="text-sm flex items-center justify-between"><span>{s.name}</span> {visibility.showSkillLevels && <SkillRating level={s.level} colorClass={colorClass} />}</div>)}</div>
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.Star className="h-3 w-3" />}Loisirs</h3>
            <div className="flex flex-col gap-1">{data.hobbies.map((h, i) => <span key={i} className="text-sm">{h}</span>)}</div>
        </section>
    );

    const mainComponents = { experiences: Experiences, education: Education, customSections: CustomSections };
    const sidebarComponents = { skills: Skills, hobbies: Hobbies };

    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);
    
    return (
        <div className={`h-[297mm] p-[15mm] bg-white text-slate-900 font-sans`}>
            <header className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-light uppercase tracking-widest">{data.personal.lastName}</h1>
                    <h2 className="text-xl font-bold">{data.personal.firstName}</h2>
                </div>
                <div className="text-right text-sm text-slate-500">
                    <div>{data.personal.title}</div>
                    {data.personal.email && <div className={`flex items-center justify-end gap-2 ${withIcons ? '' : 'mt-1'}`}>{withIcons && <Icons.Mail className="h-3 w-3" />}{data.personal.email}</div>}
                    {data.personal.phone && <div className={`flex items-center justify-end gap-2 ${withIcons ? '' : 'mt-1'}`}>{withIcons && <Icons.Phone className="h-3 w-3" />}{data.personal.phone}</div>}
                    {data.personal.address && <div className={`flex items-center justify-end gap-2 ${withIcons ? '' : 'mt-1'}`}>{withIcons && <Icons.MapPin className="h-3 w-3" />}{data.personal.address}</div>}
                </div>
            </header>
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-4 border-r border-slate-200 pr-4">
                    {data.personal.summary && <section style={sectionStyle}><h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.User className="h-3 w-3" />}Profil</h3><p className="text-sm text-slate-600 text-justify">{data.personal.summary}</p>{visibility.infos && data.personal.infos && <p className="text-xs text-slate-500 mt-2">{data.personal.infos}</p>}</section>}
                    
                    {sidebarOrder.map(key => {
                        const SectionComponent = sidebarComponents[key as keyof typeof sidebarComponents];
                        return SectionComponent && shouldRenderSection(key as keyof typeof sidebarComponents) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                    })}
                    
                    {( (visibility.linkedin && data.personal.linkedin) || (visibility.github && data.personal.github) || (visibility.portfolio && data.personal.portfolio) ) && (
                        <section>
                            <h3 className="font-bold uppercase tracking-widest text-xs mb-4 border-b pb-1 flex items-center gap-2">{withIcons && <Icons.Link className="h-3 w-3" />}En ligne</h3>
                            <div className="text-sm text-slate-600 flex flex-col gap-1 break-all">
                                {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.linkedin}</a>}
                                {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.github}</a>}
                                {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.portfolio}</a>}
                            </div>
                        </section>
                    )}
                </div>
                <div className="col-span-8">
                    {mainOrder.map(key => {
                        const SectionComponent = mainComponents[key as keyof typeof mainComponents];
                        return SectionComponent && shouldRenderSection(key as keyof typeof mainComponents) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            </div>
        </div>
    );
});