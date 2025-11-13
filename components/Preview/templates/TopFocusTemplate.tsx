import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl, SkillRating } from './common';

export const TopFocusTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, colorShade } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const textClass = `text-${themeColor}-${colorShade}`;
    const lightBgClass = `bg-${themeColor}-50`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const bgClass = `bg-${themeColor}-${colorShade}`;
    
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
    
    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className={`font-bold text-xl uppercase border-b-2 ${borderClass} pb-1 mb-4`}>{title}</h3>
    );
    
    const Experiences = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" />
            {data.experiences.map((e, i) => <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-lg">{e.role} <span className="text-sm font-normal text-slate-500 float-right">{e.date}</span></div><div className="text-sm italic mb-1">{e.company}, {e.city}</div><p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p></div>)}
        </section>
    );

    const Education = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Formation" />
            {data.education.map((e, i) => <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-lg">{e.degree} <span className="text-sm font-normal text-slate-500 float-right">{e.date}</span></div><div className="text-sm italic mb-1">{e.school}</div><p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p></div>)}
        </section>
    );

    const CustomSections = (p: {style: React.CSSProperties}) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                 <section key={section.id} className="mb-6">
                    <SectionHeader title={section.title} />
                    {section.items.map((item, i) => <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-lg">{item.title} <span className="text-sm font-normal text-slate-500 float-right">{item.date}</span></div><div className="text-sm italic mb-1">{item.subtitle}</div><p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p></div>)}
                </section>
            ))}
        </div>
    );
    
    const Skills = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Compétences" />
            <div className="flex flex-col gap-2">{data.skills.map((s) => <div key={s.id} className="flex items-center justify-between text-sm"><span>{s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass} />}</div>)}</div>
        </section>
    );

    const Hobbies = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Loisirs" />
            <p className="text-sm text-slate-600">{data.hobbies.join(', ')}</p>
        </section>
    );
    
    const mainComponents = { experiences: Experiences, education: Education, customSections: CustomSections };
    const sidebarComponents = { skills: Skills, hobbies: Hobbies };
    
    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);

    return (
        <div className={`h-full min-h-[297mm] bg-white font-sans`}>
            <header style={roundedStyle} className={`${lightBgClass} p-10 print-color-adjust-exact m-4`}>
                <h1 className={`text-5xl font-extrabold ${textDarkClass}`}>{data.personal.firstName} {data.personal.lastName}</h1>
                <p className="text-xl text-slate-600 mt-2 mb-6">{data.personal.title}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {data.personal.phone && <div className="flex items-center gap-2"><Icons.Phone className={`h-4 w-4 ${textClass}`} /> {data.personal.phone}</div>}
                    {data.personal.email && <div className="flex items-center gap-2"><Icons.Mail className={`h-4 w-4 ${textClass}`} /> {data.personal.email}</div>}
                    {data.personal.address && <div className="flex items-center gap-2"><Icons.MapPin className={`h-4 w-4 ${textClass}`} /> {data.personal.address}</div>}
                    {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline"><Icons.Linkedin className={`h-4 w-4 ${textClass}`} /> {data.personal.linkedin}</a>}
                    {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline"><Icons.Github className={`h-4 w-4 ${textClass}`} /> {data.personal.github}</a>}
                    {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline"><Icons.Link className={`h-4 w-4 ${textClass}`} /> {data.personal.portfolio}</a>}
                </div>
                {data.personal.summary && <p className="text-sm text-slate-700 mt-6 border-t border-slate-300 pt-4">{data.personal.summary}</p>}
            </header>
            <div className="p-10 pt-4 grid grid-cols-3 gap-10">
                <div className="col-span-2">
                    {mainOrder.map(key => {
                        const Section = mainComponents[key as keyof typeof mainComponents];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                    })}
                </div>
                <div className="col-span-1">
                    {sidebarOrder.map(key => {
                        const Section = sidebarComponents[key as keyof typeof sidebarComponents];
                        return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            </div>
        </div>
    );
});