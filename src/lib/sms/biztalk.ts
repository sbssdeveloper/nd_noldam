// Lightweight BizTalk (Kakao Alimtalk) client for OTP SMS
// - Uses in-memory token cache with expiry
// - Sends templated Alimtalk messages for OTP delivery

type BiztalkConfig = {
  baseUrl: string
  bsid: string
  passwd: string
  senderKey: string
  templateCode: string
}

type TokenCache = {
  token: string
  expiresAt: number // epoch ms
}

type SendResult = { 
  success: boolean
  msgIdx: string
  payloadInfo?: {
    templateCode: string
    messageType?: 'AT' | 'AI'
    recipient: string
    hasTitle: boolean
    hasButton: boolean
    hasVariables: boolean
    messageLength: number
  }
}

const config: BiztalkConfig = {
  baseUrl: process.env.BIZTALK_BASE_URL || 'https://www.biztalk-api.com',
  bsid: process.env.BIZTALK_BSID || '',
  passwd: process.env.BIZTALK_PASSWD || '',
  senderKey: process.env.BIZTALK_SENDER_KEY || '',
  templateCode: process.env.BIZTALK_TEMPLATE_CODE || '인증번호'
}

let cachedToken: TokenCache | null = null

const now = () => Date.now()

const ensureCredentials = () => {
  if (!config.bsid || !config.passwd || !config.senderKey) {
    throw new Error('BizTalk credentials not configured (BIZTALK_BSID/BIZTALK_PASSWD/BIZTALK_SENDER_KEY)')
  }
}

async function fetchJson(url: string, init?: RequestInit, retries: number = 2): Promise<{ res: Response; data: any }> {
  let lastError: any = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout (compatible with all Node versions)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      try {
        const res = await fetch(url, {
          ...init,
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        const data = await res.json().catch(() => ({}))
        return { res, data }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error: any) {
      lastError = error

      // Check if it's a connection timeout or network error
      if (error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
        error?.name === 'AbortError' ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('fetch failed') ||
          error?.message?.includes('aborted')) {
        
        console.warn(`[BizTalk] Connection attempt ${attempt + 1}/${retries + 1} failed:`, {
          url,
          error: error.message || error,
          code: error?.cause?.code
        })

        // If not the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))) // Exponential backoff
          continue
        }
      }

      // For other errors or last attempt, throw
      throw error
    }
  }

  // If we get here, all retries failed
  throw new Error(
    `BizTalk API connection failed after ${retries + 1} attempts. ` +
      `Last error: ${lastError?.message || lastError || 'Unknown error'}. ` +
      `Please check network connectivity and firewall settings.`
  )
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - now() > 60_000) {
    return cachedToken.token
  }

  const url = `${config.baseUrl.replace(/\/$/, '')}/v2/auth/getToken`
  const body = JSON.stringify({ bsid: config.bsid, passwd: config.passwd, expire: 1440 })
  const { res, data } = await fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  })

  if (!res.ok || data?.responseCode !== '1000' || !data?.token) {
    throw new Error(`BizTalk getToken failed: http=${res.status} code=${data?.responseCode || 'n/a'} msg=${data?.msg || 'n/a'}`)
  }

  const expireDate = data.expireDate ? Date.parse(data.expireDate) : now() + 12 * 60 * 60 * 1000
  cachedToken = { token: data.token, expiresAt: expireDate }
  return data.token as string
}

const createMessageIndex = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`

const fillTemplate = (template: string, variables: Record<string, string>) => {
  return Object.entries(variables).reduce((message, [key, value]) => {
    const placeholder = `#{${key}}`
    return message.split(placeholder).join(value)
  }, template)
}

