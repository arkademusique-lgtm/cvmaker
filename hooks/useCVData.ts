import { useReducer } from 'react';
import { CVData, CVAction, Experience, Education, SectionKey, Skill, CustomSection, CustomItem } from '../types';
import { parseCvFromText } from '../services/geminiService';

const initialState: CVData = {
  personal: {
    firstName: "", lastName: "", title: "", email: "", phone: "",
    address: "", infos: "", summary: "", linkedin: "", github: "", portfolio: "", photo: null,
  },
  experiences: [],
  education: [],
  skills: [],
  hobbies: [],
  customSections: [],
  sectionOrder: ['experiences', 'education', 'skills'],
};

const reorder = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};


const cvReducer = (state: CVData, action: CVAction): CVData => {
  switch (action.type) {
    case 'SET_CV_DATA':
      return action.payload;
    
    case 'UPDATE_PERSONAL':
      return { ...state, personal: { ...state.personal, [action.payload.field]: action.payload.value } };

    // --- Experience / Education ---
    case 'ADD_ITEM': {
      const { section } = action.payload;
      const newItem = section === 'experiences'
        ? { id: Date.now(), role: "", company: "", city: "", date: "", description: "" }
        : { id: Date.now(), degree: "", school: "", city: "", date: "", description: "" };
      return { ...state, [section]: [newItem, ...state[section]] };
    }
    case 'DELETE_ITEM': {
      const { section, id } = action.payload;
      return { ...state, [section]: state[section].filter((item: Experience | Education) => item.id !== id) };
    }
    case 'UPDATE_ITEM': {
      const { section, id, field, value } = action.payload;
      const updatedArray = state[section].map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      );
      return { ...state, [section]: updatedArray };
    }

    // --- Skills ---
    case 'ADD_SKILL':
      return { ...state, skills: [...state.skills, { id: Date.now(), name: "", level: 3 }] };
    case 'DELETE_SKILL':
      return { ...state, skills: state.skills.filter(s => s.id !== action.payload.id) };
    case 'UPDATE_SKILL': {
      return { ...state, skills: state.skills.map(s => s.id === action.payload.id ? { ...s, [action.payload.field]: action.payload.value } : s) };
    }
    
    // --- Hobbies ---
    case 'ADD_HOBBY':
      return { ...state, hobbies: [...state.hobbies, ""] };
    case 'DELETE_HOBBY': {
      const newList = [...state.hobbies];
      newList.splice(action.payload.index, 1);
      return { ...state, hobbies: newList };
    }
    case 'UPDATE_HOBBY': {
      const newList = [...state.hobbies];
      newList[action.payload.index] = action.payload.value;
      return { ...state, hobbies: newList };
    }

    // --- Custom Sections ---
    case 'ADD_CUSTOM_SECTION': {
      const newId = Date.now();
      const newSection = { id: newId, title: "Nouvelle Section", items: [] };
      return { 
          ...state, 
          customSections: [...state.customSections, newSection],
          sectionOrder: [...state.sectionOrder, `custom_${newId}`]
      };
    }
    case 'DELETE_CUSTOM_SECTION':
      return { 
          ...state, 
          customSections: state.customSections.filter(cs => cs.id !== action.payload.sectionId),
          sectionOrder: state.sectionOrder.filter(key => key !== `custom_${action.payload.sectionId}`)
      };
    case 'UPDATE_CUSTOM_SECTION_TITLE':
      return { ...state, customSections: state.customSections.map(cs => cs.id === action.payload.sectionId ? { ...cs, title: action.payload.title } : cs) };
    case 'ADD_CUSTOM_ITEM': {
      const newItem: CustomItem = { id: Date.now(), title: "", subtitle: "", date: "", description: "" };
      return { ...state, customSections: state.customSections.map(cs => cs.id === action.payload.sectionId ? { ...cs, items: [newItem, ...cs.items] } : cs) };
    }
    case 'DELETE_CUSTOM_ITEM':
      return { ...state, customSections: state.customSections.map(cs => cs.id === action.payload.sectionId ? { ...cs, items: cs.items.filter(item => item.id !== action.payload.itemId) } : cs) };
    case 'UPDATE_CUSTOM_ITEM':
      return { ...state, customSections: state.customSections.map(cs => cs.id === action.payload.sectionId ? { ...cs, items: cs.items.map(item => item.id === action.payload.itemId ? { ...item, [action.payload.field]: action.payload.value } : item) } : cs) };

    // --- Reordering ---
    case 'REORDER_SECTION':
      return { ...state, sectionOrder: reorder(state.sectionOrder, action.payload.startIndex, action.payload.endIndex) };
    case 'REORDER_LIST': {
      const { section, startIndex, endIndex } = action.payload;
      const reorderedList = reorder(state[section] as any[], startIndex, endIndex);
      return { ...state, [section]: reorderedList };
    }
    case 'REORDER_CUSTOM_SECTIONS':
      return { ...state, customSections: reorder(state.customSections, action.payload.startIndex, action.payload.endIndex) };
    case 'REORDER_CUSTOM_SECTION_ITEMS': {
      const { sectionId, startIndex, endIndex } = action.payload;
      return { ...state, customSections: state.customSections.map(cs => cs.id === sectionId ? { ...cs, items: reorder(cs.items, startIndex, endIndex) } : cs) };
    }

    // --- AI Update ---
    case 'UPDATE_FROM_AI': {
      const updates = action.payload;
      const newState = { ...state };
      
      if (updates.personal) { newState.personal = { ...state.personal, ...updates.personal }; }
      if (updates.hobbies) { newState.hobbies = updates.hobbies; }
      if (updates.skills) {
        newState.skills = (updates.skills as any).map((skillName: string, i: number) => ({
          id: Date.now() + i, name: skillName, level: 3,
        }));
      }

      if (updates.experiences) {
        newState.experiences = state.experiences.map(exp => {
          const update = updates.experiences?.find(u => u.id === exp.id);
          return update ? { ...exp, ...update } : exp;
        });
      }

      if (updates.education) {
        newState.education = state.education.map(edu => {
          const update = updates.education?.find(u => u.id === edu.id);
          return update ? { ...edu, ...update } : edu;
        });
      }

      if (updates.customSections) {
          newState.customSections = state.customSections.map(section => {
              const sectionUpdate = updates.customSections?.find(u => u.id === section.id);
              if (!sectionUpdate || !sectionUpdate.items) return section;

              const updatedItems = section.items.map(item => {
                  const itemUpdate = sectionUpdate.items?.find(ui => ui.id === item.id);
                  return itemUpdate ? { ...item, ...itemUpdate } : item;
              });

              return { ...section, items: updatedItems };
          });
      }
      return newState;
    }
    
    default:
      return state;
  }
};

export const useCVData = () => {
  const [cvData, dispatch] = useReducer(cvReducer, initialState);

  const importCvFromText = async (text: string) => {
    const parsedData = await parseCvFromText(text);
    const newCVData: CVData = {
        ...initialState,
        personal: { ...initialState.personal, ...parsedData.personal },
        experiences: parsedData.experiences?.map((exp, i) => ({ ...exp, id: Date.now() + i })) || [],
        education: parsedData.education?.map((edu, i) => ({ ...edu, id: Date.now() + i + 100 })) || [],
        skills: (parsedData.skills as any)?.map((skillName: string, i: number) => ({ id: Date.now() + i + 200, name: skillName, level: 3 })) || [],
        hobbies: parsedData.hobbies || [],
        customSections: [], // Start with no custom sections from import
        sectionOrder: ['experiences', 'education', 'skills'],
    };
    dispatch({ type: 'SET_CV_DATA', payload: newCVData });
  };
  
  return { cvData, dispatch, importCvFromText };
};