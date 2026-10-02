export type UserRole = 'student' | 'advisor' | 'admin';
export type UserPhase = 'new' | 'direction_set' | 'cv_uploaded' | 'cv_analyzed' | 'applying' | 'networking' | 'interviewing';
export type ApplicationStatus = 'researching' | 'tailoring' | 'applied' | 'networking' | 'interviewing' | 'offer' | 'rejected' | 'ghosted';
export type ContactType = 'recruiter' | 'hiring_manager' | 'peer';
export type ReferralStatus = 'not_asked' | 'asked' | 'pending' | 'received' | 'declined';
export type StoryCategory = 'challenge' | 'teamwork' | 'leadership' | 'failure' | 'time_pressure';
export type LeetCodeStatus = 'not_started' | 'attempted' | 'solved' | 'needs_review';
export type InputQuality = 'minimal_effort' | 'rough_draft' | 'decent_attempt' | 'strong_input' | 'excellent_input';
export type RejectionTiming = 'within_hours' | 'after_2_days' | 'after_2_weeks' | 'never_heard_back';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  university_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerPreferences {
  industry: string;
  role: string;
  techStack: string[];
  location: string;
  companySize: string;
  remotePreference: string;
}

export interface Profile {
  user_id: string;
  direction_statement: string | null;
  direction_score: number | null;
  career_preferences: CareerPreferences;
  visa_required: boolean;
  user_phase: UserPhase;
  cv_analysis_history: CVAnalysisHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface CVAnalysisHistoryEntry {
  date: string;
  score: number;
  mainIssues: string[];
}

export interface CVParsedData {
  education: { institution: string; degree: string; period: string }[];
  experience: { role: string; company: string; period: string; bullets: string[] }[];
  projects: { name: string; description: string; tech: string[]; url?: string }[];
  skills: string[];
}

export interface CV {
  id: string;
  user_id: string;
  file_url: string | null;
  parsed_data: CVParsedData;
  analysis_results: Record<string, unknown>;
  is_master: boolean;
  version_tag: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  job_url: string | null;
  status: ApplicationStatus;
  match_score: number | null;
  ats_keywords: string[];
  applied_date: string | null;
  rejection_timing: string | null;
  notes: string | null;
  next_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkingContact {
  id: string;
  user_id: string;
  application_id: string | null;
  name: string;
  company: string | null;
  role: string | null;
  contact_type: ContactType;
  linkedin_url: string | null;
  email: string | null;
  shared_attributes: string[];
  message_text: string | null;
  outreach_variant: string | null;
  follow_up_step: number;
  follow_up_due: string | null;
  notes: string | null;
  created_at: string;
}

export interface CoffeeChatNote {
  id: string;
  contact_id: string;
  user_id: string;
  prep_questions: string[];
  key_takeaways: string | null;
  action_items: string[];
  referral_status: ReferralStatus;
  chat_date: string | null;
  created_at: string;
}

export interface InterviewStory {
  id: string;
  user_id: string;
  category: StoryCategory;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  mapped_questions: string[];
  created_at: string;
}

export interface LeetCodeProgress {
  id: string;
  user_id: string;
  problem_name: string;
  pattern: string | null;
  status: LeetCodeStatus;
  created_at: string;
  updated_at: string;
}

export interface InterviewLog {
  id: string;
  user_id: string;
  application_id: string | null;
  interview_type: string | null;
  questions_asked: string | null;
  self_ratings: Record<string, number>;
  went_well: string | null;
  would_change: string | null;
  ai_feedback: Record<string, unknown>;
  follow_up_email: string | null;
  created_at: string;
}

export interface AIInteraction {
  id: string;
  user_id: string;
  feature: string;
  input_quality: InputQuality | null;
  methodology_applied: string | null;
  score: number | null;
  input_summary: string | null;
  output_summary: string | null;
  feedback_items_count: number;
  created_at: string;
}

export interface MethodologyChunk {
  id: string;
  title: string;
  framework_name: string;
  topic: string | null;
  chunk_text: string;
  embedding: number[] | null;
  created_at: string;
}

// Mentor Engine response type used across all AI features
export interface MentorFeedbackItem {
  issue: string;
  severity: 'critical' | 'important' | 'suggestion';
  methodologyBasis: string;
  explanation: string;
  currentState: string;
  suggestedFix: string;
  example?: string;
}

export interface MentorResponse {
  inputQuality: InputQuality;
  inputQualityExplanation: string;
  methodologyReference: string;
  score?: number;
  feedback: MentorFeedbackItem[];
  strengths: string[];
  crossPhaseInsights: string[];
  nextSteps: string[];
  nextQuestion?: string;
  shouldRepeatAnalysis: boolean;
  // Feature-specific data
  data?: Record<string, unknown>;
}

// User context built by Mentor Engine
export interface UserContext {
  direction: {
    statement: string | null;
    score: number | null;
    role: string;
    industry: string;
    techStack: string[];
    location: string;
  };
  cv: {
    parsed: CVParsedData | null;
    score: number | null;
    analysisHistory: CVAnalysisHistoryEntry[];
  };
  skills: {
    detected: string[];
    missing: string[];
    strongest: string[];
  };
  applications: {
    total: number;
    thisWeek: number;
    statuses: Record<ApplicationStatus, number>;
    companies: string[];
    recentRejectionTimings: string[];
  };
  networking: {
    contactsCount: number;
    coffeeChatsDone: number;
    messagesSent: number;
    activeFollowUps: number;
  };
  interviewPrep: {
    storiesCount: number;
    storiesCategories: string[];
    leetcodeProgress: { total: number; solved: number };
  };
  phase: UserPhase;
}
