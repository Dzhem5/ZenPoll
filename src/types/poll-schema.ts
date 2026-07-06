export type PollStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'closed'

export type QuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'scale' | 'yes_no'

export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Poll {
  id: string
  creator_id: string
  title: string
  description: string | null
  is_anonymous: boolean
  show_results: boolean
  is_public: boolean
  status: PollStatus
  allow_results_view: boolean
  created_at: string
  published_at: string | null
}

export interface Question {
  id: string
  poll_id: string
  text: string
  type: QuestionType
  options: unknown
  order_index: number
  required: boolean
}

export interface PollOption {
  id: string
  question_id: string
  text: string
  order_index: number
}

export interface Vote {
  id: string
  question_id: string
  option_id: string | null
  user_id: string
  text_answer: string | null
  created_at: string
}

export interface PollApproval {
  id: string
  poll_id: string
  admin_id: string
  status: 'pending' | 'approved' | 'rejected'
  feedback: string | null
  created_at: string
  reviewed_at: string | null
}