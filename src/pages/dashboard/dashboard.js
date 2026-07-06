import dashboardTemplate from './dashboard.html?raw'
import './dashboard.css'
import { supabase } from '../../utils/supabase.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(value) {
  if (!value) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function renderQuestionField(question) {
  const questionId = question.id
  const questionText = escapeHtml(question.text)
  const questionType = question.type
  const requiredAttribute = question.required ? 'required' : ''
  const options = Array.isArray(question.poll_options)
    ? [...question.poll_options].sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0))
    : []

  if (questionType === 'text') {
    return `
      <div class="poll-question mb-4">
        <label class="form-label fw-semibold" for="question-${questionId}">${questionText}</label>
        <textarea class="form-control form-control-lg" id="question-${questionId}" name="${questionId}" rows="3" placeholder="Write your answer..." ${requiredAttribute}></textarea>
      </div>
    `
  }

  if (questionType === 'scale' && options.length === 0) {
    return `
      <div class="poll-question mb-4">
        <label class="form-label fw-semibold d-block mb-3">${questionText}</label>
        <input class="form-range" type="range" min="1" max="5" step="1" value="3" name="${questionId}" ${requiredAttribute} />
        <div class="d-flex justify-content-between text-muted-zp small px-1 mt-2">
          <span>1</span>
          <span>3</span>
          <span>5</span>
        </div>
      </div>
    `
  }

  const fallbackOptions = options.length > 0
    ? options
    : [
        { id: 'yes', text: 'Yes' },
        { id: 'no', text: 'No' },
      ]

  return `
    <div class="poll-question mb-4">
      <label class="form-label fw-semibold d-block mb-3">${questionText}</label>
      <div class="choice-stack">
        ${fallbackOptions.map((option) => `
          <label class="choice-chip">
            <input class="form-check-input me-2" type="radio" name="${questionId}" value="${escapeHtml(option.id)}" ${requiredAttribute} />
            <span>${escapeHtml(option.text)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `
}

function renderPollCard(poll) {
  const questions = Array.isArray(poll.questions) ? [...poll.questions] : []
  questions.sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0))

  return `
    <article class="poll-workbench vintage-card p-4 p-lg-5 mb-3">
      <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
        <div>
          <p class="section-label mb-2"><i class="bi bi-chat-square-dots-fill"></i> Active poll</p>
          <h3 class="h4 fw-bold mb-2">${escapeHtml(poll.title)}</h3>
          <p class="text-muted-zp mb-0">${escapeHtml(poll.description || 'A live poll available for immediate participation.')}</p>
        </div>
        <div class="text-lg-end">
          <div class="poll-meta-pill">${questions.length} question${questions.length === 1 ? '' : 's'}</div>
          <div class="text-muted-zp small mt-2">Published ${formatDate(poll.published_at)}</div>
        </div>
      </div>
      <form class="poll-form" data-poll-form data-poll-id="${poll.id}">
        ${questions.map(renderQuestionField).join('')}
        <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <p class="text-muted-zp mb-0 small">Your answers will be saved and shown in the history panel.</p>
          <button class="btn btn-vintage" type="submit"><i class="bi bi-floppy me-2"></i>Save answers</button>
        </div>
      </form>
    </article>
  `
}

function renderHistoryGroup(group) {
  return `
    <article class="history-group vintage-card p-4 mb-3">
      <p class="section-label mb-2"><i class="bi bi-journal-check"></i> ${escapeHtml(group.title)}</p>
      <div class="history-items">
        ${group.items.map((item) => `
          <div class="history-item">
            <div>
              <div class="history-question">${escapeHtml(item.question)}</div>
              <div class="history-answer">${escapeHtml(item.answer)}</div>
            </div>
            <div class="history-time">${formatDate(item.created_at)}</div>
          </div>
        `).join('')}
      </div>
    </article>
  `
}

async function loadActivePolls() {
  const { data, error } = await supabase
    .from('polls')
    .select('id,title,description,published_at,questions(id,text,type,order_index,required,poll_options(id,text,order_index))')
    .eq('status', 'published')
    .eq('is_public', true)
    .order('published_at', { ascending: false })
    .limit(6)

  if (error) {
    throw error
  }

  return data ?? []
}

async function loadHistory(userId) {
  const { data: votes, error } = await supabase
    .from('votes')
    .select('id,question_id,option_id,text_answer,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const voteRows = votes ?? []

  if (voteRows.length === 0) {
    return []
  }

  const questionIds = [...new Set(voteRows.map((vote) => vote.question_id))]
  const questionsResult = await supabase.from('questions').select('id,text,poll_id').in('id', questionIds)

  if (questionsResult.error) {
    throw questionsResult.error
  }

  const pollIds = [...new Set((questionsResult.data ?? []).map((question) => question.poll_id))]
  const pollResult = await supabase.from('polls').select('id,title').in('id', pollIds)

  if (pollResult.error) {
    throw pollResult.error
  }

  const optionIds = [...new Set(voteRows.map((vote) => vote.option_id).filter(Boolean))]
  let options = []

  if (optionIds.length > 0) {
    const optionsResult = await supabase.from('poll_options').select('id,text').in('id', optionIds)

    if (optionsResult.error) {
      throw optionsResult.error
    }

    options = optionsResult.data ?? []
  }

  const questionMap = new Map((questionsResult.data ?? []).map((question) => [question.id, question]))
  const pollMap = new Map((pollResult.data ?? []).map((poll) => [poll.id, poll]))
  const optionMap = new Map(options.map((option) => [option.id, option]))
  const grouped = new Map()

  for (const vote of voteRows) {
    const question = questionMap.get(vote.question_id)

    if (!question) {
      continue
    }

    const poll = pollMap.get(question.poll_id)
    const pollTitle = poll?.title ?? 'Untitled poll'
    const answer = vote.option_id ? (optionMap.get(vote.option_id)?.text ?? 'Selected option') : (vote.text_answer ?? 'No response')

    if (!grouped.has(question.poll_id)) {
      grouped.set(question.poll_id, {
        title: pollTitle,
        items: [],
      })
    }

    grouped.get(question.poll_id).items.push({
      question: question.text,
      answer,
      created_at: vote.created_at,
    })
  }

  return Array.from(grouped.values())
}

export function renderPage() {
  return dashboardTemplate
}

function renderActivePollsState(container, polls) {
  if (!container) {
    return
  }

  if (polls.length === 0) {
    container.innerHTML = `
      <div class="empty-state vintage-panel p-4">
        <h3 class="h5 fw-bold mb-2">No active polls right now.</h3>
        <p class="text-muted-zp mb-0">When new published polls are available, they will appear here automatically.</p>
      </div>
    `
    return
  }

  container.innerHTML = polls.map(renderPollCard).join('')
}

function renderHistoryState(container, groups) {
  if (!container) {
    return
  }

  if (groups.length === 0) {
    container.innerHTML = `
      <div class="empty-state vintage-panel p-4">
        <h3 class="h5 fw-bold mb-2">Your history is empty.</h3>
        <p class="text-muted-zp mb-0">Vote on an active poll and your saved answers will show up here.</p>
      </div>
    `
    return
  }

  container.innerHTML = groups.map(renderHistoryGroup).join('')
}

export function mount(pageRoot, _params = {}, context = {}) {
  const activeContainer = pageRoot.querySelector('[data-dashboard-active-polls]')
  const historyContainer = pageRoot.querySelector('[data-dashboard-history]')
  const statusNode = pageRoot.querySelector('[data-dashboard-participation-count]')
  const activeCountNode = pageRoot.querySelector('[data-dashboard-active-count]')
  const historyCountNode = pageRoot.querySelector('[data-dashboard-history-count]')
  const refreshButton = pageRoot.querySelector('[data-dashboard-refresh]')
  const currentUser = context.authState?.user ?? null

  if (!activeContainer || !historyContainer || !statusNode || !activeCountNode || !historyCountNode) {
    return
  }

  async function refreshDashboard() {
    if (!currentUser?.id) {
      activeContainer.innerHTML = ''
      historyContainer.innerHTML = ''
      statusNode.textContent = 'Unavailable'
      return
    }

    statusNode.textContent = 'Loading'

    try {
      const [polls, historyGroups] = await Promise.all([
        loadActivePolls(),
        loadHistory(currentUser.id),
      ])

      renderActivePollsState(activeContainer, polls)
      renderHistoryState(historyContainer, historyGroups)

      activeCountNode.textContent = String(polls.length)
      historyCountNode.textContent = String(historyGroups.reduce((total, group) => total + group.items.length, 0))
      statusNode.textContent = polls.length > 0 ? 'Live' : 'Quiet'

      Array.from(pageRoot.querySelectorAll('[data-poll-form]')).forEach((form) => {
        form.addEventListener('submit', async (event) => {
          event.preventDefault()

          try {
            const pollId = form.dataset.pollId
            const poll = polls.find((entry) => entry.id === pollId)

            if (!poll) {
              return
            }

            const rows = []

            for (const question of poll.questions ?? []) {
              const field = form.elements.namedItem(question.id)
              let answerOptionId = null
              let answerText = null

              if (!field) {
                if (question.required) {
                  throw new Error(`Answer is required for "${question.text}".`)
                }

                continue
              }

              const fieldValue = field.value?.trim?.() ?? field.value

              if (!fieldValue) {
                if (question.required) {
                  throw new Error(`Answer is required for "${question.text}".`)
                }

                continue
              }

              if (question.type === 'text' || (question.type === 'scale' && (!question.poll_options || question.poll_options.length === 0))) {
                answerText = fieldValue
              } else {
                answerOptionId = fieldValue
              }

              rows.push({
                question_id: question.id,
                user_id: currentUser.id,
                option_id: answerOptionId,
                text_answer: answerText,
              })
            }

            if (rows.length === 0) {
              statusNode.textContent = 'No answers to save.'
              return
            }

            const { error } = await supabase.from('votes').upsert(rows, {
              onConflict: 'question_id,user_id',
            })

            if (error) {
              throw error
            }

            statusNode.textContent = 'Saved'
            await refreshDashboard()
          } catch (error) {
            statusNode.textContent = error instanceof Error ? error.message : 'Unable to save your answers.'
          }
        })
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load dashboard data.'
      statusNode.textContent = 'Error'
      activeContainer.innerHTML = `<div class="empty-state vintage-panel p-4"><h3 class="h5 fw-bold mb-2">Dashboard unavailable.</h3><p class="text-muted-zp mb-0">${escapeHtml(message)}</p></div>`
      historyContainer.innerHTML = ''
    }
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      refreshDashboard()
    })
  }

  refreshDashboard()
}
