import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { gradients } from '../../../constants';
import { ProfilePhoto } from './common';

export const CenteredTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, useGradient, colorShade, photoShape } = props;
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;
    
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const textClass = `text-${themeColor}-${colorShade}`;
    
    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };

    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Experiences: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className={`text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-6`}>Expériences</h3>
            <div>
                {data.experiences.map((e, i) => (
                    <div key={e.id} style={i < data.experiences.length - 1 ? itemStyle : undefined} className="grid grid-cols-4 gap-4 break-inside-avoid-page">
                        <div className="col-span-1 text-right">
                            <div className="font-bold text-slate-700">{e.company}, {e.city}</div>
                            <div className="text-xs text-slate-400">{e.date}</div>
                        </div>
                        <div className="col-span-3 border-l-2 border-slate-200 pl-4">
                            <h4 className="font-bold text-md">{e.role}</h4>
                            <p className="text-sm text-slate-600 whitespace-pre-line">{e.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Education: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className={`text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-4`}>Formation</h3>
            {data.education.map((e, i) => (
                <div key={e.id} style={i < data.education.length - 1 ? itemStyle : undefined} className="text-center text-sm break-inside-avoid-page">
                    <div className="font-bold">{e.degree}</div>
                    <div className="text-slate-500">{e.school}, {e.city}</div>
                    <div className="text-xs text-slate-400">{e.date}</div>
                    {e.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-line">{e.description}</p>}
                </div>
            ))}
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Skills: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style}>
            <h3 className={`text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-4`}>Compétences</h3>
            <div className="text-center text-sm text-slate-600">{data.skills.map(s => s.name).join(' • ')}</div>
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const Hobbies: React.FC<{style: React.CSSProperties}> = (p) => (
        <section style={p.style} className="mt-8 pt-8 border-t border-slate-100">
            <h3 className={`text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-4`}>Loisirs</h3>
            <p className="text-center text-sm text-slate-600">{data.hobbies.join(' • ')}</p>
        </section>
    );
    // Fix: Updated component type to React.FC<{style: React.CSSProperties}> to handle 'key' prop correctly.
    const CustomSections: React.FC<{style: React.CSSProperties}> = (p) => (
        <div style={p.style}>
            {data.customSections.map(section => (
                 <section key={section.id} className="mb-6">
                    <h3 className={`text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-6`}>{section.title}</h3>
                    {section.items.map((item, i) => (
                        <div key={item.id} style={i < section.items.length - 1 ? itemStyle : undefined} className="grid grid-cols-4 gap-4 break-inside-avoid-page">
                            <div className="col-span-1 text-right">
                                <div className="font-bold text-slate-700">{item.subtitle}</div>
                                <div className="text-xs text-slate-400">{item.date}</div>
                            </div>
                            <div className="col-span-3 border-l-2 border-slate-200 pl-4">
                                <h4 className="font-bold text-md">{item.title}</h4>
                                <p className="text-sm text-slate-600 whitespace-pre-line">{item.description}</p>
                            </div>
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
    
    const mainSections = { experiences: Experiences, customSections: CustomSections };
    const footerSections = { education: Education, skills: Skills, hobbies: Hobbies };
    const mainOrder = data.sectionOrder.filter(key => key in mainSections);
    const footerOrder = data.sectionOrder.filter(key => key in footerSections);

    return (
        <div className={`h-[297mm] p-[15mm] bg-white`}>
            <header className="text-center mb-10">
                <ProfilePhoto
                    photo={data.personal.photo}
                    initials={initials}
                    photoShape={photoShape}
                    style={useGradient ? gradientStyle : {}}
                    className={`w-20 h-20 ${!useGradient ? bgClass : ''} mx-auto mb-4`}
                    textClassName="text-3xl font-bold text-white"
                />
                <h1 className="text-4xl font-bold text-slate-900">{data.personal.firstName} {data.personal.lastName}</h1>
                <p className={`text-lg font-medium ${textClass} mt-1`}>{data.personal.title}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 max-w-xl mx-auto flex justify-center gap-x-4 gap-y-1 text-xs text-slate-500 flex-wrap">
                    {data.personal.phone && <span>{data.personal.phone}</span>}
                    {data.personal.email && <span>{data.personal.email}</span>}
                    {data.personal.address && <span>{data.personal.address}</span>}
                    {visibility.linkedin && data.personal.linkedin && <span>{data.personal.linkedin}</span>}
                </div>
                 {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mt-2">{data.personal.infos}</p>}
                {data.personal.summary && <p className="text-sm text-slate-500 mt-4 max-w-2xl mx-auto">{data.personal.summary}</p>}
            </header>
            <div className="max-w-4xl mx-auto">
                {mainOrder.map(key => {
                    const Section = mainSections[key as keyof typeof mainSections];
                    return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                })}

                {(footerOrder.some(key => shouldRenderSection(key))) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                        {footerOrder.map(key => {
                            if (key === 'hobbies') return null;
                            const Section = footerSections[key as keyof typeof footerSections];
                            return Section && shouldRenderSection(key) ? <Section key={key} style={{}} /> : null;
                        })}
                    </div>
                )}
                {shouldRenderSection('hobbies') && <Hobbies style={{}} />}
            </div>
        </div>
    );
});