async function sendAlimtalkMessage({
  recipientPhone,
  templateCode,
  templateMessage,
  msgIdxPrefix,
  variables, 
  button,
  title,
  messageType
}: {
  recipientPhone: string
  templateCode: string
  templateMessage: string
  msgIdxPrefix: string
  variables?: Record<string, string>
  button?: any[]
  title?: string
  messageType?: 'AT' | 'AI' // AT: regular Alimtalk (default), AI: Image Alimtalk
}): Promise<SendResult> {
  // DETAILED LOGGING: Function entry with all parameters
  console.log('[BizTalk API] ==========================================')
  console.log('[BizTalk API] 🚀 sendAlimtalkMessage CALLED')
  console.log('[BizTalk API] ==========================================')
  console.log('[BizTalk API] Input Parameters:')
  console.log('  - recipientPhone:', recipientPhone)
  console.log('  - templateCode:', templateCode)
  console.log('  - msgIdxPrefix:', msgIdxPrefix)
  console.log('  - messageType (input):', messageType || 'NOT PROVIDED (will default to AT)')
  console.log('  - has title:', !!title, title ? `(${title})` : '')
  console.log('  - has button:', !!button, button ? `(${button.length} buttons)` : '')
  console.log('  - has variables:', !!variables, variables ? `(${Object.keys(variables).length} vars)` : '')
  console.log('  - message length:', templateMessage.length)
  console.log('[BizTalk API] ==========================================')

  ensureCredentials()
  const token = await getToken()

  const url = `${config.baseUrl.replace(/\/$/, '')}/v2/kko/sendAlimTalk`
  const msgIdx = createMessageIndex(msgIdxPrefix)

  
  // Build payload matching BizTalk API format exactly:
  // {
  //   "msgIdx": "...",
  //   "countryCode": "82",
  //   "resMethod": "PUSH",
  //   "senderKey": "...",
  //   "tmpltCode": "...",
  //   "message": "...",
  //   "recipient": "...",
  //   "messageType": "AI" or "AT"
  // }
  const payload: any = {
    msgIdx,
    countryCode: '82',
    resMethod: 'PUSH',
    senderKey: config.senderKey,
    tmpltCode: templateCode,
    message: templateMessage.replace(/<br\s*\/?>/gi, '\n'),
    recipient: recipientPhone
  }

  // CRITICAL: BizTalk requires the 'message' field even when buttons are present
  // For templates with buttons, we send BOTH message and variables
  // The message field is required by BizTalk API (B203 error if missing)
  
  // Add messageType if provided (AT: regular Alimtalk, AI: Image Alimtalk)
  // Always include messageType when provided to match template registration
  if (messageType === 'AT' || messageType === 'AI') {
    payload.messageType = messageType
    console.log('[BizTalk API] 📝 messageType SET IN PAYLOAD:', messageType)
    console.log('[BizTalk API] 📝   - AT = Regular Alimtalk')
    console.log('[BizTalk API] 📝   - AI = Image Alimtalk')
  } else {
    console.log('[BizTalk API] 📝 messageType: NOT SET IN PAYLOAD')
    console.log('[BizTalk API] 📝   - BizTalk will use template default (usually AT)')
    console.log('[BizTalk API] 📝   - If you get 3030 error, explicitly set messageType to match template registration')
  }
  
  // CRITICAL: Image Alimtalk (AI) cannot be used with 강조표기형 (title/emphasis type) simultaneously
  if (messageType === 'AI' && title) {
    throw new Error('Image Alimtalk (messageType: AI) cannot be used with title field (강조표기형) simultaneously. Remove title when using Image Alimtalk.')
  }
  
  // Send variables if provided (used for variable substitution in templates)
  if (variables && Object.keys(variables).length > 0) {
    payload.variables = variables
  }
  
  const hasButtons = button && Array.isArray(button) && button.length > 0

  // Add buttons if provided (required when template includes buttons)
  // CRITICAL: Buttons must be inside an 'attach' object, not directly in payload
  // Structure: { "attach": { "button": [...] } }
  if (hasButtons) {
    // CRITICAL: If buttons are present, title MUST also be present (unless using Image Alimtalk)
    if (!title && messageType !== 'AI') {
      throw new Error('Title field is REQUIRED when buttons are present (unless using Image Alimtalk). Templates with buttons require both title and button fields.')
    }
    
    // Image Alimtalk cannot have buttons with title
    if (messageType === 'AI' && title) {
      throw new Error('Image Alimtalk (messageType: AI) cannot be used with buttons that require title. Remove title when using Image Alimtalk with buttons.')
    }
    
    // Buttons must be inside 'attach' object
    payload.attach = {
      button: button.map((b: any) => {
        // Validate button structure
        const buttonName = b.name || b.btnName || b.buttonName
        const buttonType = b.type || b.btnType || 'WL'
        const urlMobile = b.url_mobile || b.urlMobile || b.linkMobile || b.linkMo || b.link || b.linkUrl
        const urlPc = b.url_pc || b.urlPc || b.linkPc || b.link || b.linkUrl
        
        if (!buttonName) {
          throw new Error('Button name is required. Each button must have a name field.')
        }
        if (!urlMobile && !urlPc) {
          throw new Error('Button URL is required. Each button must have url_mobile or url_pc.')
        }
        
        return {
          name: buttonName,
          type: buttonType,
          url_mobile: urlMobile,
          url_pc: urlPc
        }
      })
    }
    
    // Remove any incorrect button placements (should be in attach, not root)
    delete payload.button
    delete payload.buttons
    delete payload.btns
    
    console.log('[BizTalk API] Button structure (inside attach object):', JSON.stringify(payload.attach.button, null, 2))
    console.log('[BizTalk API] ✅ Using "attach.button" structure - correct format per BizTalk API')
  }

  // Add title if provided (required for templates with buttons)
  // CRITICAL: If buttons are present, title is REQUIRED (checked above)
  if (title) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Title field must be a non-empty string.')
    }
    payload.title = title.trim()
  }

  // FINAL SAFEGUARD: Remove any incorrect button placements
  // Buttons should be in attach.button, not in root payload
  delete payload.button
  delete payload.buttons
  delete payload.btns
  
  // CRITICAL VALIDATION: Verify payload structure before sending
  if (payload.attach?.button) {
    // If button exists, title MUST exist UNLESS using Image Alimtalk (AI)
    // Image Alimtalk (AI) cannot have title with buttons
    if (!payload.title && payload.messageType !== 'AI') {
      throw new Error('CRITICAL: Payload has button but missing title field. This will cause template mismatch. (Note: Image Alimtalk (AI) does not require title with buttons)')
    }
    
    // Image Alimtalk cannot have title with buttons
    if (payload.messageType === 'AI' && payload.title) {
      throw new Error('CRITICAL: Image Alimtalk (AI) cannot have title field when buttons are present. Remove title field.')
    }
    
    // Message field is REQUIRED by BizTalk API (B203 error if missing)
    // Even templates with buttons need the message field
    if (!payload.message) {
      throw new Error('CRITICAL: Payload has button but missing message field. BizTalk requires message field even with buttons.')
    }
    
    console.log('[BizTalk API] ✅ Final payload check: Using "attach.button" structure')
    console.log('[BizTalk API] ✅ Title field present:', payload.title)
    console.log('[BizTalk API] ✅ Message field present (required by BizTalk API)')
  }

  // Log FULL payload BEFORE sending (for debugging 3030 errors)
  console.log('[BizTalk API] ==========================================')
  console.log('[BizTalk API] 📤 FINAL PAYLOAD BEING SENT TO BIZTALK API')
  console.log('[BizTalk API] ==========================================')
  try {
    const sanitized = { ...payload }
    if (sanitized.variables) {
      // mask any sensitive-looking values
      sanitized.variables = Object.fromEntries(Object.entries(sanitized.variables).map(([k, v]) => [k, String(v).length > 50 ? String(v).slice(0, 50) + '...' : v]))
    }
    console.log('[BizTalk API] Full JSON Payload:')
    console.log(JSON.stringify(sanitized, null, 2))
    console.log('[BizTalk API] ==========================================')
    console.log('[BizTalk API] 📋 PAYLOAD SUMMARY:')
    console.log('  - msgIdx:', sanitized.msgIdx)
    console.log('  - tmpltCode:', sanitized.tmpltCode, '(⚠️  MUST match registered template code)')
    console.log('  - messageType:', sanitized.messageType || 'NOT SET', '(⚠️  MUST match template registration: AT or AI)')
    console.log('  - recipient:', sanitized.recipient)
    console.log('  - message length:', sanitized.message?.length, 'characters')
    console.log('  - message preview:', sanitized.message?.substring(0, 100) + (sanitized.message?.length > 100 ? '...' : ''))
    console.log('  - has variables:', !!sanitized.variables, sanitized.variables ? `(${Object.keys(sanitized.variables).join(', ')})` : '')
    console.log('  - has title:', !!sanitized.title, sanitized.title ? `(${sanitized.title})` : '')
    console.log('  - has attach.button:', !!sanitized.attach?.button, sanitized.attach?.button ? `(${sanitized.attach.button.length} buttons)` : '')
    if (sanitized.attach?.button) {
      console.log('  - button details:', JSON.stringify(sanitized.attach.button, null, 2))
    }
    console.log('[BizTalk API] ==========================================')
    console.log('[BizTalk API] 🔍 3030 ERROR TROUBLESHOOTING:')
    console.log('[BizTalk API]   If you get 3030 "Message Type Does Not Match":')
    console.log('[BizTalk API]   1. Check if template is registered as AT (regular) or AI (Image)')
    console.log('[BizTalk API]   2. Current messageType in payload:', sanitized.messageType || 'NOT SET (BizTalk will use template default)')
    console.log('[BizTalk API]   3. Set environment variable to match template:')
    console.log('[BizTalk API]      - BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY=AT (or AI)')
    console.log('[BizTalk API]      - BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS=AT (or AI)')
    console.log('[BizTalk API] ==========================================')
  } catch (logError) {
    console.error('[BizTalk API] Error logging payload:', logError)
  }

  const { res, data } = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'bt-token': token
    },
    body: JSON.stringify(payload)
  })

  // Enhanced debugging - log FULL payload structure (after sending)
  try {
    const sanitized = { ...payload }
    if (sanitized.variables) {
      // mask any sensitive-looking values
      sanitized.variables = Object.fromEntries(Object.entries(sanitized.variables).map(([k, v]) => [k, String(v).length > 50 ? String(v).slice(0, 50) + '...' : v]))
    }
    console.log('[BizTalk API Request payload] FULL PAYLOAD:', JSON.stringify(sanitized, null, 2))
    // CRITICAL VALIDATION: Final check before sending
    // Buttons should be in attach.button, not in root payload
    const hasButtonInRoot = !!sanitized.button
    const hasButtonsPlural = !!sanitized.buttons
    const hasBtns = !!sanitized.btns
    const hasButtonInAttach = !!sanitized.attach?.button
    const hasTitle = !!sanitized.title
    
    // Validation errors - these will cause template mismatch
    const validationErrors: string[] = []
    
    if (hasButtonInRoot) {
      validationErrors.push('CRITICAL: Button found in root payload! Buttons must be inside "attach.button" structure.')
    }
    
    if (hasButtonsPlural || hasBtns) {
      validationErrors.push('CRITICAL: Found plural button fields (buttons/btns) in payload! Must use "attach.button" structure.')
    }
    
    if (hasButtonInAttach && !hasTitle) {
      validationErrors.push('CRITICAL: Payload has button but missing title field. Templates with buttons require title.')
    }
    
    if (hasTitle && !hasButtonInAttach) {
      // This is okay - some templates might have title without buttons
      console.log('[BizTalk API] ℹ️  Title present without button - this is acceptable for some templates')
    }
    
    if (validationErrors.length > 0) {
      const errorMessage = `PAYLOAD VALIDATION FAILED:\n${validationErrors.join('\n')}`
      console.error('[BizTalk API] ❌', errorMessage)
      throw new Error(errorMessage)
    }
    
    console.log('[BizTalk API Request payload] Field check:', {
      hasTitle: hasTitle,
      hasButtonInAttach: hasButtonInAttach,
      hasButtonInRoot: hasButtonInRoot, // Should always be false
      hasButtons: hasButtonsPlural, // Should always be false
      buttonCount: sanitized.attach?.button?.length || 0,
      titleValue: sanitized.title,
      button: sanitized.attach?.button, // Check attach.button structure
      templateCode: sanitized.tmpltCode,
      messageLength: sanitized.message?.length,
      hasVariables: !!sanitized.variables,
      // Verification
      usingCorrectStructure: hasButtonInAttach && !hasButtonInRoot && !hasButtonsPlural && !hasBtns,
      payloadValid: validationErrors.length === 0
    })
    
    if (hasButtonInAttach && hasTitle) {
      console.log('[BizTalk API] ✅ Payload validation passed: Using "attach.button" structure with title field')
    }
  } catch (err) {
    console.error('[BizTalk API Request payload] Error logging payload:', err)
  }

  console.log('[BizTalk API Response test]', {
    status: res.status,
    responseCode: data?.responseCode,
    msg: data?.msg,
    fullResponse: data
  })

  if (!res.ok || data?.responseCode !== '1000') {
    const code = data?.responseCode || 'n/a'
    const msg = data?.msg || 'n/a'
    console.error('[BizTalk API] ❌ REQUEST FAILED:', {
      httpStatus: res.status,
      responseCode: code,
      message: msg,
      fullResponse: data,
      payloadSent: {
        templateCode: payload.tmpltCode,
        messageType: payload.messageType || 'NOT SET',
        hasTitle: !!payload.title,
        hasButton: !!payload.attach?.button,
        recipient: payload.recipient
      }
    })
    
    // Special handling for 3030 error (Message Type Does Not Match)
    if (code === '3030' || msg?.includes('3030')) {
      console.error('[BizTalk API] ==========================================')
      console.error('[BizTalk API] ❌ ERROR 3030 DETECTED')
      console.error('[BizTalk API] ==========================================')
      console.error('[BizTalk API] Error: Message Type Does Not Match the Registered Template')
      console.error('[BizTalk API] ==========================================')
      console.error('[BizTalk API] 📋 PAYLOAD THAT CAUSED THE ERROR:')
      console.error('[BizTalk API]   - templateCode:', payload.tmpltCode)
      console.error('[BizTalk API]   - messageType in payload:', payload.messageType || 'NOT SET (BizTalk used template default)')
      console.error('[BizTalk API]   - recipient:', payload.recipient)
      console.error('[BizTalk API]   - msgIdx:', payload.msgIdx)
      console.error('[BizTalk API] ==========================================')
      console.error('[BizTalk API] 💡 SOLUTIONS:')
      console.error('[BizTalk API]   1. Check your BizTalk template registration:')
      console.error('[BizTalk API]      - Is it registered as AT (Regular Alimtalk)?')
      console.error('[BizTalk API]      - Is it registered as AI (Image Alimtalk)?')
      console.error('[BizTalk API]   2. Set environment variable to match template registration:')
      // Determine reminder type from msgIdx
      const msgIdxStr = payload.msgIdx || ''
      if (msgIdxStr.startsWith('CLUB_ONE_DAY')) {
        console.error('[BizTalk API]      BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY=AT  (if template is regular)')
        console.error('[BizTalk API]      BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY=AI  (if template is Image Alimtalk)')
      } else if (msgIdxStr.startsWith('CLUB_THREE_DAYS')) {
        console.error('[BizTalk API]      BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS=AT  (if template is regular)')
        console.error('[BizTalk API]      BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS=AI  (if template is Image Alimtalk)')
      } else {
        console.error('[BizTalk API]      Check which reminder type this is and set appropriate env var')
      }
      console.error('[BizTalk API]   3. Current payload messageType:', payload.messageType || 'NOT SET')
      console.error('[BizTalk API]   4. Restart server after setting environment variable')
      console.error('[BizTalk API] ==========================================')
    }
    
    throw new Error(`BizTalk sendAlimTalk failed: http=${res.status} code=${code} msg=${msg}`)
  }

  console.log('[BizTalk API] ✅ Request accepted (responseCode: 1000)')
  console.log('[BizTalk API] ⚠️  NOTE: This does NOT mean message was sent. Check delivery status with getResultAll')
  console.log('[BizTalk API] 📋 To check delivery status, call: fetchBiztalkResults("' + msgIdx + '")')

  return { 
    success: true, 
    msgIdx,
    payloadInfo: {
      templateCode: payload.tmpltCode,
      messageType: payload.messageType,
      recipient: payload.recipient,
      hasTitle: !!payload.title,
      hasButton: !!payload.attach?.button,
      hasVariables: !!payload.variables && Object.keys(payload.variables).length > 0,
      messageLength: payload.message?.length || 0
    }
  }
}

