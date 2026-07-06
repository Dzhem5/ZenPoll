import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hquporfhjshkbgslbaba.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in the environment.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const sampleUsers = [
  {
    email: 'admin@zenpoll.local',
    password: 'ChangeMe123!',
    full_name: 'ZenPoll Admin',
    role: 'admin',
    avatar_url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=ZenPollAdmin',
  },
  {
    email: 'alex@zenpoll.local',
    password: 'ChangeMe123!',
    full_name: 'Alex Morgan',
    role: 'user',
    avatar_url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=AlexMorgan',
  },
  {
    email: 'sam@zenpoll.local',
    password: 'ChangeMe123!',
    full_name: 'Sam Taylor',
    role: 'user',
    avatar_url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=SamTaylor',
  },
  {
    email: 'maria@zenpoll.local',
    password: 'ChangeMe123!',
    full_name: 'Maria Lopez',
    role: 'user',
    avatar_url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=MariaLopez',
  },
]

const pollThemes = [
  'Product feedback',
  'Community priorities',
  'Feature validation',
  'Event preferences',
  'User satisfaction',
]

const questionTopics = [
  'interface',
  'workflow',
  'pricing',
  'navigation',
  'notifications',
  'mobile experience',
  'support',
  'analytics',
  'accessibility',
  'performance',
]

async function getOrCreateAuthUser(user) {
  const existingUsers = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = existingUsers.data?.users?.find((item) => item.email === user.email)

  if (existing) {
    return existing
  }

  const created = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    },
  })

  if (created.error) {
    throw created.error
  }

  return created.data.user
}

async function upsertProfile(userId, user) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role,
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw error
  }
}

async function clearExistingSamplePolls(creatorIds) {
  const { error } = await supabase.from('polls').delete().in('creator_id', creatorIds)

  if (error) {
    throw error
  }
}

function buildQuestionOptions(pollIndex, questionIndex) {
  return Array.from({ length: 6 }, (_, optionIndex) => ({
    text: `Option ${optionIndex + 1} for poll ${pollIndex + 1}, question ${questionIndex + 1}`,
    order_index: optionIndex + 1,
  }))
}

function buildQuestions(pollIndex, pollId) {
  return Array.from({ length: 10 }, (_, questionIndex) => {
    const topic = questionTopics[questionIndex]

    return {
      poll_id: pollId,
      text: `How should we improve ${topic} in poll ${pollIndex + 1}?`,
      type: 'single_choice',
      options: buildQuestionOptions(pollIndex, questionIndex),
      order_index: questionIndex + 1,
      required: true,
    }
  })
}

async function main() {
  const users = []

  for (const user of sampleUsers) {
    const authUser = await getOrCreateAuthUser(user)
    await upsertProfile(authUser.id, user)
    users.push({ ...user, id: authUser.id })
  }

  const creatorIds = users.slice(0, 3).map((user) => user.id)
  await clearExistingSamplePolls(creatorIds)

  const pollRows = []

  for (let pollIndex = 0; pollIndex < 5; pollIndex += 1) {
    const creator = users[pollIndex % creatorIds.length]
    pollRows.push({
      creator_id: creator.id,
      title: `${pollThemes[pollIndex]} poll ${pollIndex + 1}`,
      description: `Sample poll ${pollIndex + 1} for ZenPoll.`,
      is_anonymous: pollIndex % 2 === 0,
      show_results: true,
      is_public: true,
      status: 'published',
      allow_results_view: true,
      published_at: new Date().toISOString(),
    })
  }

  const insertedPolls = []

  for (const pollRow of pollRows) {
    const { data, error } = await supabase.from('polls').insert(pollRow).select('*').single()

    if (error) {
      throw error
    }

    insertedPolls.push(data)
  }

  const questionRows = []
  for (const [pollIndex, poll] of insertedPolls.entries()) {
    questionRows.push(...buildQuestions(pollIndex, poll.id))
  }

  const { data: insertedQuestions, error: questionError } = await supabase
    .from('questions')
    .insert(questionRows)
    .select('*')

  if (questionError) {
    throw questionError
  }

  const optionRows = []
  for (const question of insertedQuestions) {
    const questionNumber = question.order_index - 1
    const pollIndex = insertedPolls.findIndex((poll) => poll.id === question.poll_id)

    for (let optionIndex = 0; optionIndex < 6; optionIndex += 1) {
      optionRows.push({
        question_id: question.id,
        text: `Option ${optionIndex + 1} for poll ${pollIndex + 1}, question ${questionNumber + 1}`,
        order_index: optionIndex + 1,
      })
    }
  }

  const { error: optionsError } = await supabase.from('poll_options').insert(optionRows)

  if (optionsError) {
    throw optionsError
  }

  console.log(`Seeded ${insertedPolls.length} polls, ${insertedQuestions.length} questions, and ${optionRows.length} options.`)
}

main().catch((error) => {
  console.error('Seed failed:')
  console.error(error)
  process.exit(1)
})