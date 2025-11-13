import React, { memo } from 'react';
import { CVData, TemplateProps } from '../../../types';
import { formatUrl, SkillRating, ProfilePhoto } from './common';
import { gradients } from '../../../constants';


export const CreativeTemplate: React.FC<TemplateProps> = memo((props) => {
    const { data, themeColor, visibility, sectionSpacing, itemSpacing, borderRadius, useGradient, colorShade, photoShape } = props;
    const initials = `${data.personal.firstName?.[0] || ''}${data.personal.lastName?.[0] || ''}`;
    
    const bgClass = `bg-${themeColor}-${colorShade}`;
    const lightBgClass = `bg-${themeColor}-100`;
    const textClass = `text-${themeColor}-${colorShade}`;
    const textDarkClass = `text-${themeColor}-${Math.min(900, colorShade + 200)}`;

    const gradientStyle = useGradient ? { background: gradients[themeColor] } : {};
    const sectionStyle = { marginBottom: `${sectionSpacing * 0.25}rem` };
    const itemStyle = { marginBottom: `${itemSpacing * 0.25}rem` };
    const roundedStyle = { borderRadius: `${borderRadius}px` };
    const largeRoundedStyle = { borderRadius: `${borderRadius * 1.5}px` };

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className={`text-2xl font-black mb-6 flex items-center gap-2 ${textDarkClass}`}><span style={useGradient ? gradientStyle : {}} className={`w-8 h-1 ${!useGradient ? bgClass : ''}`}></span>{title}</h3>
    );
    
    const Experiences = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <SectionHeader title="Expériences" />
            {data.experiences.map((exp, i) => (
                <div key={exp.id} style={{ ...largeRoundedStyle, ...(i < data.experiences.length - 1 ? itemStyle : undefined) }} className="bg-slate-50 p-6 border border-slate-100 hover:shadow-md transition-shadow break-inside-avoid-page">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xl font-bold text-slate-800">{exp.role}</h4>
                        <span style={{...roundedStyle, ...(useGradient ? gradientStyle : {})}} className={`px-3 py-1 text-xs font-bold text-white ${!useGradient ? bgClass : ''}`}>{exp.date}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">{exp.company}, {exp.city}</div>
                    <p className="text-slate-600 whitespace-pre-line">{exp.description}</p>
                </div>
            ))}
        </section>
    );

    const Education = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <h3 className={`text-xl font-black mb-4 ${textDarkClass}`}>Formation</h3>
            <div className="flex flex-col gap-4">
                {data.education.map(e => (
                    <div key={e.id} className="break-inside-avoid-page">
                        <div className="font-bold text-slate-700">{e.degree}</div>
                        <div className="text-xs text-slate-500">{e.school}, {e.city} | {e.date}</div>
                    </div>
                ))}
            </div>
        </section>
    );

    const Skills = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <h3 className={`text-xl font-black mb-4 ${textDarkClass}`}>Compétences</h3>
            <div className="flex flex-col gap-2">{data.skills.map((s) => (<div key={s.id} className="flex items-center gap-2"><div style={useGradient ? gradientStyle : {}} className={`h-2 w-2 rounded-full ${!useGradient ? bgClass : ''}`}></div><span className="font-medium text-slate-700">{s.name}</span><div className="flex-1"></div>{visibility.showSkillLevels && <SkillRating level={s.level} colorClass={bgClass} />}</div>))}</div>
        </section>
    );

    const Hobbies = (p: {style: React.CSSProperties}) => (
        <section style={p.style}>
            <h3 className={`text-xl font-black mb-4 ${textDarkClass}`}>Loisirs</h3>
            <div className="flex flex-col gap-2">{data.hobbies.map((h, i) => (<div key={i} className="flex items-center gap-2"><div style={useGradient ? gradientStyle : {}} className={`h-2 w-2 rounded-full ${!useGradient ? bgClass : ''}`}></div><span className="font-medium text-slate-700">{h}</span></div>))}</div>
        </section>
    );
    
    const CustomSections = (p: {style: React.CSSProperties}) => (
        <div style={p.style}>
        {data.customSections.map(section => (
            <section key={section.id} className="mb-6">
                <SectionHeader title={section.title} />
                {section.items.map((item, i) => (
                    <div key={item.id} style={{ ...largeRoundedStyle, ...(i < section.items.length - 1 ? itemStyle : undefined) }} className="bg-slate-50 p-6 border border-slate-100 hover:shadow-md transition-shadow break-inside-avoid-page">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="text-xl font-bold text-slate-800">{item.title}</h4>
                            <span style={{...roundedStyle, ...(useGradient ? gradientStyle : {})}} className={`px-3 py-1 text-xs font-bold text-white ${!useGradient ? bgClass : ''}`}>{item.date}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">{item.subtitle}</div>
                        <p className="text-slate-600 whitespace-pre-line">{item.description}</p>
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
    
    const mainComponents = { experiences: Experiences, customSections: CustomSections };
    const sidebarComponents = { skills: Skills, education: Education, hobbies: Hobbies };
    
    const mainOrder = data.sectionOrder.filter(key => key in mainComponents);
    const sidebarOrder = data.sectionOrder.filter(key => key in sidebarComponents);

    return (
        <div className={`h-full min-h-[297mm] bg-white overflow-hidden relative font-sans`}>
            <div className={`absolute -top-24 -right-24 w-96 h-96 rounded-full ${lightBgClass} opacity-50`}></div>
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-${themeColor}-500 to-transparent`}></div>
            <div className="p-12 relative z-10">
                <header className="flex gap-6 items-center" style={sectionStyle}>
                    <ProfilePhoto
                        photo={data.personal.photo}
                        initials={initials}
                        photoShape={photoShape}
                        style={{ ...largeRoundedStyle, ...(useGradient ? gradientStyle : {}) }}
                        className={`w-32 h-32 ${!useGradient ? bgClass : ''} shadow-xl rotate-3`}
                        textClassName="text-5xl font-bold text-white"
                    />
                    <div>
                        <h1 className="text-6xl font-black text-slate-800 tracking-tighter lowercase">{data.personal.firstName}<span className={textClass}>.</span>{data.personal.lastName}</h1>
                        <p className={`text-2xl font-medium ${textDarkClass} mt-2`}>{data.personal.title}</p>
                        {visibility.infos && data.personal.infos && <p className="text-sm text-slate-500 mt-2">{data.personal.infos}</p>}
                    </div>
                </header>
                <div className="grid grid-cols-12 gap-12">
                    <div className="col-span-8">
                        {data.personal.summary && (
                             <section style={sectionStyle}>
                                <SectionHeader title="Profil" />
                                <p style={largeRoundedStyle} className="text-slate-600 bg-slate-50 p-6 border border-slate-100">{data.personal.summary}</p>
                            </section>
                        )}
                        {mainOrder.map(key => {
                            const Section = mainComponents[key as keyof typeof mainComponents];
                            return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                        })}
                    </div>
                    <div className="col-span-4">
                        <div style={{ ...largeRoundedStyle, ...(useGradient ? gradientStyle : {}), ...sectionStyle }} className={`${!useGradient ? bgClass : ''} text-white p-6 shadow-lg -rotate-1`}>
                            <h3 className="font-bold text-xl mb-4 border-b border-white/20 pb-2">Contact</h3>
                            <div className="space-y-3 text-sm break-all">
                                {data.personal.phone && <div>{data.personal.phone}</div>}
                                {data.personal.email && <div>{data.personal.email}</div>}
                                {data.personal.address && <div>{data.personal.address}</div>}
                                {visibility.linkedin && data.personal.linkedin && <a href={formatUrl(data.personal.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.linkedin}</a>}
                                {visibility.github && data.personal.github && <a href={formatUrl(data.personal.github)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.github}</a>}
                                {visibility.portfolio && data.personal.portfolio && <a href={formatUrl(data.personal.portfolio)} target="_blank" rel="noopener noreferrer" className="hover:underline">{data.personal.portfolio}</a>}
                            </div>
                        </div>
                        {sidebarOrder.map(key => {
                            const Section = sidebarComponents[key as keyof typeof sidebarComponents];
                            return Section && shouldRenderSection(key) ? <Section key={key} style={sectionStyle} /> : null;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});