export async function sendSignupVerificationCode(recipientPhone: string, verificationCode: string): Promise<SendResult> {
  console.log('[SMS Signup Verification Code] Function called')
  console.log('[SMS Signup Verification Code] Input parameters:', {
    recipientPhone,
    verificationCode
  })

  const messageTemplate = '더놀담 계정 코드 : #{변수명}. 제 3자에게 공유하지 마십시오.'
  const templateCode = config.templateCode || '인증번호'
  console.log('[SMS Signup Verification Code] Template code:', templateCode)

  const message = fillTemplate(messageTemplate, { '변수명': verificationCode })

  console.log('[SMS Signup Verification Code] Template text (raw):', messageTemplate)
  console.log('[SMS Signup Verification Code] Filled message:', message)
  console.log('[SMS Signup Verification Code] Sending via BizTalk API...')

  try {
    const result = await sendAlimtalkMessage({
      recipientPhone,
      templateCode,
      templateMessage: message,
      msgIdxPrefix: 'OTP'
    })

    console.log('[SMS Signup Verification Code] ✅ SUCCESS - Message sent via KakaoTalk:', {
      recipientPhone,
      msgIdx: result.msgIdx,
      success: result.success
    })

    return result
  } catch (error: any) {
    console.error('[SMS Signup Verification Code] ❌ FAILED - Error sending message:', {
      recipientPhone,
      error: error?.message || error,
      stack: error?.stack
    })
    throw error
  }
}

