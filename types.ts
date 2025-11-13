// types.ts

export type PhotoShape = 'round' | 'square';

export interface PersonalData {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  infos: string;
  summary: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  photo?: string | null;
}

export interface Experience {
  id: number;
  role: string;
  company: string;
  city: string;
  date: string;
  description: string;
}

export interface Education {
  id: number;
  degree: string;
  school: string;
  city: string;
  date: string;
  description: string;
}

export interface Skill {
  id: number;
  name: string;
  level: number; // 0-5
}

export interface CustomItem {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  description: string;
}

export interface CustomSection {
  id: number;
  title: string;
  items: CustomItem[];
}

export type SectionKey = string; // 'experiences', 'education', 'skills', 'hobbies', 'custom_12345'

export interface CVData {
  personal: PersonalData;
  experiences: Experience[];
  education: Education[];
  skills: Skill[];
  hobbies: string[];
  customSections: CustomSection[];
  sectionOrder: SectionKey[];
}

export interface VisibilitySettings {
  linkedin: boolean;
  github: boolean;
  portfolio: boolean;
  hobbies: boolean;
  infos: boolean;
  showSkillLevels: boolean;
}

export type Template = 'sidebar' | 'header' | 'minimal' | 'elegant' | 'creative' | 'timeline' | 'corporate' | 'tech' | 'split' | 'compact' | 'centered' | 'top-focus' | 'sidebar-right' | 'split-wide' | 'minimal-icons' | 'header-photo' | 'dark-modern' | 'infographic' | 'two-tone' | 'moderno';
export type FontFamily = 'sans' | 'serif' | 'mono' | 'script';
export type ThemeColor = 'emerald' | 'blue' | 'purple' | 'rose' | 'slate' | 'orange' | 'indigo' | 'teal' | 'cyan' | 'pink' | 'amber' | 'lime' | 'gray' | 'yellow' | 'sky';
export type FontSize = 'sm' | 'base' | 'lg';

export interface PredefinedTheme {
  name: string;
  t: Template;
  c: ThemeColor;
  f: FontFamily;
}

export interface Suggestion {
  field: 'summary' | 'experience.description';
  itemId?: number; // Required for experience.description
  original: string;
  suggestion: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: Suggestion[];
}

export interface TemplateProps {
    data: CVData;
    themeColor: ThemeColor;
    visibility: VisibilitySettings;
    sectionSpacing: number;
    itemSpacing: number;
    borderRadius: number;
    useGradient: boolean;
    colorShade: number;
    photoShape: PhotoShape;
    // Optional props for variants
    right?: boolean;
    withPhoto?: boolean;
    withIcons?: boolean;
    wide?: boolean;
}


// For Gemini Service response
export type AIResponseType = 'chat' | 'update' | 'suggestion' | 'error';

export interface AIChatResponse {
    type: 'chat';
    content: string;
}

export interface AIUpdateResponse {
    type: 'update';
    content: Partial<Omit<CVData, 'sectionOrder'>>; // AI should not change section order directly
}

export interface AISuggestionResponse {
    type: 'suggestion';
    content: Suggestion[];
}


export interface AIErrorResponse {
    type: 'error';
    content: string;
}

export type GeminiAIResponse = AIChatResponse | AIUpdateResponse | AISuggestionResponse;

// Actions for useReducer
export type CVAction =
  | { type: 'SET_CV_DATA'; payload: CVData }
  | { type: 'UPDATE_PERSONAL'; payload: { field: keyof PersonalData; value: string | null } }
  | { type: 'ADD_ITEM'; payload: { section: 'experiences' | 'education' } }
  | { type: 'DELETE_ITEM'; payload: { section: 'experiences' | 'education'; id: number } }
  | { type: 'UPDATE_ITEM'; payload: { section: 'experiences' | 'education'; id: number; field: string; value: string } }
  | { type: 'ADD_SKILL' }
  | { type: 'DELETE_SKILL'; payload: { id: number } }
  | { type: 'UPDATE_SKILL'; payload: { id: number; field: 'name' | 'level'; value: string | number } }
  | { type: 'ADD_HOBBY' }
  | { type: 'DELETE_HOBBY'; payload: { index: number } }
  | { type: 'UPDATE_HOBBY'; payload: { index: number; value: string } }
  | { type: 'ADD_CUSTOM_SECTION' }
  | { type: 'DELETE_CUSTOM_SECTION'; payload: { sectionId: number } }
  | { type: 'UPDATE_CUSTOM_SECTION_TITLE'; payload: { sectionId: number; title: string } }
  | { type: 'ADD_CUSTOM_ITEM'; payload: { sectionId: number } }
  | { type: 'DELETE_CUSTOM_ITEM'; payload: { sectionId: number; itemId: number } }
  | { type: 'UPDATE_CUSTOM_ITEM'; payload: { sectionId: number; itemId: number; field: keyof Omit<CustomItem, 'id'>; value: string } }
  | { type: 'REORDER_SECTION'; payload: { startIndex: number; endIndex: number } }
  | { type: 'REORDER_LIST'; payload: { section: 'experiences' | 'education' | 'skills' | 'hobbies'; startIndex: number; endIndex: number } }
  | { type: 'REORDER_CUSTOM_SECTION_ITEMS'; payload: { sectionId: number; startIndex: number; endIndex: number } }
  | { type: 'REORDER_CUSTOM_SECTIONS'; payload: { startIndex: number; endIndex: number } }
  | { type: 'UPDATE_FROM_AI'; payload: Partial<CVData> };