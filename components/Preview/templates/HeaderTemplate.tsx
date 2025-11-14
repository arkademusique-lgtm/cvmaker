import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { formatUrl, SkillRating, ProfilePhoto } from './common';
import { gradients } from '../../../constants';
import * as Icons from '../../Icons';


export const HeaderTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, useGradient, colorShade, photoShape, withPhoto = false } = props;
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;

    const bgClass = `bg-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const shouldRenderSection = (section: keyof typeof sectionComponents | 'skills' | 'hobbies') => {
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
            <h3 className={`text-xl font-bold border-b-2 ${borderClass} pb-1 mb-4 uppercase`}>Expériences</h3>
            {data.experiences.map((e, i) => <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-lg">{e.role} <span className="text-sm font-normal text-slate-500 float-right">{e.date}</span></div><div className="text-sm italic mb-1">{e.company}, {e.city}</div><p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p></div>)}
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className={`text-xl font-bold border-b-2 ${borderClass} pb-1 mb-4 uppercase`}>Formation</h3>
            {data.education.map((e, i) => (
               <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page">
                   <div className="font-bold text-lg">{e.degree} <span className="text-sm font-normal text-slate-500 float-right">{e.date}</span></div>
                   <div className="text-sm italic mb-1">{e.school}, {e.city}</div>
                   {e.description && <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>}
               </div>
           ))}
       </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                <section key={section.id} className="mb-6">
                    <h3 className={`text-xl font-bold border-b-2 ${borderClass} pb-1 mb-4 uppercase`}>{section.title}</h3>
                    {section.items.map((item, i) => <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="font-bold text-lg">{item.title} <span className="text-sm font-normal text-slate-500 float-right">{item.date}</span></div><div className="text-sm italic mb-1">{item.subtitle}</div><p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p></div>)}
                </section>
            ))}
        </div>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className={`font-bold uppercase mb-3 ${textDarkClass}`}>Compétences</h3>
            <div className="flex flex-col gap-2">{data.skills.map((s) => <div key={s.id} className="flex items-center justify-between text-sm"><span>{s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass} />}</div>)}</div>
        </section>
    );

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
           <h3 className={`font-bold uppercase mb-3 ${textDarkClass}`}>Loisirs</h3>
           <ul className="list-disc pl-4 text-sm space-y-1">{data.hobbies.map((h, i) => <li key={i}>{h}</li>)}</ul>
       </section>
   );

    const sectionComponents = { experiences: Experiences, education: Education, customSections: CustomSections };
    const sidebarComponents = { skills: Skills, hobbies: Hobbies };

    const mainContentOrder = data.sectionOrder.filter(key => key in sectionComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);

    return (
        <div className={`h-[297mm] bg-white font-sans`}>
            <div style={useGradient ? gradientStyle : {}} className={`${!useGradient ? bgClass : ''} text-white p-10 print-color-adjust-exact text-center relative`}>
                {withPhoto && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <ProfilePhoto
                            photo={data.personal.photo}
                            initials={initials}
                            photoShape={photoShape}
                            style={useGradient ? gradientStyle : {}}
                            className={`w-28 h-28 ${!useGradient ? bgClass : ''} border-8 border-white shadow-lg`}
                            textClassName="text-4xl font-bold text-white"
                        />
                    </div>
                )}
                <h1 className="text-5xl font-bold uppercase mb-2">{data.personal.firstName} {data.personal.lastName}</h1>
                <h2 className="text-2xl opacity-90 font-light">{data.personal.title}</h2>
                {visibility.infos && data.personal.infos && <p className="text-sm opacity-80 mt-2">{data.personal.infos}</p>}
                <div className="flex justify-center gap-x-4 gap-y-1 text-sm opacity-90 mt-4 flex-wrap">
                    {data.personal.phone && <span>{data.personal.phone}</span>}
                    {data.personal.email && <>•<span>{data.personal.email}</span></>}
                    {data.personal.address && <>•<span>{data.personal.address}</span></>}
                </div>
                 <div className="flex justify-center gap-x-4 gap-y-1 text-sm opacity-90 mt-2 flex-wrap">
                    {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.linkedin}</a>}
                    {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.github}</a>}
                    {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.portfolio}</a>}
                </div>
            </div>
            <div className={`p-10 grid grid-cols-3 gap-10 ${withPhoto ? 'pt-20' : ''}`}>
                <div className="col-span-2">
                    {data.personal.summary && <p className="text-slate-600 text-justify" style={sectionStyle}>{data.personal.summary}</p>}
                    
                    {mainContentOrder.map(key => {
                        const SectionComponent = sectionComponents[key as keyof typeof sectionComponents];
                        return SectionComponent && shouldRenderSection(key as keyof typeof sectionComponents) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                    })}
                </div>
                <div style={roundedStyle} className="col-span-1 bg-slate-50 p-6">
                     {sidebarOrder.map(key => {
                        const SectionComponent = sidebarComponents[key as keyof typeof sidebarComponents];
                        return SectionComponent && shouldRenderSection(key as keyof typeof sidebarComponents) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                    })}
                </div>
            </div>
        </div>
    );
});