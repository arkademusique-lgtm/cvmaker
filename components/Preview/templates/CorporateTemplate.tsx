import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { SkillRating } from './common';

export const CorporateTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius } = props;
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };
    
    const lightBgClass = `bg-${themeColor}-50`;
    const borderClass = `border-${themeColor}-500`;
    const bgClass = `bg-${themeColor}-500`;

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 style={roundedStyle} className="bg-slate-800 text-white px-4 py-1 text-sm font-bold uppercase inline-block mb-4">{title}</h3>
    );
    
    const Experiences = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Expérience Professionnelle" />
            <div>
                {data.experiences.map((exp, i) => (
                    <div key={exp.id} style={{...roundedStyle, ...(i < data.experiences.length - 1 ? itemStyle : undefined)}} className="border border-slate-200 p-4 break-inside-avoid-page">
                        <div className="flex justify-between font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2"><span>{exp.role}</span><span>{exp.date}</span></div>
                        <div className="text-xs font-bold uppercase text-slate-500 mb-2">{exp.company} | {exp.city}</div>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{exp.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );

    const Education = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Formation" />
            {data.education.map((e, i) => (
                <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="text-sm break-inside-avoid-page">
                    <div className="font-bold">{e.degree}</div>
                    <div className="text-slate-500">{e.school}, {e.city} | {e.date}</div>
                    {e.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{e.description}</p>}
                </div>
            ))}
        </section>
    );

    const Skills = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Compétences" />
            <div className="grid grid-cols-2 gap-2">{data.skills.map((s) => <div key={s.id} style={roundedStyle} className="text-sm border border-slate-200 px-2 py-1 bg-slate-50 flex items-center justify-between"><span>{s.name}</span>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass}/>}</div>)}</div>
        </section>
    );

    const Hobbies = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Loisirs" />
            <p className="text-sm text-slate-700">{data.hobbies.join(', ')}</p>
        </section>
    );

    const CustomSections = (p: {style: React.CSSProperties}) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                 <section key={section.id}>
                    <SectionHeader title={section.title} />
                    <div>
                        {section.items.map((item, i) => (
                            <div key={item.id} style={{...roundedStyle, ...(i < section.items.length - 1 ? itemStyle : undefined)}} className="border border-slate-200 p-4 break-inside-avoid-page">
                                <div className="flex justify-between font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2"><span>{item.title}</span><span>{item.date}</span></div>
                                <div className="text-xs font-bold uppercase text-slate-500 mb-2">{item.subtitle}</div>
                                <p className="text-sm text-slate-700 whitespace-pre-line">{item.description}</p>
                            </div>
                        ))}
                    </div>
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
    
    const sectionComponents = { experiences: Experiences, education: Education, skills: Skills, hobbies: Hobbies, customSections: CustomSections };

    return (
        <div className={`h-full min-h-[297mm] bg-white font-sans`}>
            <header className="bg-slate-100 p-10 border-b border-slate-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 uppercase">{data.personal.firstName} {data.personal.lastName}</h1>
                        <p className="text-lg text-slate-600 font-medium">{data.personal.title}</p>
                        {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mt-2">{data.personal.infos}</p>}
                    </div>
                    <div className="text-right text-sm text-slate-500 font-mono break-all">
                        {data.personal.email && <div>{data.personal.email}</div>}
                        {data.personal.phone && <div>{data.personal.phone}</div>}
                        {data.personal.address && <div>{data.personal.address}</div>}
                        {visibility.linkedin && data.personal.linkedin && <div>{data.personal.linkedin}</div>}
                        {visibility.github && data.personal.github && <div>{data.personal.github}</div>}
                        {visibility.portfolio && data.personal.portfolio && <div>{data.personal.portfolio}</div>}
                    </div>
                </div>
            </header>
            <div className="p-10">
                {data.personal.summary && <div style={{...sectionStyle, ...roundedStyle}} className={`p-4 ${lightBgClass} border-l-4 ${borderClass} text-slate-700 text-sm`}><strong>Profil :</strong> {data.personal.summary}</div>}
                
                {data.sectionOrder.map(key => {
                    const SectionComponent = sectionComponents[key as keyof typeof sectionComponents];
                    return SectionComponent && shouldRenderSection(key) ? <SectionComponent key={key} style={sectionStyle} /> : null;
                })}
            </div>
        </div>
    );
});