"use client"
import React, { useState } from 'react'

export default function SendJoinTestPage() {
  const [recipientPhone, setRecipientPhone] = useState('')
  const [name, setName] = useState('테스트 사용자')
  const [clubName, setClubName] = useState('테스트 모임')
  const [time, setTime] = useState(new Date().toLocaleString())
  const [amount, setAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('카드')
  const [status, setStatus] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Sending...')

    try {
      const res = await fetch('/api/auth/send-join-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone, name, clubName, time, amount, paymentMethod })
      })

      const data = await res.json()
      if (!res.ok) {
        setStatus(`Error: ${data?.error || JSON.stringify(data)}`)
      } else {
        setStatus(`Success: ${JSON.stringify(data)}`)
      }
    } catch (err: any) {
      setStatus(`Network error: ${err?.message || err}`)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Send Join Confirmation (Admin Test)</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, maxWidth: 520 }}>
        <label>
          Recipient Phone
          <input value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="01012345678" />
        </label>
        <label>
          Name
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Club Name
          <input value={clubName} onChange={e => setClubName(e.target.value)} />
        </label>
        <label>
          Time
          <input value={time} onChange={e => setTime(e.target.value)} />
        </label>
        <label>
          Amount
          <input value={amount} onChange={e => setAmount(e.target.value)} />
        </label>
        <label>
          Payment Method
          <input value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} />
        </label>

        <div>
          <button type="submit">Send Join Confirmation</button>
        </div>
      </form>

      {status && (
        <div style={{ marginTop: 12 }}>
          <strong>Status:</strong>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{status}</pre>
        </div>
      )}
    </div>
  )
}