export async function sendMeetingReminderOneDay({
  recipientPhone,
  name,
  clubName,
  meetingId
}: {
  recipientPhone: string
  name: string
  clubName: string
  meetingId?: number
}): Promise<SendResult> {
  const templateCode = process.env.BIZTALK_TEMPLATE_CODE_MEETING_ONE_DAY || 'club_coming'
  // Template is registered as Image Alimtalk (AI) in BizTalk
  // Can override via environment variable: BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY=AI or AT
  // Default to 'AI' (Image Alimtalk) to match BizTalk template registration
  const messageType = (process.env.BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY as 'AI' | 'AT' | undefined) || 'AI'
  
  // Payload structure for template code 'club_coming':
  // {
  //   "msgIdx": "1234",
  //   "countryCode": "82",
  //   "resMethod": "PUSH",
  //   "senderKey": "<kakao profile key>",
  //   "tmpltCode": "club_coming",
  //   "message": "<template>",
  //   "recipient": "<recipient>",
  //   "messageType": "AI",
  //   "attach": {
  //     "button": [
  //       {
  //         "name": "모임 확인하기",
  //         "type": "WL",
  //         "url_mobile": "http://thenoldam.com/profile?tab=meetings",
  //         "url_pc": "http://thenoldam.com/profile?tab=meetings"
  //       }
  //     ]
  //   }
  // } 
  
  console.log('[SMS 1-Day Reminder] ==========================================')
  console.log('[SMS 1-Day Reminder] Configuration:')
  console.log('  - templateCode:', templateCode)
  console.log('  - messageType:', messageType, `(${messageType === 'AI' ? 'Image Alimtalk' : 'Regular Alimtalk'})`)
  console.log('  - envVar BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY:', process.env.BIZTALK_MESSAGE_TYPE_MEETING_ONE_DAY || 'not set (defaulting to AI)')
  console.log('[SMS 1-Day Reminder] ==========================================')
  
  // Template uses \n (newlines) not <br> tags (per BizTalk support requirements)
  const templateText =
    '#{이름}님, 내일 #{모임명} 오프라인\n모임이 예정되어 있어요.\n\n필요한 준비물과 시간 장소\n사이트에서 다시 볼 수 있어요.\n\n내일 만나요. 설레는 마음으로\n기다리고 있을게요.'
  const message = fillTemplate(templateText, {
    '이름': name,
    '모임명': clubName
  })

  // Button configuration - must match BizTalk template registration exactly
  const buttonUrlMobile = process.env.BIZTALK_BUTTON_URL_MOBILE_REMINDER || 'http://thenoldam.com/profile?tab=meetings'
  const buttonUrlPc = process.env.BIZTALK_BUTTON_URL_PC_REMINDER || 'http://thenoldam.com/profile?tab=meetings'

  console.log('[SMS 1-Day Reminder] Button configuration:', {
    name: '모임 확인하기',
    type: 'WL',
    url_mobile: buttonUrlMobile,
    url_pc: buttonUrlPc
  })

  return sendAlimtalkMessage({
    recipientPhone,
    templateCode,
    templateMessage: message,
    msgIdxPrefix: 'CLUB_ONE_DAY',
    messageType: messageType, // AI for Image Alimtalk
    button: [
      {
        name: '모임 확인하기',
        type: 'WL',
        url_mobile: buttonUrlMobile,
        url_pc: buttonUrlPc
      }
    ]
    // Note: No title field - Image Alimtalk (AI) cannot have title with buttons
  })
}

