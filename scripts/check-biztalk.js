#!/usr/bin/env node
// scripts/check-biztalk.js
// Usage (PowerShell):
//  $env:BIZTALK_BSID="your_bsid"; $env:BIZTALK_PASSWD="your_passwd"; node scripts/check-biztalk.js MSGIDX

const baseUrl = process.env.BIZTALK_BASE_URL || 'https://www.biztalk-api.com'
const bsid = process.env.BIZTALK_BSID
const passwd = process.env.BIZTALK_PASSWD
const msgIdx = process.argv[2]

if (!bsid || !passwd) {
  console.error('Missing environment variables: please set BIZTALK_BSID and BIZTALK_PASSWD')
  process.exit(1)
}

if (!msgIdx) {
  console.error('Usage: node scripts/check-biztalk.js <msgIdx>')
  process.exit(1)
}

async function run() {
  if (typeof fetch !== 'function') {
    console.error('Global fetch is not available in this Node runtime. Use Node 18+ or run via a tool that provides fetch.')
    process.exit(1)
  }

  const tokenUrl = `${baseUrl.replace(/\/$/, '')}/v2/auth/getToken`
  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bsid, passwd, expire: 1440 })
  })

  let tokenData
  try {
    tokenData = await tokenRes.json()
  } catch (e) {
    console.error('Failed to parse getToken response', e)
    process.exit(1)
  }

  console.log('[getToken] status:', tokenRes.status, 'responseCode:', tokenData?.responseCode)
  if (!tokenRes.ok || tokenData?.responseCode !== '1000' || !tokenData?.token) {
    console.error('getToken failed:', JSON.stringify(tokenData, null, 2))
    process.exit(1)
  }

  const token = tokenData.token
  // Try GET method first (POST returns 405 Method Not Allowed)
  const resultUrl = `${baseUrl.replace(/\/$/, '')}/v2/kko/getResultAll?msgIdx=${encodeURIComponent(msgIdx)}`
  let resultRes = await fetch(resultUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'bt-token': token }
  })
  
  // If GET returns 405, try POST (some API versions might differ)
  if (resultRes.status === 405) {
    console.log('[check-biztalk] GET method not supported, trying POST...')
    resultRes = await fetch(`${baseUrl.replace(/\/$/, '')}/v2/kko/getResultAll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'bt-token': token },
      body: JSON.stringify({ msgIdx })
    })
  }

  let resultData
  try {
    resultData = await resultRes.json()
  } catch (e) {
    console.error('Failed to parse getResultAll response', e)
    process.exit(1)
  }

  console.log('[getResultAll] status:', resultRes.status)
  console.log(JSON.stringify(resultData, null, 2))
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
