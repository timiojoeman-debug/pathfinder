import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApplicationStatus } from '@/types/database';

// Direction state
interface DirectionState {
  statement: string | null;
  score: number | null;
  preferences: {
    industry: string;
    roleType: string;
    techStack: string[];
    location: string;
    city: string;
    companySize: string;
    workMode: string;
    visaRequired: boolean;
  };
}

// Application for local state
interface LocalApplication {
  id: string;
  company: string;
  role: string;
  jobUrl?: string;
  jobDescription?: string;
  status: ApplicationStatus;
  matchScore: number;
  atsKeywords: string[];
  appliedDate?: string;
  rejectionTiming?: string;
  notes?: string;
  nextAction?: string;
}

// CV state
interface CVState {
  rawText: string;
  parsedData: {
    education: { institution: string; degree: string; period: string }[];
    experience: { role: string; company: string; period: string; bullets: string[] }[];
    projects: { name: string; description: string; tech: string[] }[];
    skills: string[];
  } | null;
  analysisScore: number | null;
}

// Networking contact for local state
interface LocalContact {
  id: string;
  name: string;
  company: string;
  role: string;
  contactType: 'recruiter' | 'hiring_manager' | 'peer';
  linkedinUrl?: string;
  email?: string;
  notes?: string;
  followUpStep: number;
  followUpDue?: string;
}

// STAR story
interface LocalStory {
  id: string;
  category: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  mappedQuestions: string[];
}

// LeetCode state
interface LeetCodeState {
  neetCode75Completed: string[];
  neetCode150Completed: string[];
}

// Friday review
interface FridayReview {
  date: string;
  clarity: boolean;
  positioning: boolean;
  networking: boolean;
  consistency: boolean;
}

interface AppState {
  // Direction
  direction: DirectionState;
  setDirection: (direction: Partial<DirectionState>) => void;
  setDirectionPreferences: (prefs: Partial<DirectionState['preferences']>) => void;

  // CV
  cv: CVState;
  setCVData: (cv: Partial<CVState>) => void;

  // Applications
  applications: LocalApplication[];
  addApplication: (app: Omit<LocalApplication, 'id'>) => string;
  updateApplication: (id: string, updates: Partial<LocalApplication>) => void;
  moveApplication: (id: string, status: ApplicationStatus) => void;
  removeApplication: (id: string) => void;

  // Networking contacts
  contacts: LocalContact[];
  addContact: (contact: Omit<LocalContact, 'id'>) => string;
  updateContact: (id: string, updates: Partial<LocalContact>) => void;
  removeContact: (id: string) => void;

  // Interview stories
  stories: LocalStory[];
  addStory: (story: Omit<LocalStory, 'id'>) => void;
  updateStory: (id: string, updates: Partial<LocalStory>) => void;
  removeStory: (id: string) => void;

  // LeetCode
  leetcode: LeetCodeState;
  toggleLeetCodeProblem: (problemId: string, list: '75' | '150') => void;

  // Friday review
  fridayReviews: FridayReview[];
  addFridayReview: (review: FridayReview) => void;

  // Explore roles conversation history
  exploreConversation: { role: 'user' | 'assistant'; content: string }[];
  addExploreMessage: (role: 'user' | 'assistant', content: string) => void;
  clearExploreConversation: () => void;

  // Networking education shown
  networkingEducationShown: boolean;
  setNetworkingEducationShown: (shown: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Direction
      direction: {
        statement: null,
        score: null,
        preferences: {
          industry: '',
          roleType: '',
          techStack: [],
          location: '',
          city: '',
          companySize: '',
          workMode: '',
          visaRequired: false,
        },
      },
      setDirection: (direction) =>
        set((s) => ({ direction: { ...s.direction, ...direction } })),
      setDirectionPreferences: (prefs) =>
        set((s) => ({
          direction: {
            ...s.direction,
            preferences: { ...s.direction.preferences, ...prefs },
          },
        })),

      // CV
      cv: { rawText: '', parsedData: null, analysisScore: null },
      setCVData: (cv) => set((s) => ({ cv: { ...s.cv, ...cv } })),

      // Applications
      applications: [],
      addApplication: (app) => {
        const id = crypto.randomUUID();
        set((s) => ({ applications: [...s.applications, { ...app, id }] }));
        return id;
      },
      updateApplication: (id, updates) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      moveApplication: (id, status) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id ? { ...a, status } : a
          ),
        })),
      removeApplication: (id) =>
        set((s) => ({
          applications: s.applications.filter((a) => a.id !== id),
        })),

      // Contacts
      contacts: [],
      addContact: (contact) => {
        const id = crypto.randomUUID();
        set((s) => ({ contacts: [...s.contacts, { ...contact, id }] }));
        return id;
      },
      updateContact: (id, updates) =>
        set((s) => ({
          contacts: s.contacts.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      removeContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),

      // Stories
      stories: [],
      addStory: (story) =>
        set((s) => ({
          stories: [...s.stories, { ...story, id: crypto.randomUUID() }],
        })),
      updateStory: (id, updates) =>
        set((s) => ({
          stories: s.stories.map((st) =>
            st.id === id ? { ...st, ...updates } : st
          ),
        })),
      removeStory: (id) =>
        set((s) => ({ stories: s.stories.filter((st) => st.id !== id) })),

      // LeetCode
      leetcode: { neetCode75Completed: [], neetCode150Completed: [] },
      toggleLeetCodeProblem: (problemId, list) =>
        set((s) => {
          const key = list === '75' ? 'neetCode75Completed' : 'neetCode150Completed';
          const arr = s.leetcode[key];
          const next = arr.includes(problemId)
            ? arr.filter((x) => x !== problemId)
            : [...arr, problemId];
          return { leetcode: { ...s.leetcode, [key]: next } };
        }),

      // Friday reviews
      fridayReviews: [],
      addFridayReview: (review) =>
        set((s) => ({ fridayReviews: [...s.fridayReviews, review] })),

      // Explore conversation
      exploreConversation: [],
      addExploreMessage: (role, content) =>
        set((s) => ({
          exploreConversation: [...s.exploreConversation, { role, content }],
        })),
      clearExploreConversation: () => set({ exploreConversation: [] }),

      // Networking education
      networkingEducationShown: false,
      setNetworkingEducationShown: (shown) =>
        set({ networkingEducationShown: shown }),
    }),
    {
      name: 'pathfinder-store',
      partialize: (state) => ({
        direction: state.direction,
        cv: state.cv,
        applications: state.applications,
        contacts: state.contacts,
        stories: state.stories,
        leetcode: state.leetcode,
        fridayReviews: state.fridayReviews,
        networkingEducationShown: state.networkingEducationShown,
      }),
    }
  )
);