export async function sendMeetingReminderThreeDays({
  recipientPhone,
  name,
  clubName,
  meetingId
}: {
  recipientPhone: string
  name: string
  clubName: string
  meetingId?: number
}): Promise<SendResult> {
  const templateCode = process.env.BIZTALK_TEMPLATE_CODE_MEETING_THREE_DAYS || 'club_coming_3'
  // Template is registered as Image Alimtalk (AI) in BizTalk
  // Can override via environment variable: BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS=AI or AT
  // Default to 'AI' (Image Alimtalk) to match BizTalk template registration
  const messageType = (process.env.BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS as 'AI' | 'AT' | undefined) || 'AI'
  
  // Payload structure for template code 'club_coming_3':
  // {
  //   "msgIdx": "1234",
  //   "countryCode": "82",
  //   "resMethod": "PUSH",
  //   "senderKey": "<kakao profile key>",
  //   "tmpltCode": "club_coming_3",
  //   "message": "<template>",
  //   "recipient": "<recipient>",
  //   "messageType": "AI",
  //   "attach": {
  //     "button": [
  //       {
  //         "name": "모임 확인하기",
  //         "type": "WL",
  //         "url_mobile": "http://thenoldam.com/profile?tab=meetings",
  //         "url_pc": "http://thenoldam.com/profile?tab=meetings"
  //       }
  //     ]
  //   }
  // } 
  
  console.log('[SMS 3-Day Reminder] ==========================================')
  console.log('[SMS 3-Day Reminder] Configuration:')
  console.log('  - templateCode:', templateCode)
  console.log('  - messageType:', messageType, `(${messageType === 'AI' ? 'Image Alimtalk' : 'Regular Alimtalk'})`)
  console.log('  - envVar BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS:', process.env.BIZTALK_MESSAGE_TYPE_MEETING_THREE_DAYS || 'not set (defaulting to AI)')
  console.log('[SMS 3-Day Reminder] ==========================================')
  
  // Template uses \n (newlines) not <br> tags (per BizTalk support requirements)
  const templateText =
    '#{이름}님, 사흘 뒤에 #{모임명}에서 만나요.\n시간과 장소 일정을 사이트에서 한 번 확인해 주세요.'

  const message = fillTemplate(templateText, {
    '이름': name,
    '모임명': clubName
  })


  const buttonUrlMobile = process.env.BIZTALK_BUTTON_URL_MOBILE_REMINDER || 'http://thenoldam.com/profile?tab=meetings'
  const buttonUrlPc = process.env.BIZTALK_BUTTON_URL_PC_REMINDER || 'http://thenoldam.com/profile?tab=meetings'

  console.log('[SMS 3-Day Reminder] Button configuration:', {
    name: '모임 확인하기',
    type: 'WL',
    url_mobile: buttonUrlMobile,
    url_pc: buttonUrlPc
  })

  return sendAlimtalkMessage({
    recipientPhone,
    templateCode,
    templateMessage: message,
    msgIdxPrefix: 'CLUB_THREE_DAYS',
    messageType: messageType, // AI for Image Alimtalk
    button: [
      {
        name: '모임 확인하기',
        type: 'WL',
        url_mobile: buttonUrlMobile,
        url_pc: buttonUrlPc
      }
    ]
    // Note: No title field - Image Alimtalk (AI) cannot have title with buttons
  })
}

