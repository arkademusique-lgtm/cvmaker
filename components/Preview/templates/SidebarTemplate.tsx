import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import * as Icons from '../../Icons';
import { formatUrl, SkillRating, ProfilePhoto } from './common';
import { gradients } from '../../../constants';


export const SidebarTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, useGradient, colorShade, photoShape, right = false } = props;
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;
    
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textClass = `text-${themeColor}-${colorShade}`;
    const borderClass = `border-${themeColor}-${Math.max(400, colorShade - 100)}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;
    
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };

    const shouldRenderSection = (section: keyof typeof sectionComponents) => {
        switch (section) {
            case 'experiences': return data.experiences.length > 0;
            case 'education': return data.education.length > 0;
            case 'customSections': return data.customSections.length > 0;
            default: return false;
        }
    };

    const Experiences = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <h3 className={`text-xl font-bold uppercase mb-4 flex items-center gap-2 ${textDarkClass}`}><Icons.Briefcase className="h-5 w-5" /> Expériences</h3>
            <div>{data.experiences.map((e, i) => <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="flex justify-between font-bold text-lg"><span>{e.role}</span><span className="text-sm opacity-70">{e.date}</span></div><div className={`${textClass} text-sm mb-1`}>{e.company}, {e.city}</div><p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p></div>)}</div>
        </section>
    );

    const Education = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <h3 className={`text-xl font-bold uppercase mb-4 flex items-center gap-2 ${textDarkClass}`}><Icons.GraduationCap className="h-5 w-5" /> Formation</h3>
            <div>{data.education.map((e, i) => <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="flex justify-between font-bold text-lg"><span>{e.degree}</span><span className="text-sm opacity-70">{e.date}</span></div><div className="italic text-sm">{e.school}</div><p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p></div>)}</div>
        </section>
    );

    const CustomSections = (p: {style: React.CSSProperties}) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                <section key={section.id} className="mb-6">
                    <h3 className={`text-xl font-bold uppercase mb-4 flex items-center gap-2 ${textDarkClass}`}><Icons.Plus className="h-5 w-5" /> {section.title}</h3>
                    <div>{section.items.map((item, i) => <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="break-inside-avoid-page"><div className="flex justify-between font-bold text-lg"><span>{item.title}</span><span className="text-sm opacity-70">{item.date}</span></div><div className={`${textClass} text-sm mb-1`}>{item.subtitle}</div><p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p></div>)}</div>
                </section>
            ))}
        </div>
    );
    
    const sectionComponents = { experiences: Experiences, education: Education, customSections: CustomSections };
    const mainContentOrder = data.sectionOrder.filter(key => key in sectionComponents);

    return (
        <div className={`flex h-full min-h-[297mm] font-sans ${right ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-[75mm] bg-slate-900 text-white p-8 flex flex-col gap-8 print-color-adjust-exact flex-shrink-0">
                <div className="flex justify-center">
                    <ProfilePhoto
                        photo={data.personal.photo}
                        initials={initials}
                        photoShape={photoShape}
                        style={useGradient ? gradientStyle : {}}
                        className={`w-24 h-24 ${!useGradient ? bgClass : ''} border-4 border-slate-800 shadow-lg`}
                        textClassName="text-3xl font-bold text-white"
                    />
                </div>
                <section>
                    <h3 className="text-sm font-bold tracking-widest text-slate-400 border-b border-slate-700 pb-2 mb-4 uppercase">Contact</h3>
                    <div className="flex flex-col gap-4 text-sm text-slate-300 break-words">
                        {data.personal.phone && <div className="flex items-start gap-3"><Icons.Phone className="h-4 w-4 mt-1 opacity-70 flex-shrink-0" />{data.personal.phone}</div>}
                        {data.personal.email && <div className="flex items-start gap-3"><Icons.Mail className="h-4 w-4 mt-1 opacity-70 flex-shrink-0" />{data.personal.email}</div>}
                        {data.personal.address && <div className="flex items-start gap-3"><Icons.MapPin className="h-4 w-4 mt-1 opacity-70 flex-shrink-0" />{data.personal.address}</div>}
                        {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-white"><Icons.Linkedin className="h-4 w-4 mt-1 opacity-70 flex-shrink-0" />{data.personal.linkedin}</a>}
                        {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-white"><Icons.Github className="h-4 w-4 mt-1 opacity-70 flex-shrink-0" />{data.personal.github}</a>}
                        {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-white"><Icons.Link className="h-4 w-4 mt-1 opacity-70 flex-shrink-0" />{data.personal.portfolio}</a>}
                    </div>
                </section>
                {data.skills.length > 0 && (
                    <section>
                        <h3 className="text-sm font-bold tracking-widest text-slate-400 border-b border-slate-700 pb-2 mb-4 uppercase">Compétences</h3>
                        <div className="flex flex-col gap-2">{data.skills.map((s) => <div key={s.id} className="flex items-center justify-between text-xs"><span style={roundedStyle}>{s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass} />}</div>)}</div>
                    </section>
                )}
                 {visibility.hobbies && data.hobbies.length > 0 && (
                    <section>
                        <h3 className="text-sm font-bold tracking-widest text-slate-400 border-b border-slate-700 pb-2 mb-4 uppercase">Loisirs</h3>
                        <div className="flex flex-wrap gap-2">{data.hobbies.map((h, i) => <span key={i} style={roundedStyle} className="bg-slate-800 px-2 py-1 text-xs">{h}</span>)}</div>
                    </section>
                )}
            </div>
            <div className="flex-1 p-8 bg-white">
                <header className={`border-b-4 ${borderClass} pb-6 mb-6`}>
                    <h1 className="text-5xl font-bold text-slate-800 uppercase">{data.personal.firstName} <span className={textClass}>{data.personal.lastName}</span></h1>
                    <h2 className="text-2xl text-slate-600">{data.personal.title}</h2>
                    {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mt-2">{data.personal.infos}</p>}
                </header>
                {data.personal.summary && <div className="text-slate-600 italic border-l-4 border-slate-200 pl-4" style={sectionStyle}>{data.personal.summary}</div>}
                
                {mainContentOrder.map(key => {
                    const SectionComponent = sectionComponents[key as keyof typeof sectionComponents];
                    return SectionComponent && shouldRenderSection(key as keyof typeof sectionComponents) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                })}
            </div>
        </div>
    );
});