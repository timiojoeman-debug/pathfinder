// Data access layer - routes to Supabase when configured
// API routes that need these should handle errors gracefully

export { getProfile, updateProfile, updateDirection } from './profiles';
export { getCV, saveParsedCV, getCVAnalysis } from './cvs';
export { getApplications, createApplication, updateApplicationStatus, deleteApplication } from './applications';
export { getContacts, createContact, updateContact } from './contacts';
export { getStories, createStory, updateStory } from './stories';
export { getInterviewLogs, createInterviewLog } from './interviews';
export { storeInteraction, getInteractionHistory } from './interactions';
export { recordAiUsage } from './ai-usage';