export async function sendMeetingJoinedNotification({
  recipientPhone,
  participantName,
  meetingName,
  paymentDate,
  paymentAmount,
  paymentMethod,
  meetingId
}: {
  recipientPhone: string
  participantName: string
  meetingName: string
  paymentDate: Date
  paymentAmount: number
  paymentMethod: string
  meetingId?: number
}): Promise<SendResult> {
  console.log('[SMS Join Confirmation] Function called')
  console.log('[SMS Join Confirmation] Input parameters:', {
    recipientPhone,
    participantName,
    meetingName,
    paymentDate,
    paymentAmount,
    paymentMethod,
    meetingId
  })

  // Format payment date: YYYY-MM-DD HH:mm
  const formatPaymentDate = (date: Date): string => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  // Format payment amount with commas
  const formatPaymentAmount = (amount: number): string => {
    return amount.toLocaleString('ko-KR')
  }

  const templateCode = 'club_joined-user'
  

  const templateTitle = process.env.BIZTALK_TEMPLATE_TITLE_CLUB_JOINED || '모임 신청 알림'
  
  const buttonUrlMobile = 'http://thenoldam.com/profile?tab=meetings'
  const buttonUrlPc = 'http://thenoldam.com/profile?tab=meetings'
  
  console.log('[SMS Join Confirmation] Template code:', templateCode)
  console.log('[SMS Join Confirmation] Template title (must match approved template):', templateTitle)
  console.log('[SMS Join Confirmation] Button URLs (must match approved template exactly):', {
    mobile: buttonUrlMobile,
    pc: buttonUrlPc
  })

  const formattedTime = formatPaymentDate(paymentDate)
  const formattedAmount = formatPaymentAmount(paymentAmount)
 
  const templateText =
    '#{이름}님, #{모임명} 신청과 결제가 완료됐어요.\n\n-결제일시: #{시간}\n-결제: #{결제금액}원\n-결제수단: #{결제수단}\n\n일정과 장소는 ‘#{모임명} 라운지’에서 확인할 수 있어요'
  
  const variables: Record<string, string> = {
    '이름': participantName || '회원',
    '모임명': meetingName || '모임',
    '시간': formattedTime,
    '결제금액': formattedAmount,
    '결제수단': paymentMethod || '카드'
  }
  
  // Validate all required variables are present
  const requiredVariables = ['이름', '모임명', '시간', '결제금액', '결제수단']
  const missingVariables = requiredVariables.filter(v => !variables[v] || variables[v].toString().trim() === '')
  if (missingVariables.length > 0) {
    throw new Error(`Missing required template variables: ${missingVariables.join(', ')}`)
  }

  // Pre-fill message (current approach)
  const message = fillTemplate(templateText, variables)
 
  const unreplacedPlaceholders = templateText.match(/#\{[^}]+\}/g)?.filter(placeholder => {
    const varName = placeholder.replace(/#\{|\}/g, '')
    return !message.includes(placeholder) && variables[varName]
  })
  
  if (unreplacedPlaceholders && unreplacedPlaceholders.length > 0) {
    console.warn('[SMS Join Confirmation] ⚠️  Some template placeholders may not have been replaced:', unreplacedPlaceholders)
  }

  console.log('[SMS Join Confirmation] Template text (raw):', templateText)
  console.log('[SMS Join Confirmation] Filled message:', message)
  console.log('[SMS Join Confirmation] Variables object:', variables)
  console.log('[SMS Join Confirmation] Sending via BizTalk API...')

  try {
    const result = await sendAlimtalkMessage({
      recipientPhone,
      templateCode,
      templateMessage: message, // Pre-filled message
      msgIdxPrefix: 'CLUB_JOINED',
      title: templateTitle, // Use fixed title that matches approved template (not dynamic)
      variables: variables, // ALSO pass variables separately (for templates with buttons)
      button: [
        {
          name: '모임 확인하기',
          type: 'WL',
          url_mobile: buttonUrlMobile,
          url_pc: buttonUrlPc
        }
      ]
    })

    console.log('[SMS Join Confirmation] ✅ Request accepted by BizTalk API:', {
      recipientPhone,
      msgIdx: result.msgIdx,
      success: result.success
    })

    console.log('[SMS Join Confirmation] 🔍 Checking delivery status in 2 seconds...')
    setTimeout(async () => {
      try {
        const deliveryStatus = await fetchBiztalkResults(result.msgIdx)
        console.log('[SMS Join Confirmation] 📬 DELIVERY STATUS:', JSON.stringify(deliveryStatus, null, 2))
        
        // Handle both 'resultList' and 'response' formats from BizTalk API
        const resultList = deliveryStatus?.resultList || deliveryStatus?.response || []
        
        if (resultList.length > 0) {
          const resultItem = resultList[0]
          const resultCode = resultItem.resultCode || resultItem.statusCode
          const statusCode = resultItem.statusCode || resultCode
          
          console.log('[SMS Join Confirmation] 📊 Delivery Details:', {
            resultCode: resultCode,
            statusCode: statusCode,
            status: resultItem.status,
            statusMessage: resultItem.statusMessage,
            errorCode: resultItem.errorCode,
            errorMessage: resultItem.errorMessage,
            receivedAt: resultItem.receivedAt,
            requestAt: resultItem.requestAt
          })
          
          // Check for specific error codes
          if (resultCode === '3027') {
            console.error('[SMS Join Confirmation] ❌ ERROR 3027: Button content does not match template')
            console.error('[SMS Join Confirmation] 💡 SOLUTION: Button URLs must match EXACTLY what\'s in the approved BizTalk template')
            console.error('[SMS Join Confirmation] 💡 Check: Button name, type, and URLs (including http vs https) must match character-for-character')
            console.error('[SMS Join Confirmation] 💡 Current button URLs:', {
              mobile: buttonUrlMobile,
              pc: buttonUrlPc
            })
            console.error('[SMS Join Confirmation] 💡 Set BIZTALK_BUTTON_URL_MOBILE and BIZTALK_BUTTON_URL_PC environment variables to match template')
          } else if (resultCode === '3028') {
            console.error('[SMS Join Confirmation] ❌ ERROR 3028: Title does not match template')
            console.error('[SMS Join Confirmation] 💡 SOLUTION: The title must match the EXACT title approved in BizTalk template')
            console.error('[SMS Join Confirmation] 💡 Set BIZTALK_TEMPLATE_TITLE_CLUB_JOINED environment variable to the exact title from template')
            console.error('[SMS Join Confirmation] 💡 Current title:', templateTitle)
          } else if (statusCode === '2000' || resultCode === '2000') {
            console.log('[SMS Join Confirmation] ✅ MESSAGE DELIVERED SUCCESSFULLY')
          } else if (resultItem.status === 'FAIL' || (statusCode && statusCode !== '2000')) {
            console.error('[SMS Join Confirmation] ❌ MESSAGE NOT DELIVERED:', {
              resultCode: resultCode,
              statusCode: statusCode,
              statusMessage: resultItem.statusMessage,
              errorCode: resultItem.errorCode,
              errorMessage: resultItem.errorMessage
            })
          }
        } else {
          console.warn('[SMS Join Confirmation] ⚠️  No delivery status available yet. Message may still be processing.')
        }
      } catch (statusError: any) {
        console.error('[SMS Join Confirmation] ⚠️  Could not check delivery status:', statusError?.message)
      }
    }, 2000)

    return result
  } catch (error: any) {
    console.error('[SMS Join Confirmation] ❌ FAILED - Error sending message:', {
      recipientPhone,
      error: error?.message || error,
      stack: error?.stack
    })
    throw error
  }
}

export async function sendSignupCompleteMessage({
  recipientPhone,
  memberName
}: {
  recipientPhone: string
  memberName: string
}): Promise<SendResult> {
  console.log('[SMS Signup Completion] Function called')
  console.log('[SMS Signup Completion] Input parameters:', {
    recipientPhone,
    memberName
  })

  const templateCode = '회원가입_완료'
  const templateTitle = '회원가입 완료 👏'
  const buttonUrl = 'http://thenoldam.com/'

  console.log('[SMS Signup Completion] Template code:', templateCode)
  console.log('[SMS Signup Completion] Template title:', templateTitle)
  console.log('[SMS Signup Completion] Button URL:', buttonUrl)

  const templateText =
    '#{회원명}님, 환영해요!🎉🎉\n놀면서 담는 것들, 더놀담입니다!\n\n나날이 발전해가는 회원님과 함께하겠습니다'

  const variables: Record<string, string> = {
    '회원명': memberName || '회원'
  }

  const message = fillTemplate(templateText, variables)

  console.log('[SMS Signup Completion] Template text (raw):', templateText)
  console.log('[SMS Signup Completion] Filled message:', message)
  console.log('[SMS Signup Completion] Variables object:', variables)
  console.log('[SMS Signup Completion] Sending via BizTalk API...')

  try {
    const result = await sendAlimtalkMessage({
      recipientPhone,
      templateCode,
      templateMessage: message,
      msgIdxPrefix: 'SIGNUP_COMPLETE',
      title: templateTitle,
      variables: variables,
      button: [
        {
          name: '더놀담 방문하기',
          type: 'WL',
          url_mobile: buttonUrl,
          url_pc: buttonUrl
        }
      ]
    })

    console.log('[SMS Signup Completion] ✅ Request accepted by BizTalk API:', {
      recipientPhone,
      msgIdx: result.msgIdx,
      success: result.success
    })

    return result
  } catch (error: any) {
    console.error('[SMS Signup Completion] ❌ FAILED - Error sending message:', {
      recipientPhone,
      error: error?.message || error,
      stack: error?.stack
    })
    throw error
  }
}

export type {
  SendResult
}

// Note: BGMS handles template variable replacement on their side; template must be pre-approved
export function __resetBiztalkTokenCache() {
  cachedToken = null
}

export async function fetchBiztalkResults(msgIdx?: string) {
  ensureCredentials()
  const token = await getToken()

  const url = msgIdx 
    ? `${config.baseUrl.replace(/\/$/, '')}/v2/kko/getResultAll?msgIdx=${encodeURIComponent(msgIdx)}`
    : `${config.baseUrl.replace(/\/$/, '')}/v2/kko/getResultAll`
  
  let res: Response
  let data: any
  
  try {
    // Try GET first (as per BizTalk API documentation)
    const response = await fetchJson(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'bt-token': token
      }
    })
    res = response.res
    data = response.data
  } catch (getError: any) {
    // If GET fails with 405, try POST as fallback (some API versions might differ)
    if (getError?.message?.includes('405') || getError?.res?.status === 405) {
      console.log('[BizTalk getResultAll] GET method not supported, trying POST...')
  const body = msgIdx ? JSON.stringify({ msgIdx }) : undefined
      const response = await fetchJson(`${config.baseUrl.replace(/\/$/, '')}/v2/kko/getResultAll`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'bt-token': token
    },
    body
  })
      res = response.res
      data = response.data
    } else {
      throw getError
    }
  }

  console.log('[BizTalk getResultAll] status:', res.status)
  console.log('[BizTalk getResultAll] data:', JSON.stringify(data, null, 2))
  return data
}






// curl -X POST http://thenoldam.com/api/biztalk/test                                                                                        -reminders -H "Content-Type: application/json" -d '{"type":"oneDay","recipientPhone":"01059415282","name":"Test User","clubName":"Test Meeting"}'

// curl -X POST http://thenoldam.com/api/biztalk/test-reminders -H "Content-Type: application/json" -d '{"type":"oneDay","recipientPhone":"01059415282","name":"Test User","clubName":"Test Meeting"}'                  

//  curl "http://thenoldam.com/api/biztalk/check-status?msgIdx=CLUB_ONE_DAY_1764930434330_5244"
// root@thenoldam:/var/www/html# curl "http://thenoldam.com/api/biztalk/check-status?msgIdx=CLUB_ONE_DAY_1764753084020_2844"
// {"success":true,"message":"Message status retrieved successfully","data":{"msgIdx":"CLUB_ONE_DAY_1764753084020_2844","responseCode":"1000","resultList":[],"resultListCount":0,"rawResponse":{"responseCode":"1000","response":[{"uid":"20251203-1764753084035161b9209201bdb2-N","msgIdx":"CLUB_ONE_DAY_1764753084020_2844","resultCode":"3030","receivedAt":"2025-12-03 18:11:24","requestAt":"2025-12-03 18:11:24","bsid":"thenoldam","sendType":"K"}]},"summary":null,"diagnostics":{"hasResultList":false,"resultListIsEmpty":true,"interpretation":"Empty resultList means: 1) Message status not available yet (wait 5-10 seconds), 2) Message was rejected before tracking, or 3) msgIdx not found in BizTalk system. Check server logs for full BizTalk response."}}}
// curl 'http://thenoldam.com/api/biztalk/check-status?msgIdx=CLUB_ONE_DAY_1764928085322_6596'

// 3030: Message Type Does Not Match the Registered Template.

// curl -X POST http://thenoldam.com/api/biztalk/test
//  curl 'http://thenoldam.com/api/biztalk/check-status?msgIdx="CLUB_ONE_DAY_1764928759847_3760"'


//  curl -X POST http://thenoldam.com/api/biztalk/test-reminders -H "Content-Type: application/json" -d '{"type":"threeDays","recipientPhone":"01059415282","name":"Test User","clubName":"Test Meeting"}